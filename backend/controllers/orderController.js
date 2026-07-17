const db = require('../config/db');
const asyncHandler = require('../middleware/asyncHandler');


function serializeOrder(order, items) {

    return {
        id: order.id,
        customerName: order.customer_name,
        phone: order.phone,
        address: order.address,
        note: order.note,
        status: order.status,
        total: order.total,
        source: order.source,
        createdAt: order.created_at,

        items: items.map(item => ({
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    unitPrice: item.price,
    subtotal: item.quantity * item.price
}))
    };

}


// GET ALL ORDERS
const list = asyncHandler(async(req,res)=>{

    const {search,status}=req.query;


    let sql = `
        SELECT * FROM orders
    `;

    let params=[];


    let conditions=[];


    if(search){

        conditions.push(
            `(customer_name LIKE ? OR phone LIKE ? OR address LIKE ?)`
        );

        params.push(
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
        );

    }


    if(status){

        conditions.push(
            "status=?"
        );

        params.push(status);

    }


    if(conditions.length){

        sql += " WHERE " + conditions.join(" AND ");

    }


    sql += " ORDER BY created_at DESC";


    const [orders] = await db.query(sql,params);


    const result=[];


  for(const order of orders){

    const [items] = await db.query(
    `
    SELECT 
        oi.product_id,
        p.name AS product_name,
        oi.quantity,
        oi.price
    FROM order_items oi
    LEFT JOIN products p 
    ON oi.product_id = p.id
    WHERE oi.order_id=?
    ORDER BY oi.id ASC
    `,
    [order.id]
    );


    result.push(
        serializeOrder(order,items)
    );

}


    res.json({
        success:true,
        orders:result
    });


});



// GET SINGLE ORDER
const getOne = asyncHandler(async(req,res)=>{


    const [orders]=await db.query(
        "SELECT * FROM orders WHERE id=?",
        [req.params.id]
    );


    if(!orders.length){

        return res.status(404).json({
            message:"Order not found"
        });

    }


    const [items]=await db.query(
`
SELECT 
    oi.product_id,
    p.name AS product_name,
    oi.quantity,
    oi.price
FROM order_items oi
LEFT JOIN products p 
ON oi.product_id = p.id
WHERE oi.order_id=?
`,
[req.params.id]
);


    res.json({
        success:true,
        order:serializeOrder(
            orders[0],
            items
        )
    });


});




// UPDATE STATUS
const updateStatus = asyncHandler(async(req,res)=>{


    const {status}=req.body;


    await db.query(
        "UPDATE orders SET status=? WHERE id=?",
        [
            status,
            req.params.id
        ]
    );


    res.json({
        success:true,
        message:"Status updated"
    });


});




// DELETE ORDER
const remove = asyncHandler(async(req,res)=>{


    await db.query(
        "DELETE FROM order_items WHERE order_id=?",
        [req.params.id]
    );


    await db.query(
        "DELETE FROM orders WHERE id=?",
        [req.params.id]
    );


    res.json({
        success:true,
        message:"Order deleted"
    });


});




// CREATE PUBLIC ORDER
const createPublic = asyncHandler(async(req,res)=>{


    const {
        customerName,
        phone,
        address,
        note="",
        items
    }=req.body;


    if(!items || items.length===0){

        return res.status(400).json({
            message:"Items required"
        });

    }


    const total = items.reduce(
        (sum,item)=>
        sum + item.quantity * item.unitPrice,
        0
    );


    const connection=await db.getConnection();


    try{

        await connection.beginTransaction();


    await connection.query(
    `
    INSERT INTO order_items
    (order_id,product_id,quantity,price)
    VALUES(?,?,?,?)
    `,
    [
        order.insertId,
        item.productId,
        item.quantity,
        item.unitPrice
    ]
);


        for(const item of items){

            await connection.query(
                `
                INSERT INTO order_items
                (order_id,product_name,quantity,unit_price,subtotal)
                VALUES(?,?,?,?,?)
                `,
                [
                    order.insertId,
                    item.name,
                    item.quantity,
                    item.unitPrice,
                    item.quantity*item.unitPrice
                ]
            );

        }


        await connection.commit();


        res.status(201).json({
            success:true,
            orderId:order.insertId
        });


    }catch(error){

        await connection.rollback();
        throw error;

    }finally{

        connection.release();

    }


});



module.exports={
    list,
    getOne,
    updateStatus,
    remove,
    createPublic
};