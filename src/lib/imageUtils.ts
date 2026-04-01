import { LogoSettings } from '../types';

/**
 * Overlay a logo onto a base64 image using Canvas API.
 * Returns a new base64 data URL with the logo applied.
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
                const x = centerX - logoWidth / 2;
                const y = centerY - logoHeight / 2;

                if (logoSettings.addWhiteBorder) {
                    ctx.shadowColor = 'white';
                    ctx.shadowBlur = 0;
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

                    offsets.forEach(([ox, oy]) => {
                        ctx.shadowOffsetX = ox;
                        ctx.shadowOffsetY = oy;
                        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
                    });

                    ctx.shadowColor = 'transparent';
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
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
