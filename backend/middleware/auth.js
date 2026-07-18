const jwt = require("jsonwebtoken");


const COOKIE_NAME = "token";


const getToken = (req) => {
    const cookieToken = req.cookies && req.cookies[COOKIE_NAME];

    if (cookieToken) {
        return cookieToken;
    }

    const authorizationHeader = req.headers.authorization;

    if (typeof authorizationHeader !== "string" || authorizationHeader.length === 0) {
        return null;
    }

    return authorizationHeader.startsWith("Bearer ")
        ? authorizationHeader.slice(7)
        : authorizationHeader;
};


const requireAuth = (req, res, next) => {

    const token = getToken(req);


    if (!token) {

        return res.status(401).json({
            message: "Access denied. No token provided"
        });

    }


    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);


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