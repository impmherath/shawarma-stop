const sharp = require("sharp");
const path = require("path");
const fs = require("fs");


const uploadDir = path.join(
    __dirname,
    "../uploads/products"
);


// Create folder
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}


// Process product image
const processProductImage = async (buffer, baseName) => {

    const fullName = `${baseName}-full.jpg`;
    const thumbName = `${baseName}-thumb.jpg`;


    const fullPath = path.join(
        uploadDir,
        fullName
    );


    const thumbPath = path.join(
        uploadDir,
        thumbName
    );


    // Main image
    await sharp(buffer)
        .resize(
            900,
            900,
            {
                fit: "cover",
                position: "center"
            }
        )
        .jpeg({
            quality: 85
        })
        .toFile(fullPath);



    // Thumbnail image
    await sharp(buffer)
        .resize(
            300,
            300,
            {
                fit: "cover",
                position: "center"
            }
        )
        .jpeg({
            quality: 75
        })
        .toFile(thumbPath);



    return {
        full: `/uploads/products/${fullName}`,
        thumb: `/uploads/products/${thumbName}`
    };

};



// Delete images
const deleteProductImages = async ({
    full,
    thumb
}) => {


    const files = [
        full,
        thumb
    ];


    files.forEach(file => {

        if (!file) return;

        const normalizedPath = file.replace(/^\/+/, "");


        const filePath = path.join(
            __dirname,
            "..",
            normalizedPath
        );


        if (fs.existsSync(filePath)) {

            fs.unlinkSync(filePath);

        }

    });


};



module.exports = {
    processProductImage,
    deleteProductImages
};