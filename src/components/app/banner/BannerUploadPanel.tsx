import React, { useRef, useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BannerGenerationMode } from '../../../types';

interface MultiImageUploadProps {
    label: string;
    description: string;
    images: string[];
    onImagesChange: (images: string[]) => void;
    accept?: string;
}

function MultiImageUpload({ label, description, images, onImagesChange, accept = 'image/*' }: MultiImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const processFiles = (files: FileList | null | undefined) => {
        if (!files || files.length === 0) return;
        const newImages: string[] = [];
        let processedCount = 0;
        const total = files.length;

        Array.from(files).forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                newImages.push(reader.result as string);
                processedCount++;
                if (processedCount === total) {
                    onImagesChange([...images, ...newImages]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemove = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newImages = [...images];
        newImages.splice(index, 1);
        onImagesChange(newImages);
    };

    const isPdf = (dataUrl: string) => dataUrl.startsWith('data:application/pdf');

    return (
        <div className="flex flex-col gap-1.5 w-full">
            <label className="text-[10px] font-mono uppercase text-gray-400 flex justify-between items-center">
                {label}
                <span className="text-[9px] font-normal normal-case bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {images.length} file
                </span>
            </label>

            <div
                className={cn(
                    'relative flex flex-col items-center justify-center w-full min-h-[90px] border-2 border-dashed rounded-xl transition-all p-2 cursor-pointer',
                    isDragging
                        ? 'border-brand-orange bg-brand-orange/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                )}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
            >
                {images.length > 0 ? (
                    <div className="w-full grid grid-cols-3 gap-1.5 p-1">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                                {isPdf(img) ? (
                                    <div className="flex flex-col items-center justify-center text-red-500 p-1 text-center">
                                        <FileText size={20} />
                                        <span className="text-[8px] font-bold mt-0.5">PDF</span>
                                    </div>
                                ) : (
                                    <img src={img} alt={`Asset ${idx}`} className="w-full h-full object-cover" />
                                )}
                                <button
                                    onClick={(e) => handleRemove(idx, e)}
                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={8} />
                                </button>
                            </div>
                        ))}
                        {/* Add button placeholder */}
                        <div className="aspect-square flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-colors bg-gray-50">
                            <Upload size={14} />
                            <span className="text-[8px] mt-0.5">Thêm</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-3 px-4 text-center">
                        <Upload size={20} className="mb-1.5 text-gray-400" />
                        <p className="text-[10px] text-gray-500 font-medium">Nhấn để tải lên</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{description}</p>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    multiple
                    onChange={(e) => processFiles(e.target.files)}
                />
            </div>
            {images.length > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); onImagesChange([]); }}
                    className="self-end text-[9px] text-red-500 hover:text-red-600 underline"
                >
                    Xóa tất cả
                </button>
            )}
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface BannerUploadPanelProps {
    mode: BannerGenerationMode;
    referenceImages: string[];
    onReferenceImagesChange: (images: string[]) => void;
    productImages: string[];
    onProductImagesChange: (images: string[]) => void;
    infoFiles: string[];
    onInfoFilesChange: (files: string[]) => void;
    brandDescription: string;
    onBrandDescriptionChange: (v: string) => void;
    promoInfo: string;
    onPromoInfoChange: (v: string) => void;
    prompt: string;
    onPromptChange: (v: string) => void;
}

export default function BannerUploadPanel({
    mode,
    referenceImages,
    onReferenceImagesChange,
    productImages,
    onProductImagesChange,
    infoFiles,
    onInfoFilesChange,
    brandDescription,
    onBrandDescriptionChange,
    promoInfo,
    onPromoInfoChange,
    prompt,
    onPromptChange,
}: BannerUploadPanelProps) {
    return (
        <section className="glass-card p-4 rounded-2xl space-y-4">
            {/* Upload Section */}
            <div className="space-y-3">
                <MultiImageUpload
                    label="Mẫu thiết kế (Reference)"
                    description="Tải lên mẫu banner bạn muốn học theo"
                    images={referenceImages}
                    onImagesChange={onReferenceImagesChange}
                />

                {mode === 'clone' ? (
                    <MultiImageUpload
                        label="Sản phẩm (Assets)"
                        description="Tải lên ảnh sản phẩm cần ghép"
                        images={productImages}
                        onImagesChange={onProductImagesChange}
                    />
                ) : (
                    <div>
                        <div className="bg-purple-50 border border-purple-100 p-2 rounded-lg mb-2 text-[9px] text-purple-700">
                            AI sẽ tự đọc thông tin từ file bạn tải lên (PDF, Ảnh chụp màn hình...) để tạo nội dung cho banner.
                        </div>
                        <MultiImageUpload
                            label="File Thông Tin (Info Source)"
                            description="Tải lên PDF hoặc Ảnh chứa thông tin"
                            images={infoFiles}
                            onImagesChange={onInfoFilesChange}
                            accept="image/*,application/pdf"
                        />
                    </div>
                )}
            </div>

            {/* Text Inputs */}
            <div className="space-y-3">
                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">
                        Mô tả thương hiệu
                    </label>
                    <textarea
                        rows={2}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 resize-none"
                        placeholder="VD: Thương hiệu thời trang cao cấp, tối giản..."
                        value={brandDescription}
                        onChange={(e) => onBrandDescriptionChange(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">
                        Thông tin khuyến mãi (Tùy chọn)
                    </label>
                    <textarea
                        rows={2}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 resize-none"
                        placeholder="VD: Giảm 50%, Mua 1 tặng 1, Freeship..."
                        value={promoInfo}
                        onChange={(e) => onPromoInfoChange(e.target.value)}
                    />
                </div>

                <div>
                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">
                        Yêu cầu tùy chỉnh (Tùy chọn)
                    </label>
                    <textarea
                        rows={2}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 resize-none"
                        placeholder="VD: Đổi nền sang màu xanh biển, thêm chữ 'Giảm giá mùa hè'..."
                        value={prompt}
                        onChange={(e) => onPromptChange(e.target.value)}
                    />
                </div>
            </div>
        </section>
    );
}
