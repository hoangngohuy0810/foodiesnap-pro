# Tài liệu tham chiếu: Gemini Image Generation (Nano Banana)

> Nguồn chính thức: https://ai.google.dev/gemini-api/docs/image-generation?hl=vi
> Tài liệu chi tiết: `nano-banana-image-generation.md`
> Cập nhật: 2026-04-08

---

## 1. Các Model Tạo Ảnh (Nano Banana)

Google Gemini hỗ trợ tạo ảnh native qua `generateContent` API. Tất cả hình ảnh được tạo đều có hình mờ SynthID.

| Mô hình | Model ID | Đặc điểm | imageSize |
|---------|----------|-----------|-----------|
| **Nano Banana Pro** ⭐ | `gemini-3-pro-image-preview` | Cao nhất, suy luận nâng cao (Thinking), văn bản độ trung thực cao | ✅ 1K/2K/4K |
| **Nano Banana 2** ✅ | `gemini-3.1-flash-image-preview` | Hiệu suất cao, nhiều tỷ lệ nhất, hỗ trợ Image Search | ✅ 512/1K/2K/4K |
| **Nano Banana** | `gemini-2.5-flash-image` | Nhanh nhất, chi phí thấp nhất | ❌ Chỉ 1K |

### Tính năng Gemini 3 Image
- **Đầu ra độ phân giải cao**: 512 (0.5K), 1K, 2K, 4K
- **Kết xuất văn bản nâng cao**: Cho infographic, menu, sơ đồ, marketing
- **Liên kết thực tế Google Tìm kiếm**: Tạo ảnh từ dữ liệu real-time
- **Chế độ Tư duy (Thinking)**: Suy luận qua các câu lệnh phức tạp
- **Tối đa 14 hình ảnh tham khảo**
- **Tỷ lệ khung hình mới**: 1:4, 4:1, 1:8, 8:1 (chỉ Gemini 3.1 Flash)

### Giới hạn hình ảnh tham khảo

| | Gemini 3.1 Flash Image | Gemini 3 Pro Image |
|---|---|---|
| Đối tượng độ trung thực cao | Tối đa 10 | Tối đa 6 |
| Nhân vật (tính nhất quán) | Tối đa 4 | Tối đa 5 |

---

## 2. Config bắt buộc cho `generateContent`

### ⚠️ QUAN TRỌNG: `imageConfig` HỖ TRỢ cho tất cả Gemini image models

```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-image-preview',
  contents: [{ role: 'user', parts: [
    { text: 'Your prompt here' },
    { inlineData: { mimeType: 'image/jpeg', data: 'BASE64_DATA' } }  // optional
  ]}],
  config: {
    responseModalities: ['IMAGE', 'TEXT'],  // BẮT BUỘC có cả TEXT
    temperature: 1.0,
    imageConfig: {
      aspectRatio: '3:4',   // ✅ Tỷ lệ khung hình — TẤT CẢ models
      imageSize: '2K',      // ✅ Kích thước — CHỈ Gemini 3.x (không dùng cho 2.5 Flash)
    },
  },
});
```

### Lấy ảnh từ response

```javascript
for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const base64Image = part.inlineData.data;
    const mimeType = part.inlineData.mimeType; // 'image/png'
  }
}
```

---

## 3. Tỷ lệ khung hình và kích thước

### Giá trị `imageSize`

| Giá trị | Ghi chú |
|---------|---------|
| `"512"` | 0.5K — chỉ Gemini 3.1 Flash Image |
| `"1K"` | Mặc định |
| `"2K"` | |
| `"4K"` | Độ phân giải cao nhất |

> **Quan trọng**: Phải dùng chữ "K" viết hoa (1K, 2K, 4K). Viết thường (1k) sẽ bị từ chối.

### Tỷ lệ khung hình hỗ trợ

```
"1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"
```

> Tỷ lệ `1:4`, `4:1`, `1:8`, `8:1` chỉ có ở Gemini 3.1 Flash Image Preview.

### Bảng kích thước — Gemini 3.1 Flash Image Preview

| Tỷ lệ | 512 | 1K | 2K | 4K |
|--------|-----|----|----|-----|
| 1:1 | 512x512 | 1024x1024 | 2048x2048 | 4096x4096 |
| 2:3 | 424x632 | 848x1264 | 1696x2528 | 3392x5056 |
| 3:2 | 632x424 | 1264x848 | 2528x1696 | 5056x3392 |
| 3:4 | 448x600 | 896x1200 | 1792x2400 | 3584x4800 |
| 4:3 | 600x448 | 1200x896 | 2400x1792 | 4800x3584 |
| 4:5 | 464x576 | 928x1152 | 1856x2304 | 3712x4608 |
| 5:4 | 576x464 | 1152x928 | 2304x1856 | 4608x3712 |
| 9:16 | 384x688 | 768x1376 | 1536x2752 | 3072x5504 |
| 16:9 | 688x384 | 1376x768 | 2752x1536 | 5504x3072 |
| 21:9 | 792x168 | 1584x672 | 3168x1344 | 6336x2688 |

### Bảng kích thước — Gemini 3 Pro Image Preview

| Tỷ lệ | 1K | 2K | 4K |
|--------|----|----|-----|
| 1:1 | 1024x1024 | 2048x2048 | 4096x4096 |
| 2:3 | 848x1264 | 1696x2528 | 3392x5056 |
| 3:2 | 1264x848 | 2528x1696 | 5056x3392 |
| 3:4 | 896x1200 | 1792x2400 | 3584x4800 |
| 4:3 | 1200x896 | 2400x1792 | 4800x3584 |
| 4:5 | 928x1152 | 1856x2304 | 3712x4608 |
| 5:4 | 1152x928 | 2304x1856 | 4608x3712 |
| 9:16 | 768x1376 | 1536x2752 | 3072x5504 |
| 16:9 | 1376x768 | 2752x1536 | 5504x3072 |
| 21:9 | 1584x672 | 3168x1344 | 6336x2688 |

### Bảng kích thước — Gemini 2.5 Flash Image

| Tỷ lệ | Độ phân giải |
|--------|-------------|
| 1:1 | 1024x1024 |
| 2:3 | 832x1248 |
| 3:2 | 1248x832 |
| 3:4 | 896x1200 |
| 4:3 | 1200x896 |
| 9:16 | 768x1376 |
| 16:9 | 1376x768 |

---

## 4. Các use case chính

### 4.1 Tạo ảnh từ văn bản (Text → Image)
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: 'Create a picture of a nano banana dish',
  config: {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio: '1:1', imageSize: '2K' },
  },
});
```

### 4.2 Chỉnh sửa ảnh (Text + Image → Image)
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [
    { text: 'Edit this image: change background to sunset' },
    { inlineData: { mimeType: 'image/png', data: base64Image } },
  ],
  config: {
    responseModalities: ['IMAGE', 'TEXT'],
    imageConfig: { aspectRatio: '3:4' },
  },
});
```

### 4.3 Nhiều hình ảnh tham khảo (tối đa 14)
```javascript
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-image-preview',
  contents: [
    { text: 'Create a group photo of these people' },
    { inlineData: { mimeType: 'image/png', data: person1Base64 } },
    { inlineData: { mimeType: 'image/png', data: person2Base64 } },
    // ... tối đa 14 ảnh
  ],
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: '5:4', imageSize: '2K' },
  },
});
```

### 4.4 Chỉnh sửa nhiều lượt (Multi-turn Chat)
```javascript
const chat = ai.chats.create({
  model: 'gemini-3.1-flash-image-preview',
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
  },
});

// Lượt 1
let response = await chat.sendMessage({ message: 'Create an infographic about photosynthesis' });

// Lượt 2 - với config khác
response = await chat.sendMessage({
  message: 'Update to Spanish',
  config: {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: { aspectRatio: '16:9', imageSize: '2K' },
  },
});
```

---

## 5. Chế độ Tư duy (Thinking) — Gemini 3 Image

Mô hình sử dụng quy trình suy luận cho câu lệnh phức tạp. **Bật mặc định, không thể tắt.**

### Cấp độ Tư duy (chỉ Gemini 3.1 Flash Image)

| Cấp độ | Mô tả |
|--------|-------|
| `"minimal"` | Mặc định. Độ trễ thấp nhất. |
| `"high"` | Chất lượng cao hơn, độ trễ cao hơn |

```javascript
config: {
  responseModalities: ['IMAGE'],
  thinkingConfig: { thinkingLevel: 'High', includeThoughts: true },
}
```

> Token tư duy sẽ được tính phí bất kể `includeThoughts` là `true` hay `false`.

---

## 6. Google Search Grounding

Tạo ảnh dựa trên thông tin real-time: thời tiết, cổ phiếu, sự kiện...

```javascript
config: {
  responseModalities: ['TEXT', 'IMAGE'],
  imageConfig: { aspectRatio: '16:9' },
  tools: [{ googleSearch: {} }],
}
```

### Image Search (chỉ Gemini 3.1 Flash Image)

```javascript
config: {
  responseModalities: ['IMAGE'],
  tools: [{ googleSearch: { searchTypes: { webSearch: {}, imageSearch: {} } } }],
}
```

---

## 7. Hướng dẫn Prompting

### Nguyên tắc cốt lõi
> **Mô tả cảnh, đừng chỉ liệt kê từ khoá.** Một đoạn văn mô tả sẽ luôn tạo ảnh tốt hơn.

### Mẫu — Cảnh chân thực (Photorealistic)
```
A photorealistic [shot type] of [subject], [action or expression], set in
[environment]. The scene is illuminated by [lighting description], creating
a [mood] atmosphere. Captured with a [camera/lens details], emphasizing
[key textures and details]. The image should be in a [aspect ratio] format.
```

### Mẫu — Hình minh hoạ cách điệu
```
A [style] sticker of a [subject], featuring [key characteristics] and a
[color palette]. The design should have [line style] and [shading style].
The background must be transparent.
```

---

## 8. Quy tắc quan trọng

### ✅ ĐÚNG
- `responseModalities: ['IMAGE', 'TEXT']` — Cần có cả TEXT
- `temperature: 1.0` — Recommended cho image generation
- `contents: [{ role: 'user', parts: [...] }]` — Array format bắt buộc
- `imageConfig: { aspectRatio: '3:4' }` — ✅ HỖ TRỢ cho tất cả Gemini image models
- `imageConfig: { imageSize: '2K' }` — ✅ HỖ TRỢ cho Gemini 3.x models
- `imageSize` phải viết hoa "K" (1K, 2K, 4K) — viết thường sẽ bị từ chối

### ❌ SAI
- `contents: { parts: [...] }` — Phải là **array**, không phải object
- `responseModalities: ['IMAGE']` only (thiếu TEXT có thể gây lỗi)
- Dùng `imageSize` với `gemini-2.5-flash-image` (không hỗ trợ)
- Dùng `imageSize: '1k'` — phải viết hoa: `'1K'`

---

## 9. Mapping frontend → API (FoodieSnap Pro)

Frontend cho user chọn: `1:1`, `3:4`, `4:3`, `9:16`, `16:9`

```javascript
// Trong callGeminiBanner / generateContent config:
imageConfig: {
  aspectRatio: settings.aspectRatio,  // '1:1', '3:4', '4:3', '9:16', '16:9'
  ...(model !== 'gemini-2.5-flash-image' && { imageSize: settings.quality }),
}
```

### Model hierarchy cho FoodieSnap Pro

```
gemini-3-pro-image-preview      ← Banner/commercial (BANNER_MODEL)
gemini-3.1-flash-image-preview  ← Food photography (nano-banana-2)
gemini-2.5-flash-image          ← Quick/cheap (nano-banana)
```

---

## 10. Tài liệu tham khảo

- [Gemini API Image Generation](https://ai.google.dev/gemini-api/docs/image-generation?hl=vi)
- [Gemini API Batch API](https://ai.google.dev/gemini-api/docs/batch-api?hl=vi)
- [Safety Settings](https://ai.google.dev/gemini-api/docs/safety-settings)
- [Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [SynthID Watermark](https://ai.google.dev/responsible/docs/safeguards/synthid)
- `nano-banana-image-generation.md` — Tài liệu chi tiết đầy đủ (Batch API, multi-turn, search grounding, thinking, prompting)
