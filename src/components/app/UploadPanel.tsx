import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, X, PlusCircle, ChevronDown, ChevronUp, UtensilsCrossed } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface SideDish {
    preview: string;
    file: File;
    description: string;
}

interface UploadPanelProps {
    foodPreview: string | null;
    bgPreview: string | null;
    onFoodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBgChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFoodClear: () => void;
    onBgClear: () => void;
    // Side dishes
    sideDishes: SideDish[];
    onSideDishesChange: (dishes: SideDish[]) => void;
}

const MAX_SIDE_DISHES = 5;

export default function UploadPanel({
    foodPreview,
    bgPreview,
    onFoodChange,
    onBgChange,
    onFoodClear,
    onBgClear,
    sideDishes,
    onSideDishesChange,
}: UploadPanelProps) {
    const [sideDishOpen, setSideDishOpen] = React.useState(false);
    const sideDishInputRef = useRef<HTMLInputElement>(null);

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
        // Reset input so same file can be re-selected
        if (sideDishInputRef.current) sideDishInputRef.current.value = '';
    };

    const removeSideDish = (idx: number) => {
        const updated = sideDishes.filter((_, i) => i !== idx);
        onSideDishesChange(updated);
    };

    const updateDescription = (idx: number, value: string) => {
        const updated = sideDishes.map((d, i) => i === idx ? { ...d, description: value } : d);
        onSideDishesChange(updated);
    };

    const clearAll = () => onSideDishesChange([]);

    const hasSideDishes = sideDishes.length > 0;
    const canAddMore = sideDishes.length < MAX_SIDE_DISHES;

    return (
        <section className="glass-card p-4 rounded-2xl space-y-3">
            {/* ── Main food + Background ── */}
            <div className="grid grid-cols-2 gap-3">
                {/* Food Upload */}
                <div className="relative group">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onFoodChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div
                        className={cn(
                            'border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 text-center h-24',
                            foodPreview
                                ? 'border-brand-orange bg-brand-orange/5 p-0 overflow-hidden'
                                : 'border-gray-200 hover:border-brand-orange/50 p-3'
                        )}
                    >
                        {foodPreview ? (
                            <img src={foodPreview} alt="Food" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <>
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-brand-orange transition-colors">
                                    <ImageIcon size={16} />
                                </div>
                                <span className="text-xs font-medium">Ảnh món ăn</span>
                                <span className="text-[10px] text-gray-400">Bắt buộc</span>
                            </>
                        )}
                    </div>
                    {foodPreview && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onFoodClear(); }}
                            className="absolute top-1 right-1 p-0.5 bg-white rounded-full shadow-sm z-20 text-gray-400 hover:text-red-500"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Background Upload */}
                <div className="relative group">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={onBgChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div
                        className={cn(
                            'border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-1.5 text-center h-24',
                            bgPreview
                                ? 'border-brand-orange bg-brand-orange/5 p-0 overflow-hidden'
                                : 'border-gray-200 hover:border-brand-orange/50 p-3'
                        )}
                    >
                        {bgPreview ? (
                            <img src={bgPreview} alt="Background" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <>
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-brand-orange transition-colors">
                                    <ImageIcon size={16} />
                                </div>
                                <span className="text-xs font-medium">Nền tùy chỉnh</span>
                                <span className="text-[10px] text-gray-400">Tùy chọn</span>
                            </>
                        )}
                    </div>
                    {bgPreview && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onBgClear(); }}
                            className="absolute top-1 right-1 p-0.5 bg-white rounded-full shadow-sm z-20 text-gray-400 hover:text-red-500"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Side Dishes Section ── */}
            <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
                {/* Collapsible header */}
                <button
                    type="button"
                    onClick={() => setSideDishOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="flex items-center gap-2">
                        <UtensilsCrossed size={13} className="text-brand-orange" />
                        <span className="text-[11px] font-semibold text-gray-600">Món phụ</span>
                        {hasSideDishes && (
                            <span className="bg-brand-orange/10 text-brand-orange text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                {sideDishes.length}/{MAX_SIDE_DISHES}
                            </span>
                        )}
                        {!hasSideDishes && (
                            <span className="text-[9px] text-gray-400">Tùy chọn</span>
                        )}
                    </div>
                    <div className="text-gray-400">
                        {sideDishOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </div>
                </button>

                <AnimatePresence>
                    {sideDishOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="px-3 pb-3 space-y-2 border-t border-dashed border-gray-100">
                                {/* Description hint */}
                                <p className="text-[10px] text-gray-400 pt-2">
                                    Tải lên các món phụ (tối đa {MAX_SIDE_DISHES}). AI sẽ thêm chúng vào ảnh để làm cân bằng bố cục mà không chiếm spotlight của món chính.
                                </p>

                                {/* Per-dish rows */}
                                {sideDishes.length > 0 && (
                                    <div className="space-y-2">
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
                                                    placeholder={`VD: Rau thơm, chanh tươi...`}
                                                    className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-orange/30 placeholder:text-gray-300 min-w-0"
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Add / Clear actions */}
                                <div className="flex items-center gap-2 pt-0.5">
                                    {/* Hidden file input for side dishes */}
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
                                            Thêm ảnh{sideDishes.length > 0 ? ` (còn ${MAX_SIDE_DISHES - sideDishes.length})` : ''}
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-gray-400">Đã đạt tối đa {MAX_SIDE_DISHES} món phụ</span>
                                    )}
                                    {hasSideDishes && (
                                        <button
                                            type="button"
                                            onClick={clearAll}
                                            className="ml-auto text-[10px] text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            Xóa tất cả
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
