export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  credits: number;
  totalGenerated: number;
  createdAt: number;
}

export interface Order {
  orderId: string;
  orderCode: string;
  amount: number;
  credits: number;
  label: string;
  bankAccount: string;
  bankName: string;
  status?: 'pending' | 'paid' | 'expired';
}

export type CreditPackageId = 'lite' | 'personal' | 'startup';

export interface CreditPackage {
  id: CreditPackageId;
  label: string;
  credits: number;
  amount: number;
  badge?: string;
  /** price per 1 credit in VND (for display) */
  pricePerCredit?: number;
}

/**
 * New pricing: 1.000đ = 2 credits
 * Lite:       20.000đ  →  40 credits
 * Cá Nhân:   99.000đ  → 220 credits  (~2.2 cr/1K)
 * Khởi Nghiệp: 249.000đ → 600 credits (~2.4 cr/1K)
 */
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'lite',
    label: 'Lite',
    credits: 40,
    amount: 20000,
  },
  {
    id: 'personal',
    label: 'Cá Nhân',
    credits: 220,
    amount: 99000,
    badge: 'Phổ biến',
  },
  {
    id: 'startup',
    label: 'Khởi Nghiệp',
    credits: 600,
    amount: 249000,
    badge: 'Tiết kiệm nhất',
  },
];

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '512px' | '1K' | '2K' | '4K';

/** Credit multiplier per image size: 1K×1, 2K×2, 4K×3 */
export const IMAGE_SIZE_MULTIPLIER: Record<ImageSize, number> = {
  '512px': 1,
  '1K': 1,
  '2K': 2,
  '4K': 3,
};

export type ImageModelId = 'nano-banana' | 'nano-banana-2' | 'nano-banana-pro';

export interface ImageModel {
  id: ImageModelId;
  apiModel: string;
  label: string;
  description: string;
  /** credits per image at 1K quality (doubled from original) */
  creditCost: number;
  badge?: string;
}

/**
 * Credit costs doubled (1.000đ = 2 credits):
 *   Nano Banana:     1 cr/ảnh  (was 0.5)
 *   Nano Banana 2:   2 cr/ảnh  (was 1)
 *   Nano Banana Pro: 4 cr/ảnh  (was 2)
 */
export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'nano-banana',
    apiModel: 'gemini-2.5-flash-image',
    label: 'Nano Banana',
    description: 'Nhanh & tiết kiệm',
    creditCost: 1,
  },
  {
    id: 'nano-banana-2',
    apiModel: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    description: 'Chất lượng cân bằng',
    creditCost: 2,
    badge: 'Phổ biến',
  },
  {
    id: 'nano-banana-pro',
    apiModel: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    description: 'Chất lượng cao nhất • Prompt nâng cao',
    creditCost: 4,
    badge: 'Premium',
  },
];

export interface GenerationSettings {
  aspectRatio: AspectRatio;
  imageSize: ImageSize;
  count: number;
  style: string;
  lighting: string;
  angle: string;
  backgroundPrompt: string;
  modelId: ImageModelId;
}

export interface GeneratedImage {
  id: string;
  url: string;
  timestamp: number;
  settings: GenerationSettings;
}
