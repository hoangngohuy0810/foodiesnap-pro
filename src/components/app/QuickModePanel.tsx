import React, { useRef } from 'react';
import { Sparkles, Loader2, User, ShoppingCart, Image as ImageIcon, X, Zap, Settings2, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GenerationSettings } from '../../types';

interface QuickModePanelProps {
    foodPreview: string | null;
    settings: GenerationSettings;
    onFoodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFoodClear: () => void;
    isGenerating: boolean;
    isLoggedIn: boolean;
    credits: number;
    /** Credit cost for 1 image at current quick settings */
    quickCreditCost: number;
    onGenerate: () => void;
    onSwitchToAdvanced: () => void;
}

export default function QuickModePanel({
    foodPreview,
    settings,
    onFoodChange,
    onFoodClear,
    isGenerating,
    isLoggedIn,
    credits,
    quickCreditCost,
    onGenerate,
    onSwitchToAdvanced,
}: QuickModePanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const notEnough = isLoggedIn && credits < quickCreditCost;

    return (
        <section className="glass-card p-5 rounded-2xl space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand-orange/10 rounded-lg flex items-center justify-center">
                    <Zap size={16} className="text-brand-orange" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-800">Chế độ Nhanh</h3>
                    <p className="text-[10px] text-gray-400">Upload ảnh → AI tự làm đẹp</p>
                </div>
            </div>

            {/* Upload area — large and inviting */}
            <div className="relative">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFoodChange}
                    className="hidden"
                />
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        'border-2 border-dashed rounded-2xl transition-all cursor-pointer flex flex-col items-center justify-center text-center',
                        foodPreview
                            ? 'border-brand-orange bg-brand-orange/5 p-0 overflow-hidden'
                            : 'border-gray-200 hover:border-brand-orange/50 hover:bg-brand-orange/5 p-8'
                    )}
                >
                    {foodPreview ? (
                        <div className="relative w-full">
                            <img
                                src={foodPreview}
                                alt="Food preview"
                                className="w-full aspect-square object-cover rounded-2xl"
                            />
                            {/* Overlay hint */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3 rounded-b-2xl">
                                <p className="text-white text-[10px] font-medium text-center">
                                    Nhấn để đổi ảnh khác
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                                <ImageIcon size={28} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600 mb-1">
                                Tải ảnh món ăn lên
                            </p>
                            <p className="text-xs text-gray-400">
                                Chụp từ điện thoại, chất lượng bất kỳ
                            </p>
                        </>
                    )}
                </div>

                {/* Clear button */}
                {foodPreview && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onFoodClear(); }}
                        className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-md text-gray-400 hover:text-red-500 transition-colors z-10"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* Quick settings summary */}
            <div className="bg-gray-50 rounded-xl px-3 py-2">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Thiết lập:</span>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                        <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                            {settings.style}
                        </span>
                        <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                            {settings.aspectRatio}
                        </span>
                        <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[9px] font-semibold">
                            {settings.imageSize}
                        </span>
                    </div>
                </div>
            </div>

            {/* Credits info */}
            {isLoggedIn && (
                <div className={cn(
                    'rounded-xl px-3 py-2',
                    notEnough ? 'bg-red-50 border border-red-100' : 'bg-gray-50'
                )}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                            Chi phí: <span className="font-bold text-brand-orange">{quickCreditCost} credit</span>
                        </span>
                        <span className="text-xs text-gray-500">
                            Số dư: <span className={cn('font-bold', notEnough ? 'text-red-500' : 'text-green-600')}>{credits}</span>
                        </span>
                    </div>
                    {notEnough && (
                        <div className="flex items-start gap-1.5 pt-1">
                            <AlertCircle size={11} className="text-red-500 mt-0.5 shrink-0" />
                            <p className="text-[10px] text-red-600 leading-tight">
                                Thiếu <span className="font-bold">{quickCreditCost - credits} credit</span>.{' '}
                                <a href="/pricing" className="underline font-semibold hover:text-red-700">Mua thêm →</a>
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Generate button — big and prominent */}
            <button
                onClick={onGenerate}
                disabled={isGenerating || !foodPreview}
                className={cn(
                    'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-base font-bold transition-all',
                    isGenerating
                        ? 'bg-brand-orange/70 text-white cursor-wait'
                        : !foodPreview
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : !isLoggedIn
                                ? 'bg-gray-800 text-white hover:bg-gray-700'
                                : notEnough
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-brand-orange text-white hover:bg-brand-orange/90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-orange/25'
                )}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        Đang nâng cấp (~1 phút)...
                    </>
                ) : !isLoggedIn ? (
                    <>
                        <User size={20} />
                        Đăng nhập để bắt đầu
                    </>
                ) : notEnough ? (
                    <>
                        <ShoppingCart size={20} />
                        Mua credits để tiếp tục
                    </>
                ) : (
                    <>
                        <Sparkles size={20} />
                        Nâng cấp ảnh ngay ✨
                    </>
                )}
            </button>

            {/* Switch to advanced */}
            <button
                type="button"
                onClick={onSwitchToAdvanced}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-gray-400 hover:text-brand-orange transition-colors py-1"
            >
                <Settings2 size={12} />
                Muốn tùy chỉnh thêm? Chế độ Chi tiết
            </button>
        </section>
    );
}
