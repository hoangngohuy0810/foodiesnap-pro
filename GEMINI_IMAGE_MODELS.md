# Tài liệu tham chiếu: Gemini Image Generation Models

> Nguồn: https://ai.google.dev/gemini-api/docs/image-generation?hl=vi
> Cập nhật: 2026-04-03

---

## Các Model Tạo Ảnh Native (Nano Banana)

Google Gemini hỗ trợ tạo ảnh native qua `generateContent` API với `responseModalities: ['IMAGE', 'TEXT']`.

### 1. Nano Banana Pro ⭐ (Cao nhất)
- **Model ID:** `gemini-3-pro-image-preview`
- **Mô tả:** Gemini 3 Pro Image Preview — Designed for professional-grade creative work with the highest image quality. Max quality, best for banners and commercial images.
- **Dùng cho:** Banner generation, commercial food photography, high-quality outputs
- **Tốc độ:** Chậm hơn nhưng chất lượng cao nhất

### 2. Nano Banana 2 ✅ (Khuyến nghị)
- **Model ID:** `gemini-3.1-flash-image-preview`
- **Mô tả:** Gemini 3.1 Flash Image Preview — High-efficiency counterpart to Gemini 3 Pro Image, optimized for speed and cost while maintaining high quality.
- **Dùng cho:** Banner generation, food photography, balanced speed/quality
- **Tốc độ:** Nhanh, cân bằng giữa chất lượng và tốc độ

### 3. Nano Banana (Cơ bản)
- **Model ID:** `gemini-2.5-flash-image`
- **Mô tả:** Gemini 2.5 Flash Image — Designed for speed and cost efficiency.
- **Dùng cho:** Quick generations, lower cost use cases
- **Tốc độ:** Nhanh nhất, chi phí thấp nhất

---

## Cách sử dụng đúng với @google/genai SDK

```javascript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'YOUR_API_KEY' });

const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',  // hoặc gemini-3-pro-image-preview
  contents: [{ role: 'user', parts: [
    { text: 'Your prompt here' },
    { inlineData: { mimeType: 'image/jpeg', data: 'BASE64_DATA' } }  // optional input image
  ]}],
  config: {
    responseModalities: ['IMAGE', 'TEXT'],
    temperature: 1.0,
    // KHÔNG dùng imageConfig - chỉ dành cho Imagen models, không dùng cho Gemini
  },
});

// Lấy ảnh từ response
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const base64Image = part.inlineData.data;
    const mimeType = part.inlineData.mimeType; // 'image/png'
  }
}
```

---

## Lưu ý quan trọng

### ✅ ĐÚNG
- `responseModalities: ['IMAGE', 'TEXT']` — Cần có cả TEXT để model hoạt động đúng
- `temperature: 1.0` — Recommended cho image generation
- `contents: [{ role: 'user', parts: [...] }]` — Array format bắt buộc

### ❌ SAI (gây HTTP 400)
- `imageConfig: { imageSize: '1K' }` — **KHÔNG hợp lệ** cho Gemini models (chỉ dành cho Imagen)
- `imageConfig: { aspectRatio: '...' }` — **KHÔNG hợp lệ** cho Gemini models
- `contents: { parts: [...] }` — Phải là **array**, không phải object
- `responseModalities: ['IMAGE']` only (thiếu TEXT có thể gây lỗi)

### ⚠️ imageConfig chỉ dành cho Imagen API
Tham số `imageConfig` (với `aspectRatio`, `imageSize`, `numberOfImages`) chỉ được dùng với:
- `ai.models.generateImages()` — Imagen models (`imagen-4.0-generate-001`, etc.)
- **KHÔNG** dùng với `ai.models.generateContent()` — Gemini models

---

## So sánh Gemini vs Imagen

| Tính năng | Gemini (Nano Banana) | Imagen |
|-----------|---------------------|--------|
| API method | `generateContent` | `generateImages` |
| Input image | ✅ Có (multimodal) | ❌ Không |
| Text in image | ✅ Tốt | ✅ Tốt |
| Config param | `responseModalities` | `imageConfig` |
| aspectRatio | ❌ Không hỗ trợ | ✅ Có |
| Conversational | ✅ Có | ❌ Không |

---

## Model hierarchy (từ cao đến thấp)

```
gemini-3-pro-image-preview      ← CAO NHẤT, dùng cho banner/commercial
gemini-3.1-flash-image-preview  ← Khuyến nghị, cân bằng
gemini-2.5-flash-image          ← Cơ bản, nhanh/rẻ
```

**Quy tắc:** Tuyệt đối không dùng các model thấp hơn `gemini-2.5-flash-image` cho tính năng tạo ảnh thương mại.
