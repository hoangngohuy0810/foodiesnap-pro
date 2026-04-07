import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Sparkles, Loader2, User, ShoppingCart, Image as ImageIcon, X, Zap,
    Settings2, AlertCircle, PlusCircle, ChevronDown, ChevronUp, UtensilsCrossed,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { GenerationSettings } from '../../types';
import { SideDish } from './UploadPanel';

const MAX_SIDE_DISHES = 3; // Fewer in quick mode (3 vs 5 in advanced)

interface QuickModePanelProps {
    foodPreview: string | null;
    bgPreview: string | null;
    settings: GenerationSettings;
    onFoodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFoodClear: () => void;
    onBgChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBgClear: () => void;
    sideDishes: SideDish[];
    onSideDishesChange: (dishes: SideDish[]) => void;
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
    bgPreview,
    settings,
    onFoodChange,
    onFoodClear,
    onBgChange,
    onBgClear,
    sideDishes,
    onSideDishesChange,
    isGenerating,
    isLoggedIn,
    credits,
    quickCreditCost,
    onGenerate,
    onSwitchToAdvanced,
}: QuickModePanelProps) {
    const foodInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const sideDishInputRef = useRef<HTMLInputElement>(null);
    const [extrasOpen, setExtrasOpen] = React.useState(false);
    const notEnough = isLoggedIn && credits < quickCreditCost;

    // ── Side dish handlers ──
    const handleSideDishFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        const remaining = MAX_SIDE_DISHES - sideDishes.length;
        const toAdd = files.slice(0, remaining);
        const newDishes: SideDish[] = toAdd.map(file => ({
            file,
            preview: URL.createObjectURL(file),
            description: '',
        }));
        onSideDishesChange([...sideDishes, ...newDishes]);
        if (sideDishInputRef.current) sideDishInputRef.current.value = '';
    };

    const removeSideDish = (idx: number) => {
        onSideDishesChange(sideDishes.filter((_, i) => i !== idx));
    };

    const updateDescription = (idx: number, value: string) => {
        onSideDishesChange(sideDishes.map((d, i) => i === idx ? { ...d, description: value } : d));
    };

    const hasSideDishes = sideDishes.length > 0;
    const hasExtras = !!bgPreview || hasSideDishes;
    const canAddMore = sideDishes.length < MAX_SIDE_DISHES;

    // Auto-open extras section if there's content
    React.useEffect(() => {
        if (hasExtras && !extrasOpen) setExtrasOpen(true);
    }, [hasExtras]);

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
                    ref={foodInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFoodChange}
                    className="hidden"
                />
                <div
                    onClick={() => foodInputRef.current?.click()}
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

            {/* ══════ Extras: Background + Side Dishes (collapsible) ══════ */}
            <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
                {/* Collapsible header */}
                <button
                    type="button"
                    onClick={() => setExtrasOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="flex items-center gap-2">
                        <PlusCircle size={13} className="text-brand-orange" />
                        <span className="text-[11px] font-semibold text-gray-600">
                            Nền & Món phụ
                        </span>
                        {hasExtras && (
                            <span className="bg-brand-orange/10 text-brand-orange text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                {(bgPreview ? 1 : 0) + sideDishes.length} mục
                            </span>
                        )}
                        {!hasExtras && (
                            <span className="text-[9px] text-gray-400">Tùy chọn</span>
                        )}
                    </div>
                    <div className="text-gray-400">
                        {extrasOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </div>
                </button>

                <AnimatePresence>
                    {extrasOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-3 pb-3 space-y-3 border-t border-dashed border-gray-100">
                                {/* ── Background Image ── */}
                                <div className="pt-2">
                                    <p className="text-[10px] text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
                                        <ImageIcon size={10} />
                                        Ảnh nền tùy chỉnh
                                    </p>
                                    <input
                                        ref={bgInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={onBgChange}
                                        className="hidden"
                                    />
                                    {bgPreview ? (
                                        <div className="relative inline-block">
                                            <img
                                                src={bgPreview}
                                                alt="Background"
                                                className="w-20 h-20 object-cover rounded-lg border-2 border-brand-orange/30 cursor-pointer"
                                                onClick={() => bgInputRef.current?.click()}
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); onBgClear(); }}
                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => bgInputRef.current?.click()}
                                            className="flex items-center gap-1.5 text-[10px] text-gray-400 border border-dashed border-gray-200 hover:border-brand-orange/40 hover:text-brand-orange rounded-lg px-3 py-2 transition-colors"
                                        >
                                            <PlusCircle size={12} />
                                            Thêm ảnh nền
                                        </button>
                                    )}
                                    <p className="text-[9px] text-gray-400 mt-1">
                                        AI sẽ đặt món ăn lên nền mà bạn chọn
                                    </p>
                                </div>

                                {/* ── Side Dishes ── */}
                                <div className="border-t border-dashed border-gray-100 pt-2">
                                    <p className="text-[10px] text-gray-500 font-semibold mb-1.5 flex items-center gap-1">
                                        <UtensilsCrossed size={10} />
                                        Món phụ (tối đa {MAX_SIDE_DISHES})
                                    </p>
                                    <p className="text-[9px] text-gray-400 mb-2">
                                        Thêm rau thơm, nước chấm, đồ ăn kèm... AI sẽ bố trí hài hòa quanh món chính.
                                    </p>

                                    {/* Per-dish rows */}
                                    {sideDishes.length > 0 && (
                                        <div className="space-y-2 mb-2">
                                            {sideDishes.map((dish, idx) => (
                                                <motion.div
                                                    key={`${dish.preview}-${idx}`}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 8 }}
                                                    className="flex items-center gap-2 bg-gray-50 rounded-lg p-1.5"
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="relative shrink-0">
                                                        <img
                                                            src={dish.preview}
                                                            alt={`Món phụ ${idx + 1}`}
                                                            className="w-10 h-10 object-cover rounded-lg border border-gray-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSideDish(idx)}
                                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                                                        >
                                                            <X size={9} />
                                                        </button>
                                                    </div>
                                                    {/* Description input */}
                                                    <input
                                                        type="text"
                                                        value={dish.description}
                                                        onChange={e => updateDescription(idx, e.target.value)}
                                                        placeholder="VD: Rau thơm, chanh tươi..."
                                                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-orange/30 placeholder:text-gray-300 min-w-0"
                                                    />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add / Clear actions */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            ref={sideDishInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleSideDishFiles}
                                            className="hidden"
                                        />
                                        {canAddMore ? (
                                            <button
                                                type="button"
                                                onClick={() => sideDishInputRef.current?.click()}
                                                className="flex items-center gap-1.5 text-[10px] font-semibold text-brand-orange border border-brand-orange/30 bg-brand-orange/5 hover:bg-brand-orange/10 rounded-lg px-2.5 py-1.5 transition-colors"
                                            >
                                                <PlusCircle size={12} />
                                                Thêm món phụ{hasSideDishes ? ` (còn ${MAX_SIDE_DISHES - sideDishes.length})` : ''}
                                            </button>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">Đã đạt tối đa {MAX_SIDE_DISHES} món</span>
                                        )}
                                        {hasSideDishes && (
                                            <button
                                                type="button"
                                                onClick={() => onSideDishesChange([])}
                                                className="ml-auto text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                Xóa tất cả
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
