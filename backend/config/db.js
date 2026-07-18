const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function ensureOrderStatusSchema() {
    const [noteColumns] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND COLUMN_NAME = 'note'
        `
    );

    if (!noteColumns[0].count) {
        await db.query(
            `ALTER TABLE orders
             ADD COLUMN note TEXT NULL AFTER address`
        );
    }

    const [sourceColumns] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND COLUMN_NAME = 'source'
        `
    );

    if (!sourceColumns[0].count) {
        await db.query(
            `ALTER TABLE orders
             ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'Website' AFTER note`
        );
    }

    const [statusColumns] = await db.query(
        `
        SELECT COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
          AND COLUMN_NAME = 'status'
        LIMIT 1
        `
    );

    const currentType = statusColumns[0] && statusColumns[0].COLUMN_TYPE ? String(statusColumns[0].COLUMN_TYPE) : '';

    if (currentType.includes("Ready")) {
        await db.query(
            `UPDATE orders SET status = 'Preparing' WHERE status = 'Ready'`
        );

        await db.query(
            `ALTER TABLE orders
             MODIFY status ENUM('Pending','Preparing','Completed','Cancelled')
             DEFAULT 'Pending'`
        );
    }

    const [productUpdatedAt] = await db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'products'
           AND COLUMN_NAME = 'updated_at'`
    );

    if (!productUpdatedAt[0].count) {
        await db.query(
            `ALTER TABLE products
             ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at`
        );
    }

    const [galleryTable] = await db.query(
        `SELECT COUNT(*) AS count
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'gallery'`
    );

    if (!galleryTable[0].count) {
        await db.query(
            `CREATE TABLE gallery (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(160) NOT NULL,
                description TEXT,
                image VARCHAR(255),
                display_order INT DEFAULT 0,
                status ENUM('Visible','Hidden') DEFAULT 'Visible',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )`
        );
    }
}

db.getConnection()
    .then(connection => {
        console.log("MySQL Connected");
        connection.release();
        return ensureOrderStatusSchema();
    })
    .catch(err => {
        console.log("Database connection failed");
        console.log(err);
    });

module.exports = db;