import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Firebase Admin Initialization
let db;
let bucket;
try {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'foodiesnap-pro',
    storageBucket: 'foodiesnap-pro.firebasestorage.app'
  });
  db = getFirestore();
  bucket = getStorage().bucket();
  console.log('Firebase Admin initialized successfully (foodiesnap-pro).');
} catch (error) {
  console.error('Error initializing Firebase Admin. Please verify your GOOGLE_APPLICATION_CREDENTIALS.', error);
}

const app = express();
app.use(cors());
// Gỡ bỏ hạn chế payload để có thể truyền base64 ảnh chất lượng cao
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Thuật toán xoay vòng API Keys (API Rotation)
const apiKeys = (process.env.GEMINI_API_KEYS || '')
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

let currentKeyIndex = 0;

function getNextApiKey() {
  if (apiKeys.length === 0) return null;
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

// 3. API endpoint xử lý tạo ảnh và lưu Firebase
app.post('/api/generate', async (req, res) => {
  const { foodBase64, foodType, bgBase64, bgType, settings } = req.body;

  if (!foodBase64) {
    return res.status(400).json({ error: 'Thiếu dữ liệu ảnh đầu vào (foodBase64)' });
  }

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEYS trên server.' });
  }

  const prompt = `
    Tăng cường chất lượng ảnh món ăn chuyên nghiệp. 
    Chủ thể: Món ăn trong ảnh được tải lên.
    Phong cách: ${settings.style}.
    Ánh sáng: ${settings.lighting}.
    Góc máy: ${settings.angle}.
    Nền: ${settings.backgroundPrompt || (bgBase64 ? "Sử dụng ảnh nền được cung cấp và hòa trộn món ăn vào đó một cách tự nhiên, điều chỉnh phối cảnh và ánh sáng cho chân thực." : "Một bối cảnh nhà hàng chuyên nghiệp làm nổi bật món ăn.")}.
    
    Hướng dẫn:
    1. Tinh chỉnh vẻ ngoài của món ăn để trông hấp dẫn, tươi ngon và cao cấp hơn.
    2. Tăng cường màu sắc, kết cấu và vùng sáng.
    3. ${bgBase64 ? "Hòa trộn liền mạch món ăn vào nền được cung cấp. Điều chỉnh phối cảnh của món ăn để khớp với bề mặt của nền." : "Tạo một hình nền chân thực, chất lượng cao."}
    4. Đảm bảo ánh sáng chất lượng studio chuyên nghiệp và độ sâu trường ảnh.
    5. Xuất ra một bức ảnh món ăn thương mại, sắc nét.
  `;

  // Xử lý loại bỏ tiền tố `data:image/png;base64,` nếu có
  const cleanBase64 = (b64) => b64.includes(',') ? b64.split(',')[1] : b64;

  const parts = [
    { inlineData: { data: cleanBase64(foodBase64), mimeType: foodType || 'image/png' } },
    { text: prompt }
  ];

  if (bgBase64) {
    parts.push({ inlineData: { data: cleanBase64(bgBase64), mimeType: bgType || 'image/png' } });
  }

  const results = [];
  const maxRetries = Math.min(apiKeys.length * 2, 5); // Thử tối đa các keys hiện có 
  let lastError = null;

  try {
    for (let count = 0; count < settings.count; count++) {
      let success = false;
      let retries = 0;

      while (!success && retries < maxRetries) {
        const apiKey = getNextApiKey();
        console.log(`[API Rotation] Sử dụng key kết thúc bằng: ...${apiKey.slice(-4)} để tạo ảnh ${count + 1}/${settings.count}`);

        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio: settings.aspectRatio,
                imageSize: settings.imageSize
              }
            }
          });

          const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          if (imagePart?.inlineData?.data) {
            const returnedBase64 = imagePart.inlineData.data;
            const imgBuffer = Buffer.from(returnedBase64, 'base64');
            
            // Upload ảnh lên Firebase Storage với File Token để có public URL an toàn
            const fileId = `generations/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;
            const file = bucket.file(fileId);
            const token = crypto.randomUUID();
            
            await file.save(imgBuffer, {
              metadata: {
                contentType: 'image/png',
                metadata: { firebaseStorageDownloadTokens: token }
              }
            });

            // Tạo URL có dạng Firebase Client URL (Public)
            const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileId)}?alt=media&token=${token}`;

            results.push({
              id: crypto.randomUUID().substring(0, 8),
              url: imgUrl,
              timestamp: Date.now(),
              settings: { ...settings }
            });

            success = true;
          } else {
            throw new Error("Không có dữ liệu ảnh trả về từ Gemini API.");
          }
        } catch (err) {
          console.error(`Lỗi tạo ảnh với key ...${apiKey.slice(-4)}:`, err.message);
          lastError = err;
          // 429: Too Many Requests / Quota Exceeded. Thử lại với key tiếp theo.
          if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('exhausted') || err.message?.includes('429')) {
            retries++;
            console.log(`-> Rate limit / Quota exceeded, chuyển sang API Key khác. (Lần thử: ${retries})`);
          } else {
            // Các lỗi khác như Bad Request (400) thì ném lỗi ra luôn
            throw err;
          }
        }
      }

      if (!success) {
        throw new Error("Đã thử tất cả API keys và vòng lặp nhưng đều thất bại do Rate limit hoặc quá tải. Vui lòng thử lại sau.");
      }
    }

    // 4. Lưu metadata thống kê lượt tạo vào Firestore Database
    if (results.length > 0 && db) {
      try {
        await db.collection('generations').add({
          timestamp: Date.now(),
          count: results.length,
          settings,
          images: results.map(r => r.url)
        });
        console.log(`Đã lưu ${results.length} record(s) vào Firestore.`);
      } catch (e) {
        console.error('Lỗi khi lưu vào Firestore:', e);
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Lỗi Controller:", error);
    res.status(500).json({ error: error.message || "Lỗi máy chủ nội bộ." });
  }
});

// 5. Phục vụ Frontend Vite React sau khi build (áp dụng cho Firebase App Hosting)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Port dành cho Firebase App Hosting (sẽ tự động truyền PORT vào)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server frontend & backend đang chạy tại cổng http://localhost:${PORT}`);
});
