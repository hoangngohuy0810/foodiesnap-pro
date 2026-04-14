import { LogoSettings } from '../types';

/**
 * Crop/resize a base64 image to the target aspect ratio using Canvas.
 * Crops from center to maintain the most important content.
 */
export const cropToAspectRatio = async (
    base64Image: string,
    aspectRatio: string // e.g. '3:4', '16:9'
): Promise<string> => {
    return new Promise((resolve) => {
        const [wStr, hStr] = aspectRatio.split(':');
        const targetW = parseFloat(wStr);
        const targetH = parseFloat(hStr);
        if (!targetW || !targetH) {
            resolve(base64Image);
            return;
        }
        const targetRatio = targetW / targetH;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const srcRatio = img.width / img.height;

            // If already correct ratio (within 2% tolerance), skip
            if (Math.abs(srcRatio - targetRatio) / targetRatio < 0.02) {
                resolve(base64Image);
                return;
            }

            let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

            if (srcRatio > targetRatio) {
                // Too wide → crop sides
                srcW = Math.round(img.height * targetRatio);
                srcX = Math.round((img.width - srcW) / 2);
            } else {
                // Too tall → crop top/bottom
                srcH = Math.round(img.width / targetRatio);
                srcY = Math.round((img.height - srcH) / 2);
            }

            const canvas = document.createElement('canvas');
            canvas.width = srcW;
            canvas.height = srcH;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(base64Image); return; }

            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(base64Image);
        img.src = base64Image;
    });
};

/**
 * Overlay a logo onto a base64 image using Canvas API.
 * Returns a new base64 data URL with the logo applied.
 * Logo is clamped to stay fully inside the image bounds.
 */
export const applyLogoToImage = async (
    base64Image: string,
    logoSettings: LogoSettings
): Promise<string> => {
    if (!logoSettings.image) return base64Image;

    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            resolve(base64Image);
            return;
        }

        const mainImg = new Image();
        mainImg.crossOrigin = 'anonymous';
        mainImg.onload = () => {
            canvas.width = mainImg.width;
            canvas.height = mainImg.height;

            // Draw main image
            ctx.drawImage(mainImg, 0, 0);

            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            logoImg.onload = () => {
                // Calculate logo dimensions (size is % of main image width)
                const logoWidth = mainImg.width * (logoSettings.size / 100);
                const logoRatio = logoImg.height / logoImg.width;
                const logoHeight = logoWidth * logoRatio;

                // Calculate position based on center point (positionX/Y are 0-100%)
                const centerX = mainImg.width * (logoSettings.positionX / 100);
                const centerY = mainImg.height * (logoSettings.positionY / 100);
                let x = centerX - logoWidth / 2;
                let y = centerY - logoHeight / 2;

                // CLAMP: ensure logo stays fully inside image bounds
                x = Math.max(0, Math.min(mainImg.width - logoWidth, x));
                y = Math.max(0, Math.min(mainImg.height - logoHeight, y));

                if (logoSettings.addWhiteBorder) {
                    const borderSize = Math.max(2, mainImg.width * 0.005);

                    const offsets = [
                        [borderSize, borderSize],
                        [-borderSize, -borderSize],
                        [borderSize, -borderSize],
                        [-borderSize, borderSize],
                        [borderSize, 0],
                        [-borderSize, 0],
                        [0, borderSize],
                        [0, -borderSize],
                    ];

                    ctx.save();
                    offsets.forEach(([ox, oy]) => {
                        ctx.shadowColor = 'white';
                        ctx.shadowBlur = 0;
                        ctx.shadowOffsetX = ox;
                        ctx.shadowOffsetY = oy;
                        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
                    });
                    ctx.restore();
                }

                // Draw the actual logo
                ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
                resolve(canvas.toDataURL('image/png'));
            };

            logoImg.onerror = () => {
                console.error('Failed to load logo image');
                resolve(base64Image);
            };

            logoImg.src = logoSettings.image as string;
        };

        mainImg.onerror = () => {
            console.error('Failed to load main image');
            resolve(base64Image);
        };

        mainImg.src = base64Image;
    });
};

/**
 * Resize an image file (e.g. logo) to keep it under max dimensions to save storage size.
 * Uses WebP format to preserve transparency and optimize size.
 */
export const resizeImageFile = async (
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth || height > maxHeight) {
                    if (width > height) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    } else {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/webp', 0.85));
                } else {
                    resolve(event.target?.result as string); // fallback
                }
            };
            img.onerror = (error) => reject(error);
            img.src = event.target?.result as string;
        };
        reader.onerror = (error) => reject(error);
    });
};
