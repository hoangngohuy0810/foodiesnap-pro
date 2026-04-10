import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Firebase Admin Initialization
let db;
let bucket;
let adminAuth;
try {
  initializeApp({
    credential: applicationDefault(),
    projectId: 'foodiesnap-pro',
    storageBucket: 'foodiesnap-pro.firebasestorage.app'
  });
  db = getFirestore();
  bucket = getStorage().bucket();
  adminAuth = getAuth();
  console.log('Firebase Admin initialized successfully (foodiesnap-pro).');
} catch (error) {
  console.error('Error initializing Firebase Admin. Please verify your GOOGLE_APPLICATION_CREDENTIALS.', error);
}

const app = express();

// 2. Security: Helmet (HTTP security headers)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled to allow Firebase Storage images
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false, // Disabled to allow Firebase Auth cross-origin popups
}));

// 3. CORS – allow only explicitly listed origins
const ALLOWED_ORIGINS = [
  'https://anhnet.top',
  'https://www.anhnet.top',
  'https://foodiesnap-pro.web.app',
  'https://foodiesnap-pro.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Handle payload too large errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Dung lượng dữ liệu tải lên quá lớn (tối đa 25MB). Vui lòng giảm kích thước hoặc số lượng ảnh.' });
  }
  next(err);
});

// 4. Rate limiting
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu tạo ảnh. Vui lòng thử lại sau 15 phút.' },
  skip: (req) => !req.path.startsWith('/api/generate'),
});

const ordersLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu tạo đơn hàng. Vui lòng thử lại sau 15 phút.' },
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// 5. API Key Rotation
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

// 6. Credit Packages  (1.000đ = 2 credits)
const PACKAGES = {
  lite: { credits: 40, amount: 20000, label: 'Lite' },
  personal: { credits: 220, amount: 99000, label: 'Cá Nhân' },
  startup: { credits: 600, amount: 249000, label: 'Khởi Nghiệp' },
};

// 6b. Image Models & Credit Costs per image
// Tham chiếu: GEMINI_IMAGE_MODELS.md (nguồn: https://ai.google.dev/gemini-api/docs/image-generation)
const IMAGE_MODELS = {
  'nano-banana': {
    // Nano Banana: Gemini 2.5 Flash Image — speed & cost efficiency
    apiModel: 'gemini-2.5-flash-image',
    label: 'Nano Banana',
    creditCost: 1,
    qualityBoost: false,
  },
  'nano-banana-2': {
    // Nano Banana 2: Gemini 3.1 Flash Image Preview — balanced speed/quality (recommended)
    apiModel: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    creditCost: 2,
    qualityBoost: false,
  },
  'nano-banana-pro': {
    // Nano Banana Pro: Gemini 3 Pro Image Preview — highest quality, professional grade
    apiModel: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    creditCost: 4,
    qualityBoost: true,
  },
};
const DEFAULT_MODEL_ID = 'nano-banana-2';

// 7. Auth Middleware - Verify Firebase ID Token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập' });
  try {
    req.user = await adminAuth.verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

// 8. POST /api/generate - Tạo ảnh với kiểm tra credits
app.post('/api/generate', generateLimiter, verifyToken, async (req, res) => {
  const { foodBase64, foodType, bgBase64, bgType, settings, sideDishes } = req.body;

  // Input validation
  if (!foodBase64 || typeof foodBase64 !== 'string') {
    return res.status(400).json({ error: 'Thiếu dữ liệu ảnh đầu vào (foodBase64)' });
  }

  const count = parseInt(settings?.count) || 1;
  if (count < 1 || count > 4) {
    return res.status(400).json({ error: 'Số lượng ảnh phải từ 1 đến 4.' });
  }

  // Sanitize user-controlled text fields injected into AI prompt
  const sanitizePromptText = (text, maxLen = 300) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
  };
  if (settings?.backgroundPrompt) {
    settings.backgroundPrompt = sanitizePromptText(settings.backgroundPrompt);
  }

  if (apiKeys.length === 0) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEYS trên server.' });
  }

  // Kiểm tra credits (bỏ qua cho admin)
  const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';
  const isAdmin = req.user.email === ADMIN_EMAIL;

  const userRef = db.collection('users').doc(req.user.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    return res.status(403).json({ error: 'Tài khoản không tồn tại' });
  }

  // Resolve model
  const modelId = settings?.modelId && IMAGE_MODELS[settings.modelId]
    ? settings.modelId
    : DEFAULT_MODEL_ID;
  const modelConfig = IMAGE_MODELS[modelId];
  const creditCostPerImage = modelConfig.creditCost; // may be 0.5, 1, or 2
  const totalCreditCost = creditCostPerImage * count;

  console.log(`[Generate] model=${modelId} (${modelConfig.apiModel}), count=${count}, creditCost=${totalCreditCost}`);

  if (!isAdmin) {
    const currentCredits = userDoc.data()?.credits ?? 0;
    if (currentCredits < totalCreditCost) {
      return res.status(402).json({
        error: 'Không đủ credits để tạo ảnh',
        credits: currentCredits,
        required: totalCreditCost
      });
    }
    // Trừ credits ngay (optimistic deduction) - chỉ cho non-admin
    // Use integer deduction via increment; for fractional costs store as-is
    await userRef.update({
      credits: FieldValue.increment(-totalCreditCost)
    });
  }

  const isProModel = modelConfig.qualityBoost === true;

  // Build side dish prompt section
  const validSideDishes = Array.isArray(sideDishes)
    ? sideDishes
      .filter(d => d && typeof d.base64 === 'string')
      .map(d => ({ ...d, description: sanitizePromptText(d.description, 150) }))
    : [];

  const sideDishPromptSection = validSideDishes.length > 0
    ? `\n\n    Các món phụ đi kèm (${validSideDishes.length} món):\n` +
    validSideDishes.map((d, i) => {
      const desc = d.description?.trim();
      return `    - Món phụ ${i + 1}${desc ? `: ${desc}` : ''}`;
    }).join('\n') +
    `\n    HƯỚNG DẪN BỐ CỤC MÓN PHỤ (RẤT QUAN TRỌNG):
    - Đặt các món phụ trên ĐĨA/BÁT RIÊNG BÊN CẠNH món chính trên CÙNG MẶT BÀN, như cách bày bàn ăn thật trong nhà hàng.
    - Món phụ phải RÕ RÀNG, SẮC NÉT, dễ nhận diện — KHÔNG ĐƯỢC LÀM MỜ, KHÔNG ĐƯỢC biến thành nền hoặc bokeh.
    - Kích thước đĩa/bát món phụ NHỎ HƠN món chính khoảng 30-50%, đặt ở BÊN TRÁI hoặc BÊN PHẢI hoặc PHÍA TRƯỚC món chính, hơi chéo nhẹ để tạo chiều sâu.
    - Món chính vẫn ở TRUNG TÂM và NỔI BẬT NHẤT (lớn nhất, sắc nét nhất, được chiếu sáng tốt nhất).
    - Món phụ có thể hơi lệch khỏi điểm nét chính (depth of field nhẹ) nhưng vẫn phải ĐỦ RÕ để người xem nhận ra đó là món gì.
    - Tổng thể trông như một BỮA ĂN HOÀN CHỈNH được bày biện đẹp mắt, hài hòa trên bàn ăn — KHÔNG phải một món duy nhất với nền mờ.
    - Tinh chỉnh màu sắc, ánh sáng của món phụ cho ngon mắt, hấp dẫn, phù hợp với tông ảnh tổng thể.`
    : '';

  const bgAnalysisInstructions = bgBase64 ? `
    ⚠️ HƯỚNG DẪN XỬ LÝ NỀN BẮT BUỘC (ảnh nền được đính kèm):
    MỤC TIÊU CHÍNH: Tạo ảnh ẨM THỰC THƯƠNG MẠI — MÓN ĂN là NHÂN VẬT CHÍNH, nền chỉ là BỐI CẢNH HỖ TRỢ.
    
    BƯỚC 1 - PHÂN TÍCH NỀN: Xác định không gian (nhà hàng, quán ăn, bếp...), bề mặt (mặt bàn, quầy...), chất liệu, màu sắc chủ đạo, hướng ánh sáng, nhiệt độ màu.
    
    BƯỚC 2 - BIẾN ĐỔI GÓC NHÌN CỦA NỀN (QUAN TRỌNG NHẤT):
    KHÔNG giữ nguyên ảnh nền gốc. Hãy TÁI TẠO LẠI không gian nền từ góc nhìn CẬN BÀN ĂN:
    - Zoom sát vào bề mặt đặt món (mặt bàn/quầy), góc chụp khoảng 30-45° từ trên xuống.
    - Mặt bàn/bề mặt chiếm khoảng 60-70% diện tích ảnh, phần nền xa (ghế, tường, đèn...) chỉ mờ nhẹ phía sau làm bối cảnh.
    - Giữ nguyên PHONG CÁCH & BẦU KHÔNG KHÍ của nền gốc (chất liệu bàn, tông màu, kiểu đèn, decor...) nhưng THAY ĐỔI góc nhìn để camera gần mặt bàn hơn.
    
    BƯỚC 3 - ĐẶT MÓN ĂN LÀM TRUNG TÂM:
    - Món ăn nằm ở TRUNG TÂM khung hình, chiếm khoảng 40-55% diện tích ảnh — đủ lớn để thấy rõ chi tiết hấp dẫn.
    - Đĩa/bát món ăn đặt trên bề mặt bàn với phối cảnh đúng, có bóng đổ tự nhiên.
    - Tỷ lệ món ăn phải HỢP LÝ so với mặt bàn (không khổng lồ, không quá nhỏ) — như khi bạn ngồi ở bàn và chụp ảnh món ăn trước mặt.
    
    BƯỚC 4 - HÒA TRỘN ÁNH SÁNG & MÀU SẮC:
    - Ánh sáng, bóng đổ, nhiệt độ màu trên món ăn PHẢI khớp với môi trường nền.
    - Nếu nền có ánh đèn ấm → món ăn cũng phải có tone ấm tương ứng.
    - Thêm bokeh tự nhiên cho phần nền phía xa để tạo độ sâu và tập trung vào món ăn.
    
    TÓM TẮT: Tưởng tượng bạn đang NGỒI TẠI BÀN trong không gian đó và CHỤP CẬN món ăn trước mặt bằng camera chuyên nghiệp. Nền phía sau mờ đẹp, món ăn sắc nét nổi bật ở giữa.` : '';

  const prompt = isProModel
    ? `
    Tạo ảnh món ăn thương mại chất lượng siêu cao, đạt chuẩn tạp chí ẩm thực cao cấp.
    Chủ thể: Món ăn trong ảnh được tải lên.
    Tỉ lệ khung hình (Aspect Ratio): BẮT BUỘC tạo ảnh có tỉ lệ ${settings.aspectRatio || '1:1'}.
    Phong cách: ${settings.style} - thực hiện với độ chính xác và chi tiết tối đa.
    Ánh sáng: ${settings.lighting} - ánh sáng nhiều lớp, tạo chiều sâu và kịch tính.
    Góc máy: ${settings.angle} - bố cục hoàn hảo, cân bằng thị giác tuyệt đối.
    Nền: ${settings.backgroundPrompt || (bgBase64 ? "Lấy cảm hứng từ ảnh nền đính kèm. TÁI TẠO không gian nền từ góc nhìn cận bàn ăn, zoom sát mặt bàn, để món ăn nổi bật ở trung tâm như ảnh chụp ẩm thực chuyên nghiệp." : "Bối cảnh sang trọng, chi tiết tinh tế, phù hợp với nhà hàng 5 sao.")}.
${bgAnalysisInstructions}
${sideDishPromptSection}
    Yêu cầu chất lượng PREMIUM:
    1. Tái tạo từng chi tiết kết cấu của món ăn: độ giòn, độ mịn, độ bóng, màu sắc tươi sáng hoàn hảo.
    2. Ánh sáng studio cao cấp với highlight và shadow tinh tế, tạo cảm giác 3D.
    3. ${bgBase64 ? "QUAN TRỌNG: TÁI TẠO lại không gian nền từ góc chụp CẬN mặt bàn (30-45°). Giữ nguyên phong cách, chất liệu, tông màu, bầu không khí của nền gốc nhưng BIẾN ĐỔI góc nhìn để camera ở gần mặt bàn. Món ăn chiếm 40-55% khung hình ở trung tâm, nền phía sau mờ bokeh đẹp. Ánh sáng, bóng đổ, nhiệt độ màu trên món ăn khớp hoàn toàn với không gian." : "Nền bokeh mượt mà, gradient tự nhiên, tạo sự tương phản hoàn hảo với món ăn."}
    4. Độ sâu trường ảnh chọn lọc, làm nổi bật điểm nhấn của món ăn.
    5. Màu sắc sống động, bão hòa hợp lý, trông ngon miệng và hấp dẫn tột đỉnh.
    6. Chất lượng ảnh đầu ra cực nét, không noise, đạt chuẩn in ấn thương mại.
    `
    : `
    Tăng cường chất lượng ảnh món ăn chuyên nghiệp.
    Chủ thể: Món ăn trong ảnh được tải lên.
    Tỉ lệ khung hình (Aspect Ratio): BẮT BUỘC tạo ảnh có tỉ lệ ${settings.aspectRatio || '1:1'}.
    Phong cách: ${settings.style}.
    Ánh sáng: ${settings.lighting}.
    Góc máy: ${settings.angle}.
    Nền: ${settings.backgroundPrompt || (bgBase64 ? "Lấy cảm hứng từ ảnh nền đính kèm. TÁI TẠO không gian nền từ góc nhìn cận bàn ăn, zoom sát mặt bàn, để món ăn nổi bật ở trung tâm như ảnh chụp ẩm thực chuyên nghiệp." : "Một bối cảnh nhà hàng chuyên nghiệp làm nổi bật món ăn.")}.
${bgAnalysisInstructions}
${sideDishPromptSection}
    Hướng dẫn:
    1. Tinh chỉnh vẻ ngoài của món ăn để trông hấp dẫn, tươi ngon và cao cấp hơn.
    2. Tăng cường màu sắc, kết cấu và vùng sáng.
    3. ${bgBase64 ? "QUAN TRỌNG: TÁI TẠO lại không gian nền từ góc chụp CẬN mặt bàn (30-45°). Giữ nguyên phong cách, chất liệu, tông màu của nền gốc nhưng BIẾN ĐỔI góc nhìn để camera ở gần mặt bàn. Món ăn chiếm 40-55% khung hình ở trung tâm, nền phía sau mờ bokeh đẹp. Ánh sáng và nhiệt độ màu trên món ăn khớp với không gian." : "Tạo một hình nền chân thực, chất lượng cao."}
    4. Đảm bảo ánh sáng chất lượng studio chuyên nghiệp và độ sâu trường ảnh.
    5. Xuất ra một bức ảnh món ăn thương mại, sắc nét.
    `;

  const cleanBase64 = (b64) => b64.includes(',') ? b64.split(',')[1] : b64;

  const parts = [
    { inlineData: { data: cleanBase64(foodBase64), mimeType: foodType || 'image/png' } },
    { text: prompt }
  ];

  if (bgBase64) {
    parts.push({ inlineData: { data: cleanBase64(bgBase64), mimeType: bgType || 'image/png' } });
  }

  // Append side dish images after background
  for (const dish of validSideDishes) {
    parts.push({ inlineData: { data: cleanBase64(dish.base64), mimeType: dish.mimeType || 'image/png' } });
  }

  const results = [];
  const maxRetries = Math.min(apiKeys.length * 2, 5);
  let lastError = null;

  try {
    for (let count_i = 0; count_i < count; count_i++) {
      let success = false;
      let retries = 0;

      while (!success && retries < maxRetries) {
        const apiKey = getNextApiKey();
        console.log(`[API Rotation] Sử dụng key kết thúc bằng: ...${apiKey.slice(-4)} để tạo ảnh ${count_i + 1}/${count}`);

        try {
          const ai = new GoogleGenAI({ apiKey });
          // Tham chiếu: GEMINI_IMAGE_MODELS.md — imageConfig hỗ trợ aspectRatio cho tất cả Gemini image models
          const isGemini3x = modelConfig.apiModel.includes('gemini-3');
          // Map '512px' (frontend type) → '512' (API format). imageSize chỉ dùng cho Gemini 3.x
          const rawImageSize = settings?.imageSize;
          const apiImageSize = rawImageSize === '512px' ? '512' : rawImageSize;
          const response = await ai.models.generateContent({
            model: modelConfig.apiModel,
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['IMAGE', 'TEXT'],
              temperature: 1.0,
              imageConfig: {
                aspectRatio: settings?.aspectRatio || '1:1',
                ...(isGemini3x && apiImageSize ? { imageSize: apiImageSize } : {}),
              },
            },
          });

          const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
          if (imagePart?.inlineData?.data) {
            const returnedBase64 = imagePart.inlineData.data;
            const imgBuffer = Buffer.from(returnedBase64, 'base64');

            const fileId = `users/${req.user.uid}/generations/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;

            const file = bucket.file(fileId);
            const token = crypto.randomUUID();

            await file.save(imgBuffer, {
              metadata: {
                contentType: 'image/png',
                metadata: { firebaseStorageDownloadTokens: token }
              }
            });

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
          console.error(`  -> status: ${err.status}, code: ${err.code}`);
          console.error(`  -> full error:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));
          lastError = err;
          if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('exhausted') || err.message?.includes('429')) {
            retries++;
            console.log(`-> Rate limit / Quota exceeded, chuyển sang API Key khác. (Lần thử: ${retries})`);
          } else {
            throw err;
          }
        }
      }

      if (!success) {
        throw new Error("Đã thử tất cả API keys và vòng lặp nhưng đều thất bại do Rate limit hoặc quá tải. Vui lòng thử lại sau.");
      }
    }

    // Lưu metadata và cập nhật totalGenerated
    if (results.length > 0 && db) {
      try {
        await Promise.all([
          db.collection('generations').add({
            userId: req.user.uid,
            timestamp: Date.now(),
            count: results.length,
            settings,
            images: results.map(r => r.url)
          }),
          userRef.update({
            totalGenerated: FieldValue.increment(results.length)
          })
        ]);
        console.log(`Đã lưu ${results.length} record(s) vào Firestore.`);
      } catch (e) {
        console.error('Lỗi khi lưu vào Firestore:', e);
      }
    }

    // Hoàn trả credits nếu có ảnh thất bại (partial success) - chỉ cho non-admin
    const failedCount = count - results.length;
    const refundCredits = failedCount * creditCostPerImage;
    if (!isAdmin && failedCount > 0) {
      try {
        await userRef.update({ credits: FieldValue.increment(refundCredits) });
        console.log(`[Refund] Đã hoàn ${refundCredits} credits cho user ${req.user.uid} (${failedCount} ảnh thất bại × ${creditCostPerImage} cr)`);
      } catch (e) {
        console.error('Lỗi khi hoàn trả credits:', e);
      }
    }

    res.json({
      results,
      refunded: (!isAdmin && failedCount > 0) ? refundCredits : 0,
    });
  } catch (error) {
    // Hoàn trả toàn bộ credits còn lại nếu generate thất bại - chỉ cho non-admin
    const failedOnError = count - results.length;
    const refundOnError = failedOnError * creditCostPerImage;
    try {
      if (!isAdmin && failedOnError > 0) {
        await userRef.update({ credits: FieldValue.increment(refundOnError) });
        console.log(`[Refund] Đã hoàn ${refundOnError} credits cho user ${req.user.uid} do lỗi`);
      }
    } catch (e) {
      console.error('Lỗi khi hoàn trả credits:', e);
    }
    console.error("Lỗi Controller:", error);
    res.status(500).json({
      error: error.message || "Lỗi máy chủ nội bộ.",
      refunded: (!isAdmin && failedOnError > 0) ? refundOnError : 0,
    });
  }
});

// 9. POST /api/orders - Tạo đơn hàng mua credits
app.post('/api/orders', ordersLimiter, verifyToken, async (req, res) => {
  const { packageId } = req.body;

  // Validate packageId
  if (!packageId || !Object.keys(PACKAGES).includes(packageId)) {
    return res.status(400).json({ error: 'Gói không hợp lệ. Chọn: starter, pro, ultra.' });
  }

  const pkg = PACKAGES[packageId];

  // orderCode: "FS" + 8 ký tự hex in hoa = "FSABCD1234" (10 ký tự, ngắn gọn để nhập vào mô tả CK)
  const orderCode = 'FS' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const orderRef = await db.collection('orders').add({
    userId: req.user.uid,
    packageId,
    orderCode,
    amount: pkg.amount,
    credits: pkg.credits,
    status: 'pending',
    createdAt: Date.now(),
  });

  res.json({
    orderId: orderRef.id,
    orderCode,
    amount: pkg.amount,
    credits: pkg.credits,
    label: pkg.label,
    bankAccount: process.env.SEPAY_BANK_ACCOUNT,
    bankName: process.env.SEPAY_BANK_NAME,
  });
});

// 10. GET /api/orders/:orderId - Kiểm tra trạng thái đơn hàng (dùng cho polling)
app.get('/api/orders/:orderId', verifyToken, async (req, res) => {
  const orderDoc = await db.collection('orders').doc(req.params.orderId).get();
  if (!orderDoc.exists) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  }
  const order = orderDoc.data();
  if (order.userId !== req.user.uid) {
    return res.status(403).json({ error: 'Không có quyền truy cập đơn hàng này' });
  }
  res.json({ status: order.status, credits: order.credits, paidAt: order.paidAt });
});

// 11. POST /api/webhook/sepay - Nhận webhook từ Sepay khi có giao dịch vào
app.post('/api/webhook/sepay', webhookLimiter, async (req, res) => {
  // Lưu log để dễ debug
  try {
    await db.collection('webhook_logs').add({
      timestamp: Date.now(),
      body: req.body,
      headers: req.headers
    });
  } catch (e) {
    console.error('Lỗi lưu webhook_logs', e);
  }

  // Xác thực API Key từ Sepay
  const authHeader = req.headers['authorization'] ?? '';
  const providedKey = authHeader.replace(/^(apikey|bearer)\s+/i, '').trim();
  if (!providedKey || providedKey !== process.env.SEPAY_WEBHOOK_API_KEY) {
    console.warn('[Webhook] API key không hợp lệ, từ chối request.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Trích xuất payload an toàn (cover các trường hợp data bị bọc trong array hoặc object data)
  let payload = req.body;
  if (Array.isArray(payload)) payload = payload[0];
  if (payload && payload.data) {
    payload = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  }

  const id = payload?.id;
  const transferAmount = payload?.transferAmount;
  const transferType = payload?.transferType;
  const content = payload?.content || payload?.transferContent || payload?.description || '';

  console.log(`[Webhook] Nhận giao dịch id=${id}, type=${transferType}, amount=${transferAmount}, content="${content}"`);

  // Chỉ xử lý giao dịch tiền vào (hoặc nếu transferType không có sẵn thì mặc định cho qua để check content)
  if (transferType && transferType !== 'in') {
    return res.json({ success: true });
  }

  if (!id) {
    console.warn('[Webhook] Không tìm thấy ID giao dịch trong payload');
  }

  // Chống xử lý trùng lặp (dedup) bằng transaction ID của Sepay
  const txRef = db.collection('sepay_transactions').doc(String(id || Date.now()));
  const txDoc = await txRef.get();
  if (txDoc.exists) {
    console.log(`[Webhook] Transaction ${id} đã được xử lý rồi, bỏ qua.`);
    return res.json({ success: true });
  }

  // Trích xuất mã đơn hàng từ nội dung chuyển khoản (VD: "Thanh toan FSABCD1234 foodiesnap")
  const match = (content ?? '').match(/FS[A-F0-9]{8}/i);
  if (!match) {
    console.log(`[Webhook] Không tìm thấy mã đơn hàng trong nội dung: "${content}"`);
    return res.json({ success: true });
  }
  const orderCode = match[0].toUpperCase();
  console.log(`[Webhook] Tìm thấy mã đơn: ${orderCode}`);

  // Tìm đơn hàng đang chờ thanh toán
  const ordersSnap = await db.collection('orders')
    .where('orderCode', '==', orderCode)
    .where('status', '==', 'pending')
    .limit(1)
    .get();

  if (ordersSnap.empty) {
    console.log(`[Webhook] Không tìm thấy đơn hàng pending với mã: ${orderCode}`);
    return res.json({ success: true });
  }

  const orderDoc = ordersSnap.docs[0];
  const order = orderDoc.data();

  // Kiểm tra số tiền chuyển khoản >= số tiền đơn hàng
  if (Number(transferAmount) < order.amount) {
    console.warn(`[Webhook] Số tiền không đủ: nhận ${transferAmount}, cần ${order.amount}`);
    return res.json({ success: true });
  }

  // Atomic batch: cộng credits + đánh dấu order paid + lưu dedup record
  const batch = db.batch();
  batch.update(orderDoc.ref, { status: 'paid', paidAt: Date.now() });
  batch.update(db.collection('users').doc(order.userId), {
    credits: FieldValue.increment(order.credits),
  });
  batch.set(txRef, {
    id: String(id),
    orderId: orderDoc.id,
    orderCode,
    amount: Number(transferAmount),
    processedAt: Date.now(),
  });
  await batch.commit();

  console.log(`[Webhook] Đã cộng ${order.credits} credits cho user ${order.userId}. Đơn hàng ${orderDoc.id} đã thanh toán.`);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12. BANNER GENERATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// Banner sử dụng model cao nhất: Nano Banana Pro (Gemini 3 Pro Image Preview)
// Tham chiếu: GEMINI_IMAGE_MODELS.md (nguồn: https://ai.google.dev/gemini-api/docs/image-generation)
const BANNER_MODEL = 'gemini-3-pro-image-preview';
const BANNER_BASE_CREDIT_COST = 2;   // base credits per banner at 1K
const EDIT_CREDIT_COST = 1;          // credits per edit
const BANNER_QUALITY_MULTIPLIER = { '1K': 1, '2K': 2, '4K': 3 };

const BANNER_STYLES = [
  'Sao chép chính xác',
  'Hiện đại & Tối giản',
  'Nổi bật & Sống động',
  'Sang trọng & Thanh lịch',
  'Sáng tạo phá cách',
];

const TYPO_PROMPT_MAP = {
  'Tự động': 'Analyze the visual context and choose the most suitable font style automatically.',
  'Làm đẹp, thời trang, mềm mại': 'TYPOGRAPHY STYLE: Elegant, Sophisticated, and Soft. Use high-contrast Serif fonts (like Didot, Bodoni) or thin, graceful Sans-Serif. The text should feel luxurious, feminine, and editorial fashion magazine style.',
  'Cách điệu, dễ thương': 'TYPOGRAPHY STYLE: Stylized, Cute, and Playful. Use Handwritten, Script, or Rounded Sans-Serif fonts. Incorporate organic curves, decorative swashes, or doodle-like elements.',
  'Tươi trẻ, màu sắc': 'TYPOGRAPHY STYLE: Youthful, Vibrant, and Colorful. Use Bold Bubble fonts, 3D text effects, or Pop-art inspired type. Dynamic, high-energy, potentially using gradients or multiple bright colors.',
  'Chuyên nghiệp, hiện đại': 'TYPOGRAPHY STYLE: Professional, Corporate, and Clean. Use Geometric Sans-Serif fonts (like Helvetica, Futura, Roboto). Keep lines straight, balanced, and minimalist.',
  'Hoài cổ (Retro/Vintage)': 'TYPOGRAPHY STYLE: Retro, Vintage, and Nostalgic. Use Cooper Black, slab serifs, or textured fonts reminiscent of the 70s, 80s, or 90s.',
  'Mạnh mẽ, nổi bật': 'TYPOGRAPHY STYLE: Bold, Impactful, and Loud. Use Heavy/Black weight Sans-Serif fonts, All-Caps. High contrast against the background. Poster-style typography.',
};

const cleanBase64Banner = (b64) => b64.replace(/^data:(image\/\w+|application\/pdf);base64,/, '');
const getMimeTypeBanner = (b64) => {
  const match = b64.match(/^data:(.*);base64,/);
  return match?.[1] || 'image/jpeg';
};

// Helper: call Gemini with retry/key rotation for banner
// Tham chiếu: GEMINI_IMAGE_MODELS.md — imageConfig hỗ trợ aspectRatio + imageSize cho Gemini 3.x
async function callGeminiBanner(parts, aspectRatio, quality) {
  const maxRetries = Math.min(apiKeys.length * 2, 5);
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextApiKey();
    if (!apiKey) throw new Error('Chưa cấu hình GEMINI_API_KEYS trên server.');

    try {
      const ai = new GoogleGenAI({ apiKey });
      // Bật Thinking "High" cho banner chất lượng 2K+ để suy luận tốt hơn với prompt phức tạp.
      // Tham chiếu: GEMINI_IMAGE_MODELS.md §5 — Thinking mode chỉ cho Gemini 3.1 Flash Image.
      // Gemini 3 Pro Image (BANNER_MODEL) suy luận tự động, không cần cấu hình thêm.
      const useHighThinking = quality === '2K' || quality === '4K';
      const response = await ai.models.generateContent({
        model: BANNER_MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1.0,
          imageConfig: {
            aspectRatio: aspectRatio || '3:4',
            ...(quality && quality !== '512' ? { imageSize: quality } : {}),
          },
          ...(useHighThinking ? { thinkingConfig: { thinkingLevel: 'High' } } : {}),
        },
      });

      console.log(`[Banner] Response candidates count: ${response.candidates?.length}`);

      const candidates = response.candidates;
      if (candidates && candidates.length > 0) {
        const responseParts = candidates[0].content?.parts || [];
        console.log(`[Banner] Response parts count: ${responseParts.length}, types: ${responseParts.map(p => p.inlineData ? 'image' : 'text').join(', ')}`);

        for (const part of responseParts) {
          if (part.inlineData && part.inlineData.data) {
            console.log(`[Banner] Found image data, mimeType: ${part.inlineData.mimeType}`);
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
        }

        // Log finish reason if no image found
        const finishReason = candidates[0].finishReason;
        const safetyRatings = candidates[0].safetyRatings;
        console.error(`[Banner] No image in response. finishReason: ${finishReason}`);
        console.error(`[Banner] Safety ratings: ${JSON.stringify(safetyRatings)}`);

        if (finishReason === 'IMAGE_SAFETY' || finishReason === 'SAFETY') {
          throw new Error('Ảnh bị từ chối do chính sách nội dung của Gemini. Vui lòng thử lại với ảnh khác.');
        }
      }

      // Check promptFeedback for blocks
      if (response.promptFeedback) {
        console.error(`[Banner] Prompt feedback: ${JSON.stringify(response.promptFeedback)}`);
        if (response.promptFeedback.blockReason) {
          throw new Error(`Yêu cầu bị chặn: ${response.promptFeedback.blockReason}`);
        }
      }

      throw new Error('Không có dữ liệu ảnh trả về từ Gemini API.');
    } catch (err) {
      lastError = err;
      console.error(`[Banner] Lỗi với key ...${apiKey.slice(-4)}: ${err.message}`);
      console.error(`  -> status: ${err.status}, code: ${err.code}`);
      if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('429')) {
        continue; // Try next key
      }
      throw err;
    }
  }
  throw lastError || new Error('Đã thử tất cả API keys nhưng đều thất bại.');
}

// 12a. POST /api/generate/banner — Clone mode
app.post('/api/generate/banner', generateLimiter, verifyToken, async (req, res) => {
  const { referenceImages, productImages, settings } = req.body;
  let { brandDescription, promoInfo, userPrompt } = req.body;

  if (!referenceImages?.length || !productImages?.length) {
    return res.status(400).json({ error: 'Thiếu ảnh tham khảo hoặc ảnh sản phẩm.' });
  }

  // Sanitize user-controlled text injected into AI prompt
  const sanitizePromptText = (text, maxLen = 300) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
  };
  brandDescription = sanitizePromptText(brandDescription, 300);
  promoInfo = sanitizePromptText(promoInfo, 200);
  userPrompt = sanitizePromptText(userPrompt, 300);

  const quantity = Math.min(Math.max(parseInt(String(settings?.quantity)) || 1, 1), 5);
  const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';
  const isAdmin = req.user.email === ADMIN_EMAIL;
  const userRef = db.collection('users').doc(req.user.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(403).json({ error: 'Tài khoản không tồn tại' });

  const qualityMul = BANNER_QUALITY_MULTIPLIER[settings?.quality] || 1;
  const creditPerBanner = BANNER_BASE_CREDIT_COST * qualityMul;
  const totalCost = creditPerBanner * quantity;

  if (!isAdmin) {
    const currentCredits = userDoc.data()?.credits ?? 0;
    if (currentCredits < totalCost) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        creditsAvailable: currentCredits,
        creditsRequired: totalCost,
        message: `Bạn cần ${totalCost} credits để tạo ${quantity} banner. Hiện có ${currentCredits} credit.`,
      });
    }
    await userRef.update({ credits: FieldValue.increment(-totalCost) });
  }

  const typoInstruction = TYPO_PROMPT_MAP[settings?.typography] || TYPO_PROMPT_MAP['Tự động'];

  try {
    const tasks = Array.from({ length: quantity }, (_, i) => {
      const style = BANNER_STYLES[i % BANNER_STYLES.length];

      const promptText = `
    ROLE: expert AI Graphic Designer and Copywriter.
    TASK: Create a high-converting, visually stunning advertising banner.

    CANVAS SPECIFICATION — MANDATORY: Output image MUST have EXACTLY ${settings?.aspectRatio || '3:4'} aspect ratio (width:height). Design every element to fit this canvas precisely.

    INPUTS:
    1. Reference Images (First ${referenceImages.length} images): These define the visual style, layout composition, color grading, and general vibe.
    2. Product Assets (Subsequent images): These are the hero objects to feature.

    CORE DIRECTIVES:
    1. STYLE ADAPTATION: Analyze the "vibe" of the reference images. Create a COMPLETELY NEW composition. Steal the "look and feel", not pixels. Ensure Product Assets are naturally integrated (match lighting, shadows, reflection, perspective).
    2. INTELLIGENT COPYWRITING & TYPOGRAPHY:
       - ${typoInstruction}
       - ${promoInfo || brandDescription ? 'ADAPTIVE' : 'GENERATIVE'} text strategy.
       - ${promoInfo ? `Use promo info: "${promoInfo}"` : ''}
       - ${brandDescription ? `Brand context: "${brandDescription}"` : ''}
       - Select only the most impactful keywords. Do not clutter. Ensure legibility and visual hierarchy.
    3. COMPOSITION: Prioritize visual aesthetics. Negative space is key. Design Style: "${style}".
       ${userPrompt ? `- User's Custom Wishlist: ${userPrompt}` : ''}

    OUTPUT: A single, high-quality image at the exact ${settings?.aspectRatio || '3:4'} aspect ratio.
      `;

      const parts = [{ text: promptText }];
      referenceImages.forEach((ref) => {
        parts.push({ inlineData: { mimeType: getMimeTypeBanner(ref), data: cleanBase64Banner(ref) } });
      });
      productImages.forEach((prod) => {
        parts.push({ inlineData: { mimeType: getMimeTypeBanner(prod), data: cleanBase64Banner(prod) } });
      });

      return callGeminiBanner(parts, settings?.aspectRatio, settings?.quality)
        .then((base64) => ({ base64, style, success: true }))
        .catch((err) => ({ error: err.message, style, success: false }));
    });

    const results = await Promise.all(tasks);
    const successful = results.filter(r => r.success);
    const failedCount = results.filter(r => !r.success).length;

    // Refund failed
    if (!isAdmin && failedCount > 0) {
      const refund = failedCount * creditPerBanner;
      await userRef.update({ credits: FieldValue.increment(refund) });
      console.log(`[Banner Refund] Hoàn ${refund} credits cho ${req.user.uid}`);
    }

    // Save successful banners to Firebase Storage + Firestore
    const savedResults = [];
    for (const r of successful) {
      try {
        const rawB64 = r.base64.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(rawB64, 'base64');
        const fileId = `users/${req.user.uid}/banners/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;
        const file = bucket.file(fileId);
        const storageToken = crypto.randomUUID();
        await file.save(imgBuffer, {
          metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: storageToken } }
        });
        const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileId)}?alt=media&token=${storageToken}`;
        savedResults.push({ url: imgUrl, style: r.style, base64: r.base64 });
      } catch (e) {
        console.error('[Banner] Error saving to storage:', e);
        savedResults.push({ url: r.base64, style: r.style, base64: r.base64 }); // fallback to base64
      }
    }

    // Save metadata to Firestore generations collection
    if (savedResults.length > 0 && db) {
      try {
        await Promise.all([
          db.collection('generations').add({
            userId: req.user.uid,
            timestamp: Date.now(),
            count: savedResults.length,
            type: 'banner',
            bannerTypography: settings?.typography || 'Tự động',
            settings: {
              aspectRatio: settings?.aspectRatio || '3:4',
              quality: settings?.quality || '1K',
              mode: settings?.mode || 'clone',
            },
            styles: savedResults.map(r => r.style),
            images: savedResults.map(r => r.url),
          }),
          userRef.update({ totalGenerated: FieldValue.increment(savedResults.length) }),
        ]);
      } catch (e) { console.error('[Banner] Firestore save error:', e); }
    }

    console.log(`[Banner] Tạo ${successful.length}/${quantity} banner thành công.`);
    res.json({
      images: savedResults.map(r => ({ base64: r.base64, style: r.style, url: r.url })),
      creditsUsed: (quantity - failedCount) * creditPerBanner,
      ...(failedCount > 0 && { warning: `${failedCount}/${quantity} ảnh bị lỗi và đã được hoàn credit.` }),
    });
  } catch (err) {
    // Full refund on catastrophic error
    if (!isAdmin) {
      try { await userRef.update({ credits: FieldValue.increment(totalCost) }); } catch { }
    }
    console.error('[Banner] Error:', err);
    res.status(500).json({ error: err.message || 'Lỗi server khi tạo banner.' });
  }
});

// 12b. POST /api/generate/design — Design mode
app.post('/api/generate/design', generateLimiter, verifyToken, async (req, res) => {
  const { referenceImages, infoFiles, brandDescription, promoInfo, userPrompt, settings } = req.body;

  if (!referenceImages?.length || !infoFiles?.length) {
    return res.status(400).json({ error: 'Thiếu ảnh tham khảo hoặc file thông tin.' });
  }

  const quantity = Math.min(Math.max(parseInt(String(settings?.quantity)) || 1, 1), 5);
  const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';
  const isAdmin = req.user.email === ADMIN_EMAIL;
  const userRef = db.collection('users').doc(req.user.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(403).json({ error: 'Tài khoản không tồn tại' });

  const qualityMulDesign = BANNER_QUALITY_MULTIPLIER[settings?.quality] || 1;
  const creditPerDesign = BANNER_BASE_CREDIT_COST * qualityMulDesign;
  const totalCost = creditPerDesign * quantity;

  if (!isAdmin) {
    const currentCredits = userDoc.data()?.credits ?? 0;
    if (currentCredits < totalCost) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        creditsAvailable: currentCredits,
        creditsRequired: totalCost,
        message: `Bạn cần ${totalCost} credits để tạo ${quantity} banner. Hiện có ${currentCredits} credit.`,
      });
    }
    await userRef.update({ credits: FieldValue.increment(-totalCost) });
  }

  const typoInstruction = TYPO_PROMPT_MAP[settings?.typography] || TYPO_PROMPT_MAP['Tự động'];

  try {
    const tasks = Array.from({ length: quantity }, (_, i) => {
      const style = BANNER_STYLES[i % BANNER_STYLES.length];

      const promptText = `
    ROLE: Expert AI Graphic Designer.
    TASK: Design a professional advertising banner by extracting content from an Information File and applying a specific Visual Style.

    CANVAS SPECIFICATION — MANDATORY: Output image MUST have EXACTLY ${settings?.aspectRatio || '3:4'} aspect ratio (width:height). Design every element to fit this canvas precisely.

    INPUTS:
    1. Reference Images (First ${referenceImages.length} items): DEFINES THE VISUAL STYLE (Color palette, layout mood, font style, vibe).
    2. Information Source (Subsequent items): Contains the RAW CONTENT (Program details, dates, prices, logos, or main subject).

    CORE DIRECTIVES:
    1. CONTENT EXTRACTION: READ the attached Information File thoroughly. Extract key details: Event Names, Dates, Prices, Headlines, Call to Actions. Combine with: "${brandDescription}" and "${promoInfo}". Prioritize the most important information.
    2. VISUAL EXECUTION: IGNORE the *content* of the reference images, but STEAL their *style*. Apply the reference's color grading, lighting, and composition. Design Style: "${style}".
    3. TYPOGRAPHY & LAYOUT:
       - ${typoInstruction}
       - Ensure text is legible. Create a balanced composition.
       ${userPrompt ? `- User's Custom Wishlist: ${userPrompt}` : ''}

    OUTPUT: A single, high-quality banner image at the exact ${settings?.aspectRatio || '3:4'} aspect ratio.
      `;

      const parts = [{ text: promptText }];
      referenceImages.forEach((ref) => {
        parts.push({ inlineData: { mimeType: getMimeTypeBanner(ref), data: cleanBase64Banner(ref) } });
      });
      infoFiles.forEach((file) => {
        parts.push({ inlineData: { mimeType: getMimeTypeBanner(file), data: cleanBase64Banner(file) } });
      });

      return callGeminiBanner(parts, settings?.aspectRatio, settings?.quality)
        .then((base64) => ({ base64, style, success: true }))
        .catch((err) => ({ error: err.message, style, success: false }));
    });

    const results = await Promise.all(tasks);
    const successful = results.filter(r => r.success);
    const failedCount = results.filter(r => !r.success).length;

    if (!isAdmin && failedCount > 0) {
      const refund = failedCount * creditPerDesign;
      await userRef.update({ credits: FieldValue.increment(refund) });
    }

    // Save successful designs to Firebase Storage + Firestore
    const savedDesigns = [];
    for (const r of successful) {
      try {
        const rawB64 = r.base64.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(rawB64, 'base64');
        const fileId = `users/${req.user.uid}/banners/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;
        const file = bucket.file(fileId);
        const storageToken = crypto.randomUUID();
        await file.save(imgBuffer, {
          metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: storageToken } }
        });
        const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileId)}?alt=media&token=${storageToken}`;
        savedDesigns.push({ url: imgUrl, style: r.style, base64: r.base64 });
      } catch (e) {
        console.error('[Design] Error saving to storage:', e);
        savedDesigns.push({ url: r.base64, style: r.style, base64: r.base64 });
      }
    }

    if (savedDesigns.length > 0 && db) {
      try {
        await Promise.all([
          db.collection('generations').add({
            userId: req.user.uid,
            timestamp: Date.now(),
            count: savedDesigns.length,
            type: 'banner',
            bannerTypography: settings?.typography || 'Tự động',
            settings: {
              aspectRatio: settings?.aspectRatio || '3:4',
              quality: settings?.quality || '1K',
              mode: 'design',
            },
            styles: savedDesigns.map(r => r.style),
            images: savedDesigns.map(r => r.url),
          }),
          userRef.update({ totalGenerated: FieldValue.increment(savedDesigns.length) }),
        ]);
      } catch (e) { console.error('[Design] Firestore save error:', e); }
    }

    console.log(`[Design] Tạo ${successful.length}/${quantity} thiết kế thành công.`);
    res.json({
      images: savedDesigns.map(r => ({ base64: r.base64, style: r.style, url: r.url })),
      creditsUsed: (quantity - failedCount) * creditPerDesign,
      ...(failedCount > 0 && { warning: `${failedCount}/${quantity} ảnh bị lỗi và đã được hoàn credit.` }),
    });
  } catch (err) {
    if (!isAdmin) {
      try { await userRef.update({ credits: FieldValue.increment(totalCost) }); } catch { }
    }
    console.error('[Design] Error:', err);
    res.status(500).json({ error: err.message || 'Lỗi server khi tạo thiết kế.' });
  }
});

// 12c. POST /api/generate/edit — Edit existing banner
app.post('/api/generate/edit', generateLimiter, verifyToken, async (req, res) => {
  const { currentImageBase64, aspectRatio } = req.body;
  let { editPrompt } = req.body;

  if (!currentImageBase64 || !editPrompt) {
    return res.status(400).json({ error: 'Thiếu ảnh hoặc yêu cầu chỉnh sửa.' });
  }

  // Sanitize user-controlled text injected into AI prompt
  editPrompt = typeof editPrompt === 'string'
    ? editPrompt.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, 500)
    : '';

  const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';
  const isAdmin = req.user.email === ADMIN_EMAIL;
  const userRef = db.collection('users').doc(req.user.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(403).json({ error: 'Tài khoản không tồn tại' });

  if (!isAdmin) {
    const currentCredits = userDoc.data()?.credits ?? 0;
    if (currentCredits < EDIT_CREDIT_COST) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        creditsAvailable: currentCredits,
        creditsRequired: EDIT_CREDIT_COST,
        message: `Bạn cần ${EDIT_CREDIT_COST} credit để chỉnh sửa ảnh. Hiện có ${currentCredits} credit.`,
      });
    }
    await userRef.update({ credits: FieldValue.increment(-EDIT_CREDIT_COST) });
  }

  try {
    const promptText = `
    TASK: Edit the provided image based on the user's instruction.
    USER INSTRUCTION: "${editPrompt}"

    DIRECTIVES:
    - Maintain the overall high quality and resolution.
    - Only modify the elements requested by the user.
    - Ensure typography remains legible if touched.
    - Return the full image.
    `;

    const parts = [
      { text: promptText },
      { inlineData: { mimeType: 'image/png', data: cleanBase64Banner(currentImageBase64) } },
    ];

    const base64 = await callGeminiBanner(parts, aspectRatio || '3:4', '1K');

    console.log(`[Edit] Chỉnh sửa banner thành công cho ${req.user.uid}`);
    res.json({
      image: { base64 },
      creditsUsed: EDIT_CREDIT_COST,
    });
  } catch (err) {
    // Refund on failure
    if (!isAdmin) {
      try { await userRef.update({ credits: FieldValue.increment(EDIT_CREDIT_COST) }); } catch { }
    }
    console.error('[Edit] Error:', err);
    res.status(500).json({ error: err.message || 'Lỗi server khi chỉnh sửa ảnh. Credit đã được hoàn trả.' });
  }
});

// 13. GET /api/download-image — Proxy tải ảnh với Content-Disposition: attachment
app.get('/api/download-image', async (req, res) => {
  const { url, filename } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Upstream responded ${response.status}`);

    const contentType = response.headers.get('content-type') || 'image/png';
    const safeName = (filename || 'foodiesnap-image.png').replace(/[^a-zA-Z0-9._-]/g, '_');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'no-cache');

    // Pipe the response body to the client
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('[Download Proxy] Error:', err.message);
    res.status(500).json({ error: 'Failed to download image' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12d. POST /api/generate/creative — Creative mode (no reference image needed)
// ═══════════════════════════════════════════════════════════════════════════════

const CREATIVE_BASE_CREDIT_COST = 4; // 4 credits per banner at 1K (premium model)
const CREATIVE_QUALITY_MULTIPLIER = { '1K': 1, '2K': 2, '4K': 4 };

const BANNER_PURPOSE_PROMPT_MAP = {
  'promo': 'PURPOSE: Promotional / Sale banner. Optimize for urgency and conversion — large discount numbers, bold CTA, eye-catching sale badges, countdown feel.',
  'new-product': 'PURPOSE: New product launch banner. Focus on product showcase — hero product placement, "NEW" badge, clean and premium presentation, excitement.',
  'event': 'PURPOSE: Event announcement banner. Highlight event name, date/time, venue. Use dynamic composition with energy and anticipation.',
  'facebook-post': 'PURPOSE: Facebook post format. Optimized for social media engagement — thumb-stopping design, clear message readable at small size, social-friendly composition.',
  'story': 'PURPOSE: Story format (vertical 9:16). Full-screen immersive design — bold vertical typography, swipe-up CTA area at bottom, mobile-first layout.',
};

// Creative styles (no "Sao chép chính xác" since there's no reference)
const CREATIVE_STYLES = [
  'Hiện đại & Tối giản',
  'Nổi bật & Sống động',
  'Sang trọng & Thanh lịch',
  'Sáng tạo phá cách',
  'Chuyên nghiệp & Thương mại',
];

app.post('/api/generate/creative', generateLimiter, verifyToken, async (req, res) => {
  let { bannerTitle, industry, purpose, brandDescription, promoInfo, userPrompt } = req.body;
  const { productImages, brandColors, logo, settings, referenceImages, venueImages } = req.body;

  // Sanitize user-controlled text
  const sanitizePromptText = (text, maxLen = 300) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim().slice(0, maxLen);
  };
  bannerTitle = sanitizePromptText(bannerTitle, 200);
  industry = sanitizePromptText(industry, 100);
  purpose = sanitizePromptText(purpose, 50);
  brandDescription = sanitizePromptText(brandDescription, 300);
  promoInfo = sanitizePromptText(promoInfo, 200);
  userPrompt = sanitizePromptText(userPrompt, 300);

  if (!bannerTitle && !brandDescription && !promoInfo) {
    return res.status(400).json({ error: 'Vui lòng nhập tiêu đề banner hoặc mô tả thương hiệu.' });
  }

  const quantity = Math.min(Math.max(parseInt(String(settings?.quantity)) || 1, 1), 5);
  const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';
  const isAdmin = req.user.email === ADMIN_EMAIL;
  const userRef = db.collection('users').doc(req.user.uid);
  const userDoc = await userRef.get();
  if (!userDoc.exists) return res.status(403).json({ error: 'Tài khoản không tồn tại' });

  const qualityMul = CREATIVE_QUALITY_MULTIPLIER[settings?.quality] || 1;
  const creditPerBanner = CREATIVE_BASE_CREDIT_COST * qualityMul;
  const totalCost = creditPerBanner * quantity;

  if (!isAdmin) {
    const currentCredits = userDoc.data()?.credits ?? 0;
    if (currentCredits < totalCost) {
      return res.status(402).json({
        error: 'INSUFFICIENT_CREDITS',
        creditsAvailable: currentCredits,
        creditsRequired: totalCost,
        message: `Bạn cần ${totalCost} credits để tạo ${quantity} banner. Hiện có ${currentCredits} credit.`,
      });
    }
    await userRef.update({ credits: FieldValue.increment(-totalCost) });
  }

  // Auto-sync industry to brand profile if provided
  if (industry && industry.trim()) {
    try {
      const currentProfile = userDoc.data()?.brandProfile || {};
      if (!currentProfile.industry || currentProfile.industry !== industry.trim()) {
        await userRef.update({ 'brandProfile.industry': industry.trim() });
        console.log(`[Creative] Synced industry "${industry}" to brand profile for ${req.user.uid}`);
      }
    } catch (e) { console.error('[Creative] Industry sync error:', e); }
  }

  const typoInstruction = TYPO_PROMPT_MAP[settings?.typography] || TYPO_PROMPT_MAP['Tự động'];
  const purposeInstruction = BANNER_PURPOSE_PROMPT_MAP[purpose] || BANNER_PURPOSE_PROMPT_MAP['promo'];

  // Validate & prepare reference images array
  const validReferenceImages = Array.isArray(referenceImages) ? referenceImages.filter(r => typeof r === 'string' && r.startsWith('data:')) : [];
  const hasReferenceImages = validReferenceImages.length > 0;

  // Detect food/restaurant industry for specialized prompting
  const industryLower = (industry || '').toLowerCase();
  const isFoodIndustry = /ẩm thực|food|café|cafe|cà phê|nhà hàng|restaurant|quán ăn|bếp|kitchen|bakery|bánh|trà|tea|bia|beer|đồ uống|beverage|fast.?food|pizza|sushi|bbq|grill|nướng|lẩu|hotpot/i.test(industryLower);

  try {
    const tasks = Array.from({ length: quantity }, (_, i) => {
      const style = hasReferenceImages
        ? 'Lấy cảm hứng từ ảnh tham chiếu'  // When reference exists, style follows reference
        : CREATIVE_STYLES[i % CREATIVE_STYLES.length];

      // Build color palette instruction
      const colorPalette = Array.isArray(brandColors) && brandColors.length > 0
        ? `COLOR PALETTE: Use these brand colors as the primary palette: ${brandColors.join(', ')}. The first color (${brandColors[0]}) is the primary brand color.`
        : 'COLOR PALETTE: Choose a professional, commercially appealing color palette that suits the industry and purpose.';

      // ── REFERENCE STYLE SECTION (NEW — highest priority when reference images exist) ──
      const referenceStyleSection = hasReferenceImages ? `
    ═══════════════════════════════════════════════════════════
    ⚡ REFERENCE IMAGES PROVIDED (${validReferenceImages.length} images) — THIS IS THE HIGHEST PRIORITY
    ═══════════════════════════════════════════════════════════
    The first ${validReferenceImages.length} attached image(s) are STYLE REFERENCES. You MUST:
    1. DEEPLY ANALYZE each reference image: study the layout structure, color grading, typography style, visual effects (glow, shadows, gradients, overlays), background treatment, element placement, and overall "energy/vibe".
    2. REPLICATE THE SAME VISUAL QUALITY AND STYLE: Your output must match the professional level of these references. If the reference has bold 3D text with glow effects → use bold 3D text with glow effects. If it has a dark premium background with golden accents → use that same approach.
    3. ADAPT THE LAYOUT STRUCTURE: Follow a similar composition pattern — where headlines are placed, how products are arranged, where CTAs sit, how decorative elements frame the content.
    4. MATCH THE COLOR GRADING: Use a similar color temperature, saturation level, and contrast ratio as the reference images.
    5. CREATE A NEW DESIGN — do NOT copy the reference pixel-for-pixel. Use the reference as a "mood board" and create original content with the SAME professional quality and visual DNA.
    ═══════════════════════════════════════════════════════════` : '';

      // ── USER REQUIREMENTS SECTION (elevated to top priority) ──
      const userRequirementsSection = userPrompt ? `
    ⚠️ MANDATORY USER REQUIREMENTS (MUST FOLLOW):
    "${userPrompt}"
    → These are the user's explicit instructions. They override default style choices. If the user specifies colors, mood, style, or any visual direction — FOLLOW IT PRECISELY.` : '';

      // ── VENUE / SPACE SECTION ──
      const validVenueImages = Array.isArray(venueImages) ? venueImages.filter(v => typeof v === 'string' && v.startsWith('data:')) : [];
      const hasVenueImages = validVenueImages.length > 0;
      const venueSection = hasVenueImages ? `
    🏠 VENUE / SPACE INTEGRATION (${validVenueImages.length} venue photo(s) attached — HIGH PRIORITY):
    The attached venue/space image(s) show the ACTUAL interior, ambiance, and decor of this establishment.
    You MUST use these images to:
    1. EXTRACT the venue's visual identity: color palette, lighting mood (warm/cool), interior style (modern, rustic, minimalist, cozy...), materials (wood, concrete, brick...), decorative elements.
    2. CREATE STRONG COHERENCE: The banner background environment should feel like it BELONGS in this space. If the venue has warm Edison bulb lighting → the banner should have warm, golden tones. If the venue has industrial brick walls → incorporate that texture/feel.
    3. SEAMLESSLY CONNECT food/product to space: The product should look like it was photographed IN that venue — matching ambient lighting, surface textures, and overall mood.
    4. The venue style should INFORM (not dominate) — it's a backdrop that makes the food/product feel more authentic and contextual.` : '';

      // ── FOOD INDUSTRY SPECIALIZATION ──
      const foodIndustrySection = isFoodIndustry ? `
    🍽️ FOOD & BEVERAGE INDUSTRY SPECIALIZATION:
    - Make food look IRRESISTIBLE: warm tones, appetizing colors (reds, oranges, warm yellows), steam/sizzle effects where appropriate
    - Food photography lighting: warm key light, soft fill, rim light to make food pop
    - Show food at its most appetizing angle — hero shots, close-ups showing texture and freshness
    - Background should evoke appetite: warm gradients, restaurant ambiance, or vibrant festival energy
    - Use food styling principles: garnishes, sauce drizzles, fresh ingredients visible
    - Typography should feel energetic and appetizing — avoid cold, corporate fonts for food` : '';

      const promptText = `
    ROLE: World-class AI Graphic Designer & Art Director specializing in high-conversion commercial advertising.
    TASK: Create a STUNNING, PROFESSIONAL advertising banner that looks like it was designed by a premium agency.

    CANVAS: Output MUST be exactly ${settings?.aspectRatio || '3:4'} aspect ratio. Non-negotiable.
${referenceStyleSection}
${userRequirementsSection}

    ═══ BANNER CONTENT ═══
    HEADLINE: "${bannerTitle || 'Create an impactful headline based on the context below'}"
    ${industry ? `INDUSTRY: ${industry}` : ''}
    ${brandDescription ? `BRAND: "${brandDescription}"` : ''}
    ${promoInfo ? `PROMO: "${promoInfo}" — Make this VISUALLY DOMINANT (large numbers, bold badges, eye-catching sale graphics)` : ''}
    ${purposeInstruction}

    ═══ VISUAL DESIGN SYSTEM ═══
    ${!hasReferenceImages ? `DESIGN STYLE: "${style}"` : ''}
    ${colorPalette}
${foodIndustrySection}

${venueSection}

    COMPOSITION RULES:
    - Strong visual hierarchy: Hero element (product/visual) → Headline (bold, large) → Promo info (eye-catching badges) → CTA button
    - Fill the canvas meaningfully — avoid excessive empty space. The design should feel RICH and COMPLETE.
    - Use decorative elements: light effects, sparkles, ribbons, badges, glow, bokeh — whatever fits the style
    - Background should have DEPTH: gradients, overlays, texture, or environmental context — NOT flat solid colors

    TYPOGRAPHY:
    - ${typoInstruction}
    - ALL text PERFECTLY LEGIBLE and SPELLED CORRECTLY
    - Vietnamese text for Vietnamese input
    - Headline: LARGE, BOLD, eye-catching — this is the first thing viewers see
    - Promo numbers (prices, percentages): Make them the BIGGEST, most visually striking elements
    - CTA: Clear action button or text ("Đặt ngay", "Mua ngay", "Gọi ngay", etc.)

    ${Array.isArray(productImages) && productImages.length > 0 ? `PRODUCT IMAGES: ${productImages.length} product photo(s) attached. Feature them as HERO elements — large, well-lit, naturally integrated. Apply professional food/product photography treatment: enhance colors, add appetizing glow, match the banner's lighting environment.` : `NO PRODUCT IMAGES: Generate photorealistic visual elements representing the ${industry || 'brand'}. Make them look like professional studio photography.`}

    ${logo ? 'LOGO: Brand logo attached. Place it tastefully (top-left or top-center), visible but not overpowering.' : ''}

    QUALITY STANDARD:
    - This banner will be used for REAL commercial advertising — it must look 100% professional
    - Match the quality level of banners from major brands (Grab, ShopeeFood, GrabFood, McDonald\'s, Starbucks campaigns)
    - Rich, layered design with depth — NOT flat or template-looking
    - Every element serves a purpose — no filler, no placeholder text
      `;

      const parts = [{ text: promptText }];

      // Add reference images FIRST (so AI sees them right after the prompt)
      if (hasReferenceImages) {
        validReferenceImages.forEach((ref) => {
          parts.push({ inlineData: { mimeType: getMimeTypeBanner(ref), data: cleanBase64Banner(ref) } });
        });
      }

      // Add product images
      if (Array.isArray(productImages) && productImages.length > 0) {
        productImages.forEach((prod) => {
          parts.push({ inlineData: { mimeType: getMimeTypeBanner(prod), data: cleanBase64Banner(prod) } });
        });
      }

      // Add logo if provided
      if (logo && typeof logo === 'string' && logo.startsWith('data:')) {
        parts.push({ inlineData: { mimeType: getMimeTypeBanner(logo), data: cleanBase64Banner(logo) } });
      }

      // Add venue images (after logo, so AI can use them as context)
      if (hasVenueImages) {
        validVenueImages.forEach((venue) => {
          parts.push({ inlineData: { mimeType: getMimeTypeBanner(venue), data: cleanBase64Banner(venue) } });
        });
      }

      return callGeminiBanner(parts, settings?.aspectRatio, settings?.quality)
        .then((base64) => ({ base64, style, success: true }))
        .catch((err) => ({ error: err.message, style, success: false }));
    });

    const results = await Promise.all(tasks);
    const successful = results.filter(r => r.success);
    const failedCount = results.filter(r => !r.success).length;

    // Refund failed
    if (!isAdmin && failedCount > 0) {
      const refund = failedCount * creditPerBanner;
      await userRef.update({ credits: FieldValue.increment(refund) });
      console.log(`[Creative] Hoàn ${refund} credits cho ${req.user.uid}`);
    }

    // Save successful banners to Firebase Storage + Firestore
    const savedResults = [];
    for (const r of successful) {
      try {
        const rawB64 = r.base64.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(rawB64, 'base64');
        const fileId = `users/${req.user.uid}/banners/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;
        const file = bucket.file(fileId);
        const storageToken = crypto.randomUUID();
        await file.save(imgBuffer, {
          metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: storageToken } }
        });
        const imgUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileId)}?alt=media&token=${storageToken}`;
        savedResults.push({ url: imgUrl, style: r.style, base64: r.base64 });
      } catch (e) {
        console.error('[Creative] Error saving to storage:', e);
        savedResults.push({ url: r.base64, style: r.style, base64: r.base64 });
      }
    }

    // Save metadata to Firestore
    if (savedResults.length > 0 && db) {
      try {
        await Promise.all([
          db.collection('generations').add({
            userId: req.user.uid,
            timestamp: Date.now(),
            count: savedResults.length,
            type: 'banner',
            bannerTypography: settings?.typography || 'Tự động',
            settings: {
              aspectRatio: settings?.aspectRatio || '3:4',
              quality: settings?.quality || '1K',
              mode: 'creative',
              purpose: purpose || 'promo',
            },
            styles: savedResults.map(r => r.style),
            images: savedResults.map(r => r.url),
          }),
          userRef.update({ totalGenerated: FieldValue.increment(savedResults.length) }),
        ]);
      } catch (e) { console.error('[Creative] Firestore save error:', e); }
    }

    console.log(`[Creative] Tạo ${successful.length}/${quantity} banner thành công.`);
    res.json({
      images: savedResults.map(r => ({ base64: r.base64, style: r.style, url: r.url })),
      creditsUsed: (quantity - failedCount) * creditPerBanner,
      ...(failedCount > 0 && { warning: `${failedCount}/${quantity} ảnh bị lỗi và đã được hoàn credit.` }),
    });
  } catch (err) {
    if (!isAdmin) {
      try { await userRef.update({ credits: FieldValue.increment(totalCost) }); } catch { }
    }
    console.error('[Creative] Error:', err);
    res.status(500).json({ error: err.message || 'Lỗi server khi tạo banner.' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. PRODUCT CATALOG CRUD
// ═══════════════════════════════════════════════════════════════════════════════

// 15a. GET /api/products — List all products for current user
app.get('/api/products', verifyToken, async (req, res) => {
  try {
    const snap = await db.collection('users').doc(req.user.uid)
      .collection('products').orderBy('createdAt', 'desc').limit(50).get();
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ products });
  } catch (err) {
    console.error('[Products] List error:', err);
    res.status(500).json({ error: 'Không thể tải danh sách sản phẩm.' });
  }
});

// 15b. POST /api/products — Create a new product
app.post('/api/products', verifyToken, async (req, res) => {
  const { name, description, price, category, image } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Tên sản phẩm không được để trống.' });
  }

  try {
    // If image is base64, save to Firebase Storage
    let imageUrl = image || '';
    if (image && image.startsWith('data:')) {
      const rawB64 = image.replace(/^data:(image\/\w+|application\/\w+);base64,/, '');
      const imgBuffer = Buffer.from(rawB64, 'base64');
      const fileId = `users/${req.user.uid}/products/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;
      const file = bucket.file(fileId);
      const storageToken = crypto.randomUUID();
      await file.save(imgBuffer, {
        metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: storageToken } }
      });
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileId)}?alt=media&token=${storageToken}`;
    }

    const productData = {
      name: (name || '').trim().slice(0, 100),
      description: (description || '').trim().slice(0, 300),
      price: (price || '').trim().slice(0, 50),
      category: (category || '').trim().slice(0, 50),
      image: imageUrl,
      createdAt: Date.now(),
    };

    const docRef = await db.collection('users').doc(req.user.uid)
      .collection('products').add(productData);

    res.json({ product: { id: docRef.id, ...productData } });
  } catch (err) {
    console.error('[Products] Create error:', err);
    res.status(500).json({ error: 'Không thể tạo sản phẩm.' });
  }
});

// 15c. PUT /api/products/:id — Update a product
app.put('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, image } = req.body;

  try {
    const docRef = db.collection('users').doc(req.user.uid).collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Sản phẩm không tồn tại.' });

    // If new image is base64, save to Firebase Storage
    let imageUrl = image;
    if (image && image.startsWith('data:')) {
      const rawB64 = image.replace(/^data:(image\/\w+|application\/\w+);base64,/, '');
      const imgBuffer = Buffer.from(rawB64, 'base64');
      const fileId = `users/${req.user.uid}/products/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.png`;
      const file = bucket.file(fileId);
      const storageToken = crypto.randomUUID();
      await file.save(imgBuffer, {
        metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: storageToken } }
      });
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(fileId)}?alt=media&token=${storageToken}`;
    }

    const updates = {};
    if (name !== undefined) updates.name = (name || '').trim().slice(0, 100);
    if (description !== undefined) updates.description = (description || '').trim().slice(0, 300);
    if (price !== undefined) updates.price = (price || '').trim().slice(0, 50);
    if (category !== undefined) updates.category = (category || '').trim().slice(0, 50);
    if (imageUrl !== undefined) updates.image = imageUrl;

    await docRef.update(updates);
    const updated = await docRef.get();
    res.json({ product: { id: updated.id, ...updated.data() } });
  } catch (err) {
    console.error('[Products] Update error:', err);
    res.status(500).json({ error: 'Không thể cập nhật sản phẩm.' });
  }
});

// 15d. DELETE /api/products/:id — Delete a product
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const docRef = db.collection('users').doc(req.user.uid).collection('products').doc(id);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Sản phẩm không tồn tại.' });

    // Try to delete the image from Storage if it's a Firebase Storage URL
    const imageUrl = doc.data()?.image;
    if (imageUrl && imageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        const filePath = decodeURIComponent(imageUrl.split('/o/')[1]?.split('?')[0] || '');
        if (filePath) await bucket.file(filePath).delete().catch(() => { });
      } catch { /* ignore storage delete errors */ }
    }

    await docRef.delete();
    res.json({ success: true });
  } catch (err) {
    console.error('[Products] Delete error:', err);
    res.status(500).json({ error: 'Không thể xóa sản phẩm.' });
  }
});

// 14. Phục vụ Frontend Vite React sau khi build
app.use(express.static(path.join(__dirname, 'dist')));
// SPA fallback - must be after API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server frontend & backend đang chạy tại cổng http://0.0.0.0:${PORT}`);
});
