/**
 * Category Controller
 * Handles Category CRUD operations
 */

const slugify = require("slugify");
const db = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");


// @desc    Get all categories
// @route   GET /api/categories
// @access  Admin
const list = asyncHandler(async (req, res) => {

    const categories = db
        .prepare(
            `
            SELECT 
                c.*,
                COUNT(p.id) AS product_count
            FROM categories c
            LEFT JOIN products p 
                ON p.category_id = c.id
            GROUP BY c.id
            ORDER BY c.name ASC
            `
        )
        .all();


    res.json({
        categories
    });

});



// @desc    Create category
// @route   POST /api/categories
// @access  Admin
const create = asyncHandler(async (req, res) => {

    const { name } = req.body;


    if (!name || name.trim() === "") {

        return res.status(400).json({
            error: "Category name is required"
        });

    }


    const cleanName = name.trim();


    const slug = slugify(cleanName, {
        lower: true,
        strict: true
    });



    const existing = db
        .prepare(
            "SELECT id FROM categories WHERE slug = ?"
        )
        .get(slug);



    if (existing) {

        return res.status(409).json({
            error: "Category already exists"
        });

    }



    const result = db
        .prepare(
            `
            INSERT INTO categories
            (name, slug)
            VALUES (?, ?)
            `
        )
        .run(
            cleanName,
            slug
        );



    const category = db
        .prepare(
            "SELECT * FROM categories WHERE id = ?"
        )
        .get(
            result.lastInsertRowid
        );



    res.status(201).json({
        category
    });

});



// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Admin
const update = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const { name } = req.body;



    if (!name || name.trim() === "") {

        return res.status(400).json({
            error: "Category name is required"
        });

    }



    const category = db
        .prepare(
            "SELECT * FROM categories WHERE id = ?"
        )
        .get(id);



    if (!category) {

        return res.status(404).json({
            error: "Category not found"
        });

    }



    const cleanName = name.trim();


    const slug = slugify(cleanName, {
        lower: true,
        strict: true
    });



    const duplicate = db
        .prepare(
            `
            SELECT id 
            FROM categories 
            WHERE slug = ? 
            AND id != ?
            `
        )
        .get(
            slug,
            id
        );



    if (duplicate) {

        return res.status(409).json({
            error: "Category already exists"
        });

    }



    db.prepare(
        `
        UPDATE categories
        SET 
            name = ?,
            slug = ?,
            updated_at = datetime('now')
        WHERE id = ?
        `
    )
    .run(
        cleanName,
        slug,
        id
    );



    const updatedCategory = db
        .prepare(
            "SELECT * FROM categories WHERE id = ?"
        )
        .get(id);



    res.json({
        category: updatedCategory
    });

});




// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Admin
const remove = asyncHandler(async (req, res) => {

    const { id } = req.params;



    const category = db
        .prepare(
            "SELECT * FROM categories WHERE id = ?"
        )
        .get(id);



    if (!category) {

        return res.status(404).json({
            error: "Category not found"
        });

    }



    db.prepare(
        "DELETE FROM categories WHERE id = ?"
    )
    .run(id);



    res.json({
        success: true,
        message: "Category deleted successfully"
    });

});



module.exports = {
    list,
    create,
    update,
    remove
};