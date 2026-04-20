
/**
 * Compresses a base64 data URL image to a specific dimension and quality.
 * @param dataUrl The source image data URL.
 * @param targetWidth The target width (e.g., 512).
 * @param targetHeight The target height (e.g., 512).
 * @param quality The JPEG quality (0 to 1). Default is 0.85.
 * @returns A Promise that resolves to the compressed data URL.
 */
export async function compressDataUrl(dataUrl: string, targetWidth: number, targetHeight: number, quality: number = 0.85): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => {
            console.error("Image compression failed:", err);
            reject(new Error('Failed to load image for compression.'));
        };
        img.src = dataUrl;
    });
}

/**
 * Resizes and compresses a base64 data URL image while maintaining aspect ratio.
 * @param dataUrl The source image data URL.
 * @param maxWidth The maximum width.
 * @param maxHeight The maximum height.
 * @param quality The JPEG quality (0 to 1). Default is 0.8.
 * @returns A Promise that resolves to the compressed data URL.
 */
export async function smartCompressImage(dataUrl: string, maxWidth: number = 1600, maxHeight: number = 1600, quality: number = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions maintaining aspect ratio
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = (err) => {
            console.error("Image compression failed:", err);
            reject(new Error('Failed to load image for compression.'));
        };
        img.src = dataUrl;
    });
}
