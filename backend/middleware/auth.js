const jwt = require("jsonwebtoken");


const COOKIE_NAME = "token";


const requireAuth = (req, res, next) => {

    const token =
    req.cookies[COOKIE_NAME] ||
    req.headers.authorization;


    if (!token) {

        return res.status(401).json({
            message: "Access denied. No token provided"
        });

    }


    try {

        const decoded = jwt.verify(
            token.replace("Bearer ", ""),
            process.env.JWT_SECRET
        );


        req.user = decoded;

        next();


    } catch (error) {

        return res.status(401).json({
            message: "Invalid token"
        });

    }

};


module.exports = {
    requireAuth,
    COOKIE_NAME
};