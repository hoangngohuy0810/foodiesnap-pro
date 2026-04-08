import React from 'react';
import { Loader2, ShoppingCart, User, AlertCircle, Wand2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
    BannerGenerationSettings,
    BannerPurpose,
    BANNER_PURPOSES,
    TYPOGRAPHY_STYLES,
    TypographyStyle,
} from '../../../types';
import LogoSettingsPanel from './LogoSettingsPanel';

// ── Constants ─────────────────────────────────────────────────────────────────

const BANNER_CREDIT_COST = 2; // base credits per banner at 1K (clone/design)
const CREATIVE_CREDIT_COST = 4; // base credits per banner at 1K (creative)
const QUALITY_MULTIPLIER: Record<string, number> = { '1K': 1, '2K': 2, '4K': 3 };
const CREATIVE_QUALITY_MULTIPLIER: Record<string, number> = { '1K': 1, '2K': 2, '4K': 4 };
// Tỷ lệ hỗ trợ bởi Gemini 3 Pro/3.1 Flash. Tham chiếu: GEMINI_IMAGE_MODELS.md
const ASPECT_RATIOS = ['1:1', '2:3', '3:4', '4:3', '4:5', '9:16', '16:9'] as const;
const QUALITIES = ['1K', '2K', '4K'] as const;

// ── Props ─────────────────────────────────────────────────────────────────────

interface BannerSettingsPanelProps {
    settings: BannerGenerationSettings;
    onChange: (s: BannerGenerationSettings) => void;
    isGenerating: boolean;
    canGenerate: boolean;
    isLoggedIn: boolean;
    credits: number;
    onGenerate: () => void;
    brandProfileLogo?: string | null;
    // Creative mode props
    purpose?: BannerPurpose;
    onPurposeChange?: (p: BannerPurpose) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BannerSettingsPanel({
    settings,
    onChange,
    isGenerating,
    canGenerate,
    isLoggedIn,
    credits,
    onGenerate,
    brandProfileLogo,
    purpose,
    onPurposeChange,
}: BannerSettingsPanelProps) {
    const set = (patch: Partial<BannerGenerationSettings>) => onChange({ ...settings, ...patch });

    const isCreative = settings.mode === 'creative';
    const baseCost = isCreative ? CREATIVE_CREDIT_COST : BANNER_CREDIT_COST;
    const qualityMul = isCreative
        ? (CREATIVE_QUALITY_MULTIPLIER[settings.quality] ?? 1)
        : (QUALITY_MULTIPLIER[settings.quality] ?? 1);
    const costPerBanner = baseCost * qualityMul;
    const totalCost = costPerBanner * settings.quantity;
    const notEnough = isLoggedIn && credits < totalCost;

    return (
        <section className="glass-card p-4 rounded-2xl space-y-2.5">
            {/* ── Purpose ── */}
            {onPurposeChange && (
                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Mục đích banner</label>
                    <div className="flex flex-wrap gap-1">
                        {BANNER_PURPOSES.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    onPurposeChange(p.id);
                                    // Auto-switch aspect ratio if defined
                                    if (p.autoAspectRatio) {
                                        set({ aspectRatio: p.autoAspectRatio });
                                    }
                                }}
                                className={cn(
                                    'text-[9px] py-1 px-2 rounded-lg border transition-all font-medium',
                                    purpose === p.id
                                        ? 'border-purple-500 bg-purple-500 text-white'
                                        : 'border-gray-100 bg-white hover:border-gray-300 text-gray-600'
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Typography ── */}
            <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Phong cách chữ</label>
                <select
                    value={settings.typography}
                    onChange={(e) => set({ typography: e.target.value as TypographyStyle })}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-orange/20 appearance-none"
                >
                    {TYPOGRAPHY_STYLES.map((typo) => (
                        <option key={typo} value={typo}>{typo}</option>
                    ))}
                </select>
            </div>

            {/* ── Aspect Ratio + Quality + Quantity in compact grid ── */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Tỉ lệ</label>
                    <div className="flex flex-wrap gap-0.5">
                        {ASPECT_RATIOS.map(r => (
                            <button
                                key={r}
                                onClick={() => set({ aspectRatio: r })}
                                className={cn(
                                    'text-[9px] py-0.5 px-1.5 rounded border transition-all',
                                    settings.aspectRatio === r
                                        ? 'border-brand-orange bg-brand-orange text-white'
                                        : 'border-gray-100 bg-white hover:border-gray-300 text-gray-600'
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Chất lượng</label>
                    <div className="flex gap-0.5">
                        {QUALITIES.map(q => (
                            <button
                                key={q}
                                onClick={() => set({ quality: q })}
                                className={cn(
                                    'flex-1 text-[9px] py-0.5 px-1.5 rounded border transition-all',
                                    settings.quality === q
                                        ? 'border-brand-orange bg-brand-orange text-white'
                                        : 'border-gray-100 bg-white hover:border-gray-300 text-gray-600'
                                )}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Quantity ── */}
            <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 mb-0.5 block">
                    Số lượng: <span className="text-brand-orange font-bold">{settings.quantity}</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={settings.quantity}
                    onChange={(e) => set({ quantity: parseInt(e.target.value) })}
                    className="w-full accent-brand-orange h-1"
                />
            </div>

            {/* ── Logo Settings (collapsed by default) ── */}
            <details className="border-t border-gray-100 pt-2">
                <summary className="text-[10px] font-mono uppercase text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                    Chèn Logo {settings.logo.image ? '✓' : '(Tùy chọn)'}
                </summary>
                <div className="mt-2">
                    <LogoSettingsPanel
                        settings={settings.logo}
                        onChange={(logo) => set({ logo })}
                        aspectRatio={settings.aspectRatio}
                        brandProfileLogo={brandProfileLogo}
                    />
                </div>
            </details>

            {/* ── Credits info ── */}
            {isLoggedIn && (
                <div className={cn(
                    'rounded-xl px-3 py-1.5 space-y-0.5',
                    notEnough ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500">
                            Chi phí:{' '}
                            <span className="font-bold text-brand-orange">
                                {totalCost} cr
                            </span>
                        </span>
                        <span className="text-[11px] text-gray-500">
                            Số dư:{' '}
                            <span className={cn('font-bold', notEnough ? 'text-red-500' : 'text-green-600')}>
                                {credits}
                            </span>
                        </span>
                    </div>
                    {(qualityMul > 1 || settings.quantity > 1) && (
                        <p className="text-[9px] text-gray-400">
                            {baseCost}cr × {settings.quality}({qualityMul}×)
                            {settings.quantity > 1 && ` × ${settings.quantity} biến thể`}
                            {' = '}{totalCost} cr
                        </p>
                    )}
                    {notEnough && (
                        <div className="flex items-start gap-1 pt-0.5">
                            <AlertCircle size={10} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-[9px] text-red-600 leading-tight">
                                Thiếu <span className="font-bold">{totalCost - credits} cr</span>.{' '}
                                <a href="/pricing" className="underline font-semibold hover:text-red-700">Mua thêm →</a>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Generate button ── */}
            <button
                onClick={onGenerate}
                disabled={isGenerating || !canGenerate}
                className="btn-primary w-full flex items-center justify-center gap-2 !py-2"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="animate-spin" size={15} />
                        <span className="text-sm">Đang tạo banner (~1 phút)...</span>
                    </>
                ) : !isLoggedIn ? (
                    <>
                        <User size={15} />
                        <span className="text-sm">Đăng nhập để tạo banner</span>
                    </>
                ) : notEnough ? (
                    <>
                        <ShoppingCart size={15} />
                        <span className="text-sm">Mua credits để tiếp tục</span>
                    </>
                ) : (
                    <>
                        <Wand2 size={15} />
                        <span className="text-sm">✨ Tạo banner mới</span>
                    </>
                )}
            </button>
        </section>
    );
}
