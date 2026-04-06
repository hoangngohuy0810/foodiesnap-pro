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

// 3. CORS – allow only production domain + localhost dev
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
    // Check if origin is allowed exactly, or if it's a dynamic Firebase domain
    if (
      !origin ||
      ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith('.hosted.app') ||
      origin.endsWith('.web.app') ||
      origin.endsWith('.firebaseapp.com')
    ) {
      callback(null, true);
    } else {
      // Return false instead of throwing new Error() to prevent Express 500 crash
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Handle payload too large errors
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Dung lượng dữ liệu tải lên quá lớn (tối đa 100MB). Vui lòng giảm kích thước hoặc số lượng ảnh.' });
  }
  next(err);
});

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
    ? sideDishes.filter(d => d && typeof d.base64 === 'string')
    : [];

  const sideDishPromptSection = validSideDishes.length > 0
    ? `\n\n    Các món phụ đi kèm (${validSideDishes.length} món):\n` +
    validSideDishes.map((d, i) => {
      const desc = d.description?.trim();
      return `    - Món phụ ${i + 1}${desc ? `: ${desc}` : ''}`;
    }).join('\n') +
    `\n    QUAN TRỌNG: Đặt các món phụ này ở vị trí hỗ trợ (góc, cạnh, hoặc nền gần) để cân bằng bố cục. Chúng KHÔNG được chiếm spotlight của món chính - chỉ đóng vai trò đạo cụ và trang trí tôn vinh món chính.`
    : '';

  const prompt = isProModel
    ? `
    Tạo ảnh món ăn thương mại chất lượng siêu cao, đạt chuẩn tạp chí ẩm thực cao cấp.
    Chủ thể: Món ăn trong ảnh được tải lên.
    Tỉ lệ khung hình (Aspect Ratio): BẮT BUỘC tạo ảnh có tỉ lệ ${settings.aspectRatio || '1:1'}.
    Phong cách: ${settings.style} - thực hiện với độ chính xác và chi tiết tối đa.
    Ánh sáng: ${settings.lighting} - ánh sáng nhiều lớp, tạo chiều sâu và kịch tính.
    Góc máy: ${settings.angle} - bố cục hoàn hảo, cân bằng thị giác tuyệt đối.
    Nền: ${settings.backgroundPrompt || (bgBase64 ? "Hòa trộn hoàn hảo món ăn với nền, điều chỉnh phối cảnh, phản chiếu ánh sáng và bokeh." : "Bối cảnh sang trọng, chi tiết tinh tế, phù hợp với nhà hàng 5 sao.")}.
${sideDishPromptSection}
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
    Tỉ lệ khung hình (Aspect Ratio): BẮT BUỘC tạo ảnh có tỉ lệ ${settings.aspectRatio || '1:1'}.
    Phong cách: ${settings.style}.
    Ánh sáng: ${settings.lighting}.
    Góc máy: ${settings.angle}.
    Nền: ${settings.backgroundPrompt || (bgBase64 ? "Sử dụng ảnh nền được cung cấp và hòa trộn món ăn vào đó một cách tự nhiên, điều chỉnh phối cảnh và ánh sáng cho chân thực." : "Một bối cảnh nhà hàng chuyên nghiệp làm nổi bật món ăn.")}.
${sideDishPromptSection}
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
          const response = await ai.models.generateContent({
            model: modelConfig.apiModel,
            contents: [{ role: 'user', parts }],
            config: {
              responseModalities: ['IMAGE', 'TEXT'],
              temperature: 1.0,
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
async function callGeminiBanner(parts, aspectRatio, quality) {
  const maxRetries = Math.min(apiKeys.length * 2, 5);
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const apiKey = getNextApiKey();
    if (!apiKey) throw new Error('Chưa cấu hình GEMINI_API_KEYS trên server.');

    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: BANNER_MODEL,
        contents: [{ role: 'user', parts }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          temperature: 1.0,
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
  const { referenceImages, productImages, brandDescription, promoInfo, userPrompt, settings } = req.body;

  if (!referenceImages?.length || !productImages?.length) {
    return res.status(400).json({ error: 'Thiếu ảnh tham khảo hoặc ảnh sản phẩm.' });
  }

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

    OUTPUT: A single, high-quality image containing the product and rendered text.
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

    OUTPUT: A single, high-quality banner image that presents the extracted information in the requested style.
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
  const { currentImageBase64, editPrompt, aspectRatio } = req.body;

  if (!currentImageBase64 || !editPrompt) {
    return res.status(400).json({ error: 'Thiếu ảnh hoặc yêu cầu chỉnh sửa.' });
  }

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

// 13. Phục vụ Frontend Vite React sau khi build
app.use(express.static(path.join(__dirname, 'dist')));
// SPA fallback - must be after API routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server frontend & backend đang chạy tại cổng http://localhost:${PORT}`);
});
