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

export type CreditPackageId = 'starter' | 'pro' | 'ultra';

export interface CreditPackage {
  id: CreditPackageId;
  label: string;
  credits: number;
  amount: number;
  badge?: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'starter', label: 'Starter', credits: 50, amount: 50000 },
  { id: 'pro', label: 'Pro', credits: 200, amount: 150000, badge: 'Phổ biến' },
  { id: 'ultra', label: 'Ultra', credits: 500, amount: 300000, badge: 'Tiết kiệm nhất' },
];

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '512px' | '1K' | '2K' | '4K';
export type ImageModelId = 'nano-banana' | 'nano-banana-2' | 'nano-banana-pro';

export interface ImageModel {
  id: ImageModelId;
  apiModel: string;
  label: string;
  description: string;
  creditCost: number; // credits per image
  badge?: string;
}

export const IMAGE_MODELS: ImageModel[] = [
  {
    id: 'nano-banana',
    apiModel: 'gemini-2.5-flash-image',
    label: 'Nano Banana',
    description: 'Nhanh & tiết kiệm',
    creditCost: 0.5,
  },
  {
    id: 'nano-banana-2',
    apiModel: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    description: 'Chất lượng cân bằng',
    creditCost: 1,
    badge: 'Phổ biến',
  },
  {
    id: 'nano-banana-pro',
    apiModel: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    description: 'Chất lượng cao nhất • Prompt nâng cao',
    creditCost: 2,
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
