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
}));

// 3. CORS – allow only production domain + localhost dev
const ALLOWED_ORIGINS = [
  'https://foodiesnap-pro.web.app',
  'https://foodiesnap-pro.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:5173',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 4. Rate limiting
const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
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

// 6. Credit Packages
const PACKAGES = {
  starter: { credits: 50, amount: 50000, label: 'Starter' },
  pro: { credits: 200, amount: 150000, label: 'Pro' },
  ultra: { credits: 500, amount: 300000, label: 'Ultra' },
};

// 6b. Image Models & Credit Costs per image
// NOTE: Only models that support responseModalities: ['IMAGE'] are valid.
// Currently confirmed image generation models from Google Gemini API:
//   - gemini-2.0-flash-preview-image-generation  (primary, best supported)
//   - gemini-2.0-flash-exp                        (experimental, faster)
const IMAGE_MODELS = {
  'nano-banana': {
    apiModel: 'gemini-2.5-flash-image',
    label: 'Nano Banana',
    creditCost: 0.5,
    qualityBoost: false, // standard quality prompt
  },
  'nano-banana-2': {
    apiModel: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    creditCost: 1,
    qualityBoost: false,
  },
  'nano-banana-pro': {
    apiModel: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    creditCost: 2,
    qualityBoost: true, // enhanced prompt for higher perceived quality
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
  const { foodBase64, foodType, bgBase64, bgType, settings } = req.body;

  // Input validation
  if (!foodBase64 || typeof foodBase64 !== 'string') {
    return res.status(400).json({ error: 'Thiếu dữ liệu ảnh đầu vào (foodBase64)' });
  }

  const count = parseInt(settings?.count) || 1;
  if (count < 1 || count > 4) {
    return res.status(400).json({ error: 'Số lượng ảnh phải từ 1 đến 4.' });
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

  const prompt = isProModel
    ? `
    Tạo ảnh món ăn thương mại chất lượng siêu cao, đạt chuẩn tạp chí ẩm thực cao cấp.
    Chủ thể: Món ăn trong ảnh được tải lên.
    Phong cách: ${settings.style} - thực hiện với độ chính xác và chi tiết tối đa.
    Ánh sáng: ${settings.lighting} - ánh sáng nhiều lớp, tạo chiều sâu và kịch tính.
    Góc máy: ${settings.angle} - bố cục hoàn hảo, cân bằng thị giác tuyệt đối.
    Nền: ${settings.backgroundPrompt || (bgBase64 ? "Hòa trộn hoàn hảo món ăn với nền, điều chỉnh phối cảnh, phản chiếu ánh sáng và bokeh." : "Bối cảnh sang trọng, chi tiết tinh tế, phù hợp với nhà hàng 5 sao.")}.

    Yêu cầu chất lượng PREMIUM:
    1. Tái tạo từng chi tiết kết cấu của món ăn: độ giòn, độ mịn, độ bóng, màu sắc tươi sáng hoàn hảo.
    2. Ánh sáng studio cao cấp với highlight và shadow tinh tế, tạo cảm giác 3D.
    3. ${bgBase64 ? "Hòa trộn liền mạch, chỉnh màu và ánh sáng để món ăn và nền là một tổng thể tự nhiên tuyệt đối." : "Nền bokeh mượt mà, gradient tự nhiên, tạo sự tương phản hoàn hảo với món ăn."}
    4. Độ sâu trường ảnh chọn lọc, làm nổi bật điểm nhấn của món ăn.
    5. Màu sắc sống động, bão hòa hợp lý, trông ngon miệng và hấp dẫn tột đỉnh.
    6. Chất lượng ảnh đầu ra cực nét, không noise, đạt chuẩn in ấn thương mại.
    `
    : `
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

  const cleanBase64 = (b64) => b64.includes(',') ? b64.split(',')[1] : b64;

  const parts = [
    { inlineData: { data: cleanBase64(foodBase64), mimeType: foodType || 'image/png' } },
    { text: prompt }
  ];

  if (bgBase64) {
    parts.push({ inlineData: { data: cleanBase64(bgBase64), mimeType: bgType || 'image/png' } });
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
          const response = await ai.models.generateContent({
            model: modelConfig.apiModel,
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['IMAGE'],
              imageConfig: {
                aspectRatio: settings.aspectRatio,
                imageSize: settings.imageSize || '1K',
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
  // Xác thực API Key từ Sepay
  const authHeader = req.headers['authorization'] ?? '';
  const providedKey = authHeader.startsWith('Apikey ') ? authHeader.slice(7) : authHeader;
  if (!providedKey || providedKey !== process.env.SEPAY_WEBHOOK_API_KEY) {
    console.warn('[Webhook] API key không hợp lệ, từ chối request.');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { id, transferAmount, transferType, transferContent } = req.body;

  console.log(`[Webhook] Nhận giao dịch id=${id}, type=${transferType}, amount=${transferAmount}, content="${transferContent}"`);

  // Chỉ xử lý giao dịch tiền vào
  if (transferType !== 'in') {
    return res.json({ success: true });
  }

  // Chống xử lý trùng lặp (dedup) bằng transaction ID của Sepay
  const txRef = db.collection('sepay_transactions').doc(String(id));
  const txDoc = await txRef.get();
  if (txDoc.exists) {
    console.log(`[Webhook] Transaction ${id} đã được xử lý rồi, bỏ qua.`);
    return res.json({ success: true });
  }

  // Trích xuất mã đơn hàng từ nội dung chuyển khoản (VD: "Thanh toan FSABCD1234 foodiesnap")
  const match = (transferContent ?? '').match(/FS[A-F0-9]{8}/i);
  if (!match) {
    console.log(`[Webhook] Không tìm thấy mã đơn hàng trong nội dung: "${transferContent}"`);
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

// 12. Phục vụ Frontend Vite React sau khi build
app.use(express.static(path.join(__dirname, 'dist')));
// SPA fallback - must be after API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server frontend & backend đang chạy tại cổng http://localhost:${PORT}`);
});
