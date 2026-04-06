import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Image as ImageIcon, Loader2, Sparkles, Search } from 'lucide-react';
import { BannerGeneratedImage } from '../../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getAspectClass = (ratio: string) => {
    switch (ratio) {
        case '1:1': return 'aspect-square';
        case '3:4': return 'aspect-[3/4]';
        case '4:3': return 'aspect-[4/3]';
        case '9:16': return 'aspect-[9/16]';
        case '16:9': return 'aspect-video';
        default: return 'aspect-[3/4]';
    }
};

const downloadImage = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `banner-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface BannerGalleryProps {
    images: BannerGeneratedImage[];
    isGenerating: boolean;
    expectedCount: number;
    onRegenerate: (id: string, prompt: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BannerGallery({ images, isGenerating, expectedCount, onRegenerate }: BannerGalleryProps) {
    const [selectedImage, setSelectedImage] = useState<BannerGeneratedImage | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editPrompt, setEditPrompt] = useState('');
    const [lightboxPrompt, setLightboxPrompt] = useState('');

    const handleEditClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setEditingId(id);
        setEditPrompt('');
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingId(null);
    };

    const handleSubmitEdit = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (editPrompt.trim()) {
            onRegenerate(id, editPrompt);
            setEditingId(null);
        }
    };

    const handleLightboxRegenerate = () => {
        if (selectedImage && lightboxPrompt.trim()) {
            onRegenerate(selectedImage.id, lightboxPrompt);
            setLightboxPrompt('');
            setSelectedImage(null);
        }
    };

    const handleDownloadAll = () => {
        images.forEach((img, index) => {
            setTimeout(() => downloadImage(img.url, img.id), index * 500);
        });
    };

    // ── Empty state ──
    if (images.length === 0 && !isGenerating) {
        return (
            <div className="h-[520px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                    <ImageIcon size={40} />
                </div>
                <div className="text-center">
                    <p className="font-medium text-gray-500">Chưa có thiết kế nào</p>
                    <p className="text-sm text-gray-400">
                        Tải lên mẫu tham khảo và ảnh sản phẩm, sau đó nhấn <strong>"Tạo thiết kế"</strong> để bắt đầu.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    Kết quả
                    {isGenerating && (
                        <span className="text-xs font-normal text-brand-orange animate-pulse bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
                            Đang tạo {expectedCount} biến thể (~1 phút)...
                        </span>
                    )}
                    {!isGenerating && images.length > 0 && (
                        <span className="text-xs font-normal text-gray-400">
                            {images.length} thiết kế
                        </span>
                    )}
                </h2>
                {images.length > 0 && !isGenerating && (
                    <button
                        onClick={handleDownloadAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                        <Download size={13} />
                        Tải tất cả
                    </button>
                )}
            </div>

            {/* ── Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
                <AnimatePresence mode="popLayout">
                    {images.map((img) => (
                        <motion.div
                            key={img.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group relative glass-card rounded-2xl overflow-hidden cursor-pointer"
                            onClick={() => { setSelectedImage(img); }}
                        >
                            <div className={`w-full bg-gray-50 flex items-center justify-center overflow-hidden relative ${getAspectClass(img.aspectRatio)}`}>
                                <img
                                    src={img.url}
                                    alt={`Banner ${img.style}`}
                                    className={`w-full h-full object-cover transition-transform duration-500 ${editingId !== img.id ? 'group-hover:scale-105' : ''}`}
                                />

                                {/* Regenerating overlay */}
                                {img.isRegenerating && (
                                    <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                        <Loader2 size={24} className="animate-spin text-white mb-1" />
                                        <span className="text-white text-[10px] animate-pulse">Đang chỉnh sửa...</span>
                                    </div>
                                )}

                                {/* Edit overlay */}
                                {editingId === img.id && !img.isRegenerating && (
                                    <div
                                        className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-3"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <h4 className="text-white font-bold text-xs mb-1.5">Chỉnh sửa</h4>
                                        <textarea
                                            className="w-full h-16 bg-gray-800 text-white text-[10px] rounded-lg border border-gray-600 p-2 mb-2 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none resize-none"
                                            placeholder="VD: Đổi nền đỏ, làm logo to hơn..."
                                            autoFocus
                                            value={editPrompt}
                                            onChange={(e) => setEditPrompt(e.target.value)}
                                        />
                                        <div className="flex gap-1.5 w-full">
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex-1 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-[10px] font-bold rounded-lg"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                onClick={(e) => handleSubmitEdit(e, img.id)}
                                                className="flex-1 py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-[10px] font-bold rounded-lg"
                                            >
                                                Xác nhận
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Hover actions */}
                            {editingId !== img.id && !img.isRegenerating && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5 pointer-events-none">
                                    <div className="flex gap-1.5 pointer-events-auto">
                                        <button
                                            onClick={(e) => handleEditClick(e, img.id)}
                                            className="w-7 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center transition-transform hover:scale-105"
                                            title="Chỉnh sửa"
                                        >
                                            <Sparkles size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); downloadImage(img.url, img.id); }}
                                            className="flex-1 py-1.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-transform hover:scale-105"
                                        >
                                            <Download size={11} />
                                            Tải về
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedImage(img); }}
                                            className="w-7 py-1.5 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white rounded-lg flex items-center justify-center transition-transform hover:scale-105"
                                            title="Phóng to"
                                        >
                                            <Search size={12} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Loading placeholders */}
                {isGenerating && Array.from({ length: Math.max(0, expectedCount - images.length) }).map((_, idx) => (
                    <div key={`loading-${idx}`} className="glass-card rounded-2xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-center animate-pulse bg-gray-50">
                        <Loader2 className="animate-spin text-brand-orange mb-2" size={28} />
                        <div className="h-2 w-2/3 bg-gray-200 rounded mb-1.5" />
                        <div className="h-2 w-1/2 bg-gray-200 rounded" />
                        <span className="text-[9px] text-gray-400 mt-2">Đang xử lý...</span>
                    </div>
                ))}
            </div>

            {/* ── Lightbox Modal ── */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
                        onClick={() => setSelectedImage(null)}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
                            {/* Image */}
                            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                                <img
                                    src={selectedImage.url}
                                    alt="Zoomed Banner"
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                                />
                            </div>

                            {/* Edit input */}
                            <div className="mt-4 flex gap-2 w-full max-w-xl mx-auto">
                                <input
                                    type="text"
                                    value={lightboxPrompt}
                                    onChange={(e) => setLightboxPrompt(e.target.value)}
                                    placeholder="Nhập yêu cầu sửa ảnh (VD: Đổi nền đen, thêm logo...)"
                                    className="flex-1 bg-white/10 border border-white/20 text-white rounded-full px-4 py-2.5 outline-none focus:border-brand-orange focus:bg-white/20 transition-all placeholder-gray-400 text-sm"
                                />
                                <button
                                    onClick={handleLightboxRegenerate}
                                    disabled={!lightboxPrompt.trim()}
                                    className="bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-full font-bold transition-all flex items-center gap-1.5 text-sm"
                                >
                                    <Sparkles size={14} />
                                    Sửa ngay
                                </button>
                            </div>

                            {/* Top right controls */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={(e) => { e.stopPropagation(); downloadImage(selectedImage.url, selectedImage.id); }}
                                    className="p-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-full shadow-lg transition-transform hover:scale-105"
                                    title="Tải xuống"
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    onClick={() => setSelectedImage(null)}
                                    className="p-2.5 bg-white/10 hover:bg-white/30 text-white rounded-full shadow-lg backdrop-blur-md transition-colors"
                                    title="Đóng"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
