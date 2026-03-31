import React from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UploadPanelProps {
    foodPreview: string | null;
    bgPreview: string | null;
    onFoodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBgChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFoodClear: () => void;
    onBgClear: () => void;
}

export default function UploadPanel({
    foodPreview,
    bgPreview,
    onFoodChange,
    onBgChange,
    onFoodClear,
    onBgClear,
}: UploadPanelProps) {
    return (
        <section className="glass-card p-4 rounded-2xl space-y-3">
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
        </section>
    );
}
