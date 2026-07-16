const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();


// Middleware
app.use(cors());
app.use(express.json());


// Image folder access
app.use(
    "/uploads",
    express.static("uploads")
);


// Routes

app.use(
    "/api/auth",
    require("./routes/auth.routes")
);


app.use(
    "/api/categories",
    require("./routes/category.routes")
);


app.use(
    "/api/products",
    require("./routes/product.routes")
);


app.use(
    "/api/orders",
    require("./routes/order.routes")
);


app.use(
    "/api/dashboard",
    require("./routes/dashboard.routes")
);



app.get("/", (req,res)=>{

    res.send("Shawarma Stop Backend Running");

});



// Server Start

const PORT = process.env.PORT || 5000;


app.listen(PORT,()=>{

    console.log(
        `Server running on port ${PORT}`
    );

});