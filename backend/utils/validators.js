const {
    body,
    validationResult
} = require("express-validator");

const VALID_ORDER_STATUSES = [
    "Pending",
    "Preparing",
    "Completed",
    "Cancelled"
];


// Login validation
const loginRules = [

    body("username")
        .notEmpty()
        .withMessage("Username is required"),

    body("password")
        .notEmpty()
        .withMessage("Password is required")

];



// Category validation
const categoryRules = [

    body("name")
        .notEmpty()
        .withMessage("Category name is required")

];



// Product validation
const productRules = [

    body("name")
        .trim()
        .notEmpty()
        .withMessage("Product name is required"),

    body("price")
        .trim()
        .notEmpty()
        .withMessage("Price is required")
        .isNumeric()
        .withMessage("Price must be a number"),

    body("categoryId")
        .trim()
        .notEmpty()
        .withMessage("Category is required")
        .isInt({ min: 1 })
        .withMessage("Category must be a valid id")

];



// Public Order validation
const publicOrderRules = [

    body("customerName")
        .trim()
        .notEmpty()
        .withMessage("Customer name is required"),

    body("phone")
        .notEmpty()
        .withMessage("Phone number is required")
        .custom((value) => {
            const normalized = String(value ?? "").replace(/[\s-]/g, "");

            if (!/^(?:\+94|94|0)?7\d{8}$/.test(normalized)) {
                throw new Error("Enter a valid Sri Lankan phone number");
            }

            return true;
        }),

    body("address")
        .trim()
        .notEmpty()
        .withMessage("Delivery address is required"),

    body("note")
        .optional({ nullable: true })
        .trim(),

    body("items")
        .isArray({ min: 1 })
        .withMessage("Order items are required"),

    body("items.*.productId")
        .isInt({ min: 1 })
        .withMessage("Each item must include a valid product id"),

    body("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Each item quantity must be at least 1"),

    body("items.*.unitPrice")
        .isFloat({ gt: 0 })
        .withMessage("Each item must include a valid price")

];



// Order status validation
const orderStatusRules = [

    body("status")
        .isIn([
            "Pending",
            "Preparing",
            "Completed",
            "Cancelled"
        ])
        .withMessage("Invalid order status")

];



// Validation middleware
const validate = (req, res, next) => {

    const errors = validationResult(req);


    if (!errors.isEmpty()) {

        return res.status(400).json({
            errors: errors.array()
        });

    }


    next();

};



module.exports = {
    loginRules,
    categoryRules,
    productRules,
    publicOrderRules,
    orderStatusRules,
    VALID_ORDER_STATUSES,
    validate
};