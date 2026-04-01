import { BannerGenerationSettings } from '../types';

/**
 * Call backend to generate banner (Clone mode: reference + product images)
 */
export async function generateBanner(
    token: string,
    referenceImages: string[],
    productImages: string[],
    brandDescription: string,
    promoInfo: string,
    userPrompt: string,
    settings: BannerGenerationSettings
): Promise<{ base64: string; style: string }[]> {
    const res = await fetch('/api/generate/banner', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            referenceImages,
            productImages,
            brandDescription,
            promoInfo,
            userPrompt,
            settings: {
                aspectRatio: settings.aspectRatio,
                quality: settings.quality,
                typography: settings.typography,
                quantity: settings.quantity,
            },
        }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        throw new Error(errData.error || 'Lỗi server khi tạo banner.');
    }

    const data = await res.json();
    if (!data.images || data.images.length === 0) {
        throw new Error('Server không trả về ảnh. Vui lòng thử lại.');
    }
    return data.images;
}

/**
 * Call backend to generate design (Design mode: reference + info files)
 */
export async function generateDesign(
    token: string,
    referenceImages: string[],
    infoFiles: string[],
    brandDescription: string,
    promoInfo: string,
    userPrompt: string,
    settings: BannerGenerationSettings
): Promise<{ base64: string; style: string }[]> {
    const res = await fetch('/api/generate/design', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            referenceImages,
            infoFiles,
            brandDescription,
            promoInfo,
            userPrompt,
            settings: {
                aspectRatio: settings.aspectRatio,
                quality: settings.quality,
                typography: settings.typography,
                quantity: settings.quantity,
            },
        }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        throw new Error(errData.error || 'Lỗi server khi tạo thiết kế.');
    }

    const data = await res.json();
    if (!data.images || data.images.length === 0) {
        throw new Error('Server không trả về ảnh. Vui lòng thử lại.');
    }
    return data.images;
}

/**
 * Edit an existing banner with a natural language prompt
 */
export async function editBanner(
    token: string,
    currentImageBase64: string,
    editPrompt: string,
    aspectRatio: string
): Promise<string> {
    const res = await fetch('/api/generate/edit', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentImageBase64, editPrompt, aspectRatio }),
    });

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        throw new Error(errData.error || 'Lỗi server khi chỉnh sửa ảnh.');
    }

    const data = await res.json();
    return data.image.base64;
}
