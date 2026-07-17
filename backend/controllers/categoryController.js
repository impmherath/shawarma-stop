/**
 * Category Controller
 * Handles Category CRUD operations
 */

const db = require("../config/db");
const asyncHandler = require("../middleware/asyncHandler");


// GET ALL CATEGORIES
const list = asyncHandler(async (req, res) => {

    const [categories] = await db.query(
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
    );

    res.json({
        categories
    });

});


// CREATE CATEGORY
const create = asyncHandler(async (req, res) => {

    const { name } = req.body;


    if (!name || name.trim() === "") {
        return res.status(400).json({
            error: "Category name is required"
        });
    }


    const cleanName = name.trim();


    const [existing] = await db.query(
        "SELECT id FROM categories WHERE name = ?",
        [cleanName]
    );


    if (existing.length > 0) {
        return res.status(409).json({
            error: "Category already exists"
        });
    }


    const [result] = await db.query(
        "INSERT INTO categories (name) VALUES (?)",
        [cleanName]
    );


    const [category] = await db.query(
        "SELECT * FROM categories WHERE id = ?",
        [result.insertId]
    );


    res.status(201).json({
        category: category[0]
    });

});


// UPDATE CATEGORY
const update = asyncHandler(async (req, res) => {

    const { id } = req.params;
    const { name } = req.body;


    if (!name || name.trim() === "") {
        return res.status(400).json({
            error: "Category name is required"
        });
    }


    const cleanName = name.trim();


    const [category] = await db.query(
        "SELECT * FROM categories WHERE id = ?",
        [id]
    );


    if (category.length === 0) {
        return res.status(404).json({
            error: "Category not found"
        });
    }


    const [duplicate] = await db.query(
        "SELECT id FROM categories WHERE name = ? AND id != ?",
        [cleanName, id]
    );


    if (duplicate.length > 0) {
        return res.status(409).json({
            error: "Category already exists"
        });
    }


    await db.query(
        "UPDATE categories SET name = ? WHERE id = ?",
        [cleanName, id]
    );


    const [updated] = await db.query(
        "SELECT * FROM categories WHERE id = ?",
        [id]
    );


    res.json({
        category: updated[0]
    });

});


// DELETE CATEGORY
const remove = asyncHandler(async (req, res) => {

    const { id } = req.params;


    const [category] = await db.query(
        "SELECT * FROM categories WHERE id = ?",
        [id]
    );


    if (category.length === 0) {
        return res.status(404).json({
            error: "Category not found"
        });
    }


    await db.query(
        "DELETE FROM categories WHERE id = ?",
        [id]
    );


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