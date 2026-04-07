import { BannerGenerationSettings } from '../types';

/** Helper: fetch with a custom timeout (default 5 min for AI generation) */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs = 5 * 60 * 1000
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error('Yêu cầu quá thời gian chờ (timeout). Vui lòng thử lại.');
        }
        // TypeError: Failed to fetch → server unreachable or CORS blocked
        if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
            throw new Error(
                'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.'
            );
        }
        throw err;
    } finally {
        clearTimeout(id);
    }
}

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
    const res = await fetchWithTimeout(
        '/api/generate/banner',
        {
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
        }
    );

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        if (res.status === 413) {
            throw new Error('Dung lượng ảnh tải lên quá lớn. Vui lòng giảm kích thước ảnh hoặc số lượng ảnh.');
        }
        if (res.status === 429) {
            throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.');
        }
        if (res.status >= 500) {
            throw new Error(errData.error || 'Lỗi máy chủ khi tạo banner. Vui lòng thử lại.');
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
    const res = await fetchWithTimeout(
        '/api/generate/design',
        {
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
        }
    );

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        if (res.status === 413) {
            throw new Error('Dung lượng file tải lên quá lớn. Vui lòng giảm kích thước file hoặc số lượng file.');
        }
        if (res.status === 429) {
            throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.');
        }
        if (res.status >= 500) {
            throw new Error(errData.error || 'Lỗi máy chủ khi tạo thiết kế. Vui lòng thử lại.');
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
 * Call backend to generate creative banner (no reference image needed)
 */
export async function generateCreativeBanner(
    token: string,
    bannerTitle: string,
    industry: string,
    purpose: string,
    brandDescription: string,
    promoInfo: string,
    userPrompt: string,
    productImages: string[],
    brandColors: string[],
    logo: string | null,
    settings: BannerGenerationSettings
): Promise<{ base64: string; style: string }[]> {
    const res = await fetchWithTimeout(
        '/api/generate/creative',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                bannerTitle,
                industry,
                purpose,
                brandDescription,
                promoInfo,
                userPrompt,
                productImages,
                brandColors,
                logo,
                settings: {
                    aspectRatio: settings.aspectRatio,
                    quality: settings.quality,
                    typography: settings.typography,
                    quantity: settings.quantity,
                },
            }),
        }
    );

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        if (res.status === 413) {
            throw new Error('Dung lượng ảnh tải lên quá lớn. Vui lòng giảm kích thước ảnh.');
        }
        if (res.status === 429) {
            throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.');
        }
        if (res.status >= 500) {
            throw new Error(errData.error || 'Lỗi máy chủ khi tạo banner. Vui lòng thử lại.');
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
 * Edit an existing banner with a natural language prompt
 */
export async function editBanner(
    token: string,
    currentImageBase64: string,
    editPrompt: string,
    aspectRatio: string
): Promise<string> {
    const res = await fetchWithTimeout(
        '/api/generate/edit',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ currentImageBase64, editPrompt, aspectRatio }),
        }
    );

    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'INSUFFICIENT_CREDITS') {
            throw new Error(errData.message || 'Không đủ credits. Vui lòng mua thêm.');
        }
        if (res.status === 413) {
            throw new Error('Dung lượng ảnh quá lớn để chỉnh sửa.');
        }
        if (res.status === 429) {
            throw new Error('Quá nhiều yêu cầu. Vui lòng thử lại sau vài phút.');
        }
        if (res.status >= 500) {
            throw new Error(errData.error || 'Lỗi máy chủ khi chỉnh sửa ảnh. Vui lòng thử lại.');
        }
        throw new Error(errData.error || 'Lỗi server khi chỉnh sửa ảnh.');
    }

    const data = await res.json();
    return data.image.base64;
}
