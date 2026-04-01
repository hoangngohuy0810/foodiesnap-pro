import React from 'react';
import {
    Sparkles, Loader2, ShoppingCart, User,
    Zap, Star, Cpu, AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import {
    AspectRatio, ImageSize, GenerationSettings, ImageModelId, IMAGE_MODELS,
} from '../../types';

// ── constants ─────────────────────────────────────────────────────────────────

const STYLES = ['Chuyên nghiệp', 'Điện ảnh', 'Ấm áp & Thoải mái', 'Tối & Tâm trạng', 'Sáng & Thoáng', 'Tối giản'];
const LIGHTING = ['Tự nhiên', 'Studio', 'Bên hông', 'Giờ vàng', 'Neon'];
const ANGLES = ['Ngang mắt', '45 độ', 'Từ trên', 'Góc thấp'];
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const SIZES: ImageSize[] = ['1K', '2K', '4K'];

const MODEL_ICONS: Record<ImageModelId, React.ElementType> = {
    'nano-banana': Zap,
    'nano-banana-2': Cpu,
    'nano-banana-pro': Star,
};

// Format a credit number nicely
function fmtCr(n: number): string {
    if (n === 0.5) return '½';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// Reusable inline option button row
function OptionGroup({
    label,
    options,
    value,
    onChange,
}: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div>
            <label className="text-[10px] font-mono uppercase text-gray-400 mb-1.5 block">{label}</label>
            <div className="flex flex-wrap gap-1">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={cn(
                            'text-[10px] py-1 px-2 rounded-lg border transition-all leading-tight whitespace-nowrap',
                            value === opt
                                ? 'border-brand-orange bg-brand-orange text-white'
                                : 'border-gray-100 bg-white hover:border-gray-300 text-gray-600'
                        )}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── props ─────────────────────────────────────────────────────────────────────

interface SettingsPanelProps {
    settings: GenerationSettings;
    onChange: (s: GenerationSettings) => void;
    isGenerating: boolean;
    hasFoodImage: boolean;
    isLoggedIn: boolean;
    isAdmin: boolean;
    credits: number;
    costPerImage: number;
    sizeMultiplier: number;
    totalCreditCost: number;
    onGenerate: () => void;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SettingsPanel({
    settings,
    onChange,
    isGenerating,
    hasFoodImage,
    isLoggedIn,
    isAdmin,
    credits,
    costPerImage,
    sizeMultiplier,
    totalCreditCost,
    onGenerate,
}: SettingsPanelProps) {
    const set = (patch: Partial<GenerationSettings>) => onChange({ ...settings, ...patch });

    const shortfall = Math.max(0, totalCreditCost - credits);
    const notEnough = !isAdmin && isLoggedIn && shortfall > 0;
    const selectedModel = IMAGE_MODELS.find(m => m.id === settings.modelId)!;

    return (
        <section className="glass-card p-4 rounded-2xl space-y-3">

            {/* ── Model AI (dropdown) ── */}
            <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1.5 block">Model AI</label>
                <div className="relative">
                    <select
                        value={settings.modelId}
                        onChange={(e) => set({ modelId: e.target.value as ImageModelId })}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 appearance-none pr-8"
                    >
                        {IMAGE_MODELS.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.label} – {model.description} ({fmtCr(model.creditCost)} cr/ảnh)
                            </option>
                        ))}
                    </select>
                    {/* Chevron icon overlay */}
                    <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                        {React.createElement(MODEL_ICONS[settings.modelId], { size: 13 })}
                    </div>
                </div>
            </div>

            {/* ── Phong cách ── */}
            <OptionGroup
                label="Phong cách"
                options={STYLES}
                value={settings.style}
                onChange={(v) => set({ style: v })}
            />

            {/* ── Ánh sáng ── */}
            <OptionGroup
                label="Ánh sáng"
                options={LIGHTING}
                value={settings.lighting}
                onChange={(v) => set({ lighting: v })}
            />

            {/* ── Góc máy ── */}
            <OptionGroup
                label="Góc máy"
                options={ANGLES}
                value={settings.angle}
                onChange={(v) => set({ angle: v })}
            />

            {/* ── Tỉ lệ + Chất lượng ── */}
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1.5 block">Tỉ lệ khung hình</label>
                    <div className="flex flex-wrap gap-1">
                        {ASPECT_RATIOS.map(r => (
                            <button
                                key={r}
                                onClick={() => set({ aspectRatio: r })}
                                className={cn(
                                    'text-[10px] py-1 px-2 rounded-lg border transition-all',
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
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1.5 block">Chất lượng</label>
                    <div className="flex gap-1">
                        {SIZES.map(s => (
                            <button
                                key={s}
                                onClick={() => set({ imageSize: s })}
                                className={cn(
                                    'flex-1 text-[10px] py-1 px-2 rounded-lg border transition-all',
                                    settings.imageSize === s
                                        ? 'border-brand-orange bg-brand-orange text-white'
                                        : 'border-gray-100 bg-white hover:border-gray-300 text-gray-600'
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Số lượng ── */}
            <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">
                    Số lượng ảnh: <span className="text-brand-orange font-bold">{settings.count}</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max="4"
                    value={settings.count}
                    onChange={(e) => set({ count: parseInt(e.target.value) })}
                    className="w-full accent-brand-orange"
                />
                <div className="flex justify-between text-[9px] text-gray-300 mt-0.5">
                    {[1, 2, 3, 4].map(n => <span key={n}>{n}</span>)}
                </div>
            </div>

            {/* ── Mô tả nền ── */}
            <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Mô tả nền (tùy chọn)</label>
                <textarea
                    value={settings.backgroundPrompt}
                    onChange={(e) => set({ backgroundPrompt: e.target.value })}
                    placeholder="VD: Bàn gỗ mộc mạc với các loại thảo mộc..."
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 h-14 resize-none"
                />
            </div>

            {/* ── Credits info ── */}
            {isLoggedIn && (
                <div className={cn(
                    'rounded-xl px-3 py-2 space-y-1.5',
                    notEnough ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            Chi phí:{' '}
                            <span className="font-bold text-brand-orange">
                                {fmtCr(totalCreditCost)} credit{totalCreditCost > 1 ? 's' : ''}
                            </span>
                        </span>
                        <span className="text-xs text-gray-500">
                            Số dư:{' '}
                            <span className={cn('font-bold', notEnough ? 'text-red-500' : 'text-green-600')}>
                                {credits}
                            </span>
                            {isAdmin && <span className="ml-1 text-purple-600 font-bold">👑</span>}
                        </span>
                    </div>

                    {(sizeMultiplier > 1 || settings.count > 1) && (
                        <p className="text-[10px] text-gray-400">
                            {fmtCr(selectedModel.creditCost)}cr × {settings.imageSize}({sizeMultiplier}×)
                            {settings.count > 1 && ` × ${settings.count} ảnh`}
                            {' = '}{fmtCr(totalCreditCost)} cr
                        </p>
                    )}

                    {notEnough && (
                        <div className="flex items-start gap-1.5 pt-0.5">
                            <AlertCircle size={11} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-red-600 leading-tight">
                                Thiếu <span className="font-bold">{fmtCr(shortfall)} credit{shortfall > 1 ? 's' : ''}</span>.{' '}
                                <a href="/pricing" className="underline font-semibold hover:text-red-700">
                                    Mua thêm ngay →
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Generate button ── */}
            <button
                onClick={onGenerate}
                disabled={isGenerating || !hasFoodImage}
                className="btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="animate-spin" size={16} />
                        <span className="text-sm">Đang tạo...</span>
                    </>
                ) : !isLoggedIn ? (
                    <>
                        <User size={16} />
                        <span className="text-sm">Đăng nhập để tạo ảnh</span>
                    </>
                ) : notEnough ? (
                    <>
                        <ShoppingCart size={16} />
                        <span className="text-sm">Mua credits để tiếp tục</span>
                    </>
                ) : (
                    <>
                        <Sparkles size={16} />
                        <span className="text-sm">Nâng cấp ảnh</span>
                    </>
                )}
            </button>
        </section>
    );
}
