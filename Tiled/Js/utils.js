// js/utils.js

export async function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (e) => {
            console.error(`Error loading image: ${src}`, e);
            reject(new Error(`Failed to load image: ${src}`));
        };
    });
}
