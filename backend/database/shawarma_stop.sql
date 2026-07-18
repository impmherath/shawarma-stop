CREATE DATABASE IF NOT EXISTS shawarma_stop;

USE shawarma_stop;


-- USERS TABLE
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','staff') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ADMIN USER
INSERT INTO users
(username,password,role)
VALUES
(
'admin',
'$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
'admin'
);



-- CATEGORY TABLE
CREATE TABLE categories (

id INT AUTO_INCREMENT PRIMARY KEY,

name VARCHAR(100) NOT NULL UNIQUE,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



-- PRODUCT TABLE
CREATE TABLE products (

id INT AUTO_INCREMENT PRIMARY KEY,

name VARCHAR(150) NOT NULL,

description TEXT,

price DECIMAL(10,2) NOT NULL,

image VARCHAR(255),

category_id INT,

availability BOOLEAN DEFAULT TRUE,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,


FOREIGN KEY(category_id)
REFERENCES categories(id)
ON DELETE SET NULL

);



-- ORDERS TABLE
CREATE TABLE orders (

id INT AUTO_INCREMENT PRIMARY KEY,

customer_name VARCHAR(100),

phone VARCHAR(20),

address TEXT,

note TEXT,

source VARCHAR(20) DEFAULT 'Website',

total_amount DECIMAL(10,2),

status ENUM(
'Pending',
'Preparing',
'Ready',
'Completed',
'Cancelled'
)
DEFAULT 'Pending',

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);



-- ORDER ITEMS TABLE
CREATE TABLE order_items (

id INT AUTO_INCREMENT PRIMARY KEY,

order_id INT,

product_id INT,

quantity INT DEFAULT 1,

price DECIMAL(10,2),


FOREIGN KEY(order_id)
REFERENCES orders(id)
ON DELETE CASCADE,


FOREIGN KEY(product_id)
REFERENCES products(id)
ON DELETE CASCADE

);



-- SAMPLE CATEGORIES

INSERT INTO categories(name)
VALUES

('Shawarma'),
('Burgers'),
('Drinks'),
('Combos');



-- SAMPLE PRODUCTS

INSERT INTO products
(name,description,price,category_id)

VALUES

(
'Chicken Shawarma',
'Chicken shawarma with garlic sauce',
850,
1
),

(
'Chicken Burger',
'Crispy chicken burger',
750,
2
),

(
'Coca Cola',
'Cold drink',
250,
3
);



-- SAMPLE ORDER

INSERT INTO orders
(customer_name,phone,address,total_amount,status)

VALUES

(
'Test Customer',
'0771234567',
'Colombo',
1100,
'Pending'
);



-- ORDER ITEMS

INSERT INTO order_items
(order_id,product_id,quantity,price)

VALUES

(1,1,1,850);



-- INDEXES

CREATE INDEX idx_product_category
ON products(category_id);


CREATE INDEX idx_order_status
ON orders(status);


CREATE INDEX idx_order_date
ON orders(created_at);