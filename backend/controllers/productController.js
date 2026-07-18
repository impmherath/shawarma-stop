/**
 * Product Controller
 * MySQL version
 */

const crypto = require("crypto");
const db = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");
const {
    processProductImage,
    deleteProductImages
} = require("../utils/imageProcessor");


function getThumbnailPath(imagePath) {

    if (!imagePath) {
        return null;
    }

    return imagePath.replace("-full.jpg", "-thumb.jpg");

}


function serializeProduct(row) {

    return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        image: row.image ? row.image : null,
        categoryId: row.category_id,
        categoryName: row.category_name || null,
        isAvailable: !!row.availability,
        createdAt: row.created_at
    };

}


const BASE_QUERY = `
SELECT 
    p.*,
    c.name AS category_name
FROM products p
LEFT JOIN categories c 
ON c.id = p.category_id
`;


// GET ALL PRODUCTS
const list = asyncHandler(async (req,res)=>{

    const {category, search, availability} = req.query;

    let sql = BASE_QUERY;
    let conditions = [];
    let params = [];


    if(category){
        conditions.push("p.category_id = ?");
        params.push(category);
    }


    if(search){
        conditions.push("(p.name LIKE ? OR p.description LIKE ?)");
        params.push(`%${search}%`);
        params.push(`%${search}%`);
    }


    if(availability === "available"){
        conditions.push("p.availability = 1");
    }


    if(availability === "unavailable"){
        conditions.push("p.availability = 0");
    }


    if(conditions.length){
        sql += " WHERE " + conditions.join(" AND ");
    }


    sql += " ORDER BY p.created_at DESC";


    const [rows] = await db.query(sql,params);


    res.json({
        products: rows.map(serializeProduct)
    });

});



// GET SINGLE PRODUCT

const getOne = asyncHandler(async(req,res)=>{

    const [rows] = await db.query(
        `${BASE_QUERY} WHERE p.id = ?`,
        [req.params.id]
    );


    if(rows.length === 0){
        return res.status(404).json({
            error:"Product not found"
        });
    }


    res.json({
        product: serializeProduct(rows[0])
    });

});



// CREATE PRODUCT

const create = asyncHandler(async(req,res)=>{


    const {
        name,
        description="",
        price,
        categoryId,
        isAvailable
    } = req.body;


    let image=null;


    if(req.file){

        const fileName = crypto.randomUUID();

        const result = await processProductImage(
            req.file.buffer,
            fileName
        );

        image=result.full;

    }


    const [result] = await db.query(
        `
        INSERT INTO products
        (name,description,price,image,category_id,availability)
        VALUES (?,?,?,?,?,?)
        `,
        [
            name.trim(),
            description.trim(),
            Number(price),
            image,
            categoryId || null,
            isAvailable === undefined ? 1 : (String(isAvailable) === "false" ? 0 : 1)
        ]
    );


    const [rows] = await db.query(
        `${BASE_QUERY} WHERE p.id=?`,
        [result.insertId]
    );


    res.status(201).json({
        product: serializeProduct(rows[0])
    });

});



// UPDATE PRODUCT

const update = asyncHandler(async(req,res)=>{


    const {id}=req.params;


    const [existingRows] = await db.query(
        "SELECT * FROM products WHERE id=?",
        [id]
    );


    if(existingRows.length===0){
        return res.status(404).json({
            error:"Product not found"
        });
    }


    const existing = existingRows[0];


    const {
        name,
        description,
        price,
        categoryId,
        isAvailable
    } = req.body;


    let image = existing.image;



    if(req.file){

        const fileName = crypto.randomUUID();

        const result = await processProductImage(
            req.file.buffer,
            fileName
        );


        image=result.full;


        if(existing.image){
            await deleteProductImages({
                full: existing.image,
                thumb: getThumbnailPath(existing.image)
            });
        }

    }



    await db.query(
        `
        UPDATE products SET
        name=?,
        description=?,
        price=?,
        image=?,
        category_id=?,
        availability=?
        WHERE id=?
        `,
        [
            name ?? existing.name,
            description ?? existing.description,
            price ?? existing.price,
            image,
            categoryId ?? existing.category_id,
            isAvailable === undefined ? existing.availability : (String(isAvailable) === "false" ? 0 : 1),
            id
        ]
    );



    const [updated] = await db.query(
        `${BASE_QUERY} WHERE p.id=?`,
        [id]
    );


    res.json({
        product: serializeProduct(updated[0])
    });


});



// DELETE PRODUCT

const remove = asyncHandler(async(req,res)=>{


    const {id}=req.params;


    const [rows] = await db.query(
        "SELECT * FROM products WHERE id=?",
        [id]
    );


    if(rows.length===0){
        return res.status(404).json({
            error:"Product not found"
        });
    }


    if (rows[0].image) {
        await deleteProductImages({
            full: rows[0].image,
            thumb: getThumbnailPath(rows[0].image)
        });
    }

    await db.query(
        "DELETE FROM products WHERE id=?",
        [id]
    );


    res.json({
        success:true,
        message:"Product deleted successfully"
    });

});


module.exports={
    list,
    getOne,
    create,
    update,
    remove
};