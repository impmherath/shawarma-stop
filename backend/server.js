const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5000,http://127.0.0.1:5000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);


// Middleware
app.use(cors({
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get("/admin", (req, res) => {
    res.redirect("/admin/login.html");
});


// Serve the admin frontend from the same origin so auth cookies are sent
// back on dashboard and other protected API requests.
app.use("/admin", express.static(path.join(__dirname, "../frontend/admin")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Database
require("./config/db");


// Routes
const authRoutes = require("./routes/auth.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const galleryRoutes = require("./routes/gallery.routes");
const mediaRoutes = require("./routes/media.routes");


// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/media", mediaRoutes);


// Home route
app.get("/", (req, res) => {
    res.json({
        message: "Shawarma Stop API Running"
    });
});


// Error handler
const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);



const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});