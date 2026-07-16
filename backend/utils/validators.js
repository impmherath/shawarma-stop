const {
    body,
    validationResult
} = require("express-validator");


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
        .notEmpty()
        .withMessage("Product name is required"),

    body("price")
        .notEmpty()
        .withMessage("Price is required")
        .isNumeric()
        .withMessage("Price must be a number"),

    body("categoryId")
        .notEmpty()
        .withMessage("Category is required")

];



// Public Order validation
const publicOrderRules = [

    body("customerName")
        .notEmpty()
        .withMessage("Customer name is required"),

    body("phone")
        .notEmpty()
        .withMessage("Phone number is required"),

    body("items")
        .notEmpty()
        .withMessage("Order items are required")

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
    validate
};