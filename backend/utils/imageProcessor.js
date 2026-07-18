const sharp = require("sharp");
const path = require("path");
const fs = require("fs");


const uploadDir = path.join(
    __dirname,
    "../uploads"
);

const productDir = path.join(uploadDir, "products");
const galleryDir = path.join(uploadDir, "gallery");


// Create folders used by optimized uploads.
[productDir, galleryDir].forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

async function processOptimizedImage(buffer, baseName, targetDir, fullSize, thumbSize) {
    const fullName = `${baseName}-full.jpg`;
    const thumbName = `${baseName}-thumb.jpg`;

    const fullPath = path.join(targetDir, fullName);
    const thumbPath = path.join(targetDir, thumbName);

    await sharp(buffer)
        .resize(fullSize.width, fullSize.height, {
            fit: "cover",
            position: "center"
        })
        .jpeg({ quality: fullSize.quality })
        .toFile(fullPath);

    await sharp(buffer)
        .resize(thumbSize.width, thumbSize.height, {
            fit: "cover",
            position: "center"
        })
        .jpeg({ quality: thumbSize.quality })
        .toFile(thumbPath);

    return {
        full: fullPath,
        thumb: thumbPath,
        publicFull: `${targetDir === galleryDir ? "/uploads/gallery/" : "/uploads/products/"}${fullName}`,
        publicThumb: `${targetDir === galleryDir ? "/uploads/gallery/" : "/uploads/products/"}${thumbName}`
    };
}


// Process product image
const processProductImage = async (buffer, baseName) => {
    const result = await processOptimizedImage(buffer, baseName, productDir, {
        width: 900,
        height: 900,
        quality: 85
    }, {
        width: 300,
        height: 300,
        quality: 75
    });

    return {
        full: result.publicFull,
        thumb: result.publicThumb
    };

};

const processGalleryImage = async (buffer, baseName) => {
    const result = await processOptimizedImage(buffer, baseName, galleryDir, {
        width: 1400,
        height: 1100,
        quality: 84
    }, {
        width: 520,
        height: 390,
        quality: 76
    });

    return {
        full: result.publicFull,
        thumb: result.publicThumb
    };

};



// Delete images
const deleteImageSet = async (imagePath) => {
    if (!imagePath) return;

    const normalizedPath = imagePath.replace(/^\/+/, "");
    const basePath = path.join(__dirname, "..", normalizedPath);
    const thumbPath = basePath.replace(/-full\.jpg$/, "-thumb.jpg");

    [basePath, thumbPath].forEach((filePath) => {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    });
};

const deleteProductImages = async ({ full }) => deleteImageSet(full);

const deleteGalleryImages = async ({ full }) => deleteImageSet(full);



module.exports = {
    processProductImage,
    processGalleryImage,
    deleteProductImages,
    deleteGalleryImages,
    deleteImageSet
};