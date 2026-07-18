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