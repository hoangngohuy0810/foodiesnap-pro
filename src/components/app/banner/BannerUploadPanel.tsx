import React, { useRef, useState } from 'react';
import { X, Upload, FileText, Maximize2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { BannerGenerationMode } from '../../../types';

// ── Expand Modal for long text editing ────────────────────────────────────────

function ExpandModal({
    title,
    value,
    onChange,
    placeholder,
    onClose,
}: {
    title: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-700">{title}</h3>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                        <X size={16} />
                    </button>
                </div>
                <textarea
                    autoFocus
                    rows={8}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 resize-none"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <button
                    onClick={onClose}
                    className="btn-primary w-full !py-2 text-sm"
                >
                    Xong
                </button>
            </div>
        </div>
    );
}

// ── Compact text input with expand button ─────────────────────────────────────

function CompactTextInput({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <div>
                <label className="text-[10px] font-mono uppercase text-gray-400 mb-0.5 block">{label}</label>
                <div className="flex gap-1">
                    <input
                        type="text"
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-orange/20 min-w-0"
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="shrink-0 w-7 h-7 flex items-center justify-center border border-gray-200 rounded-lg text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-colors bg-white"
                        title="Mở rộng để soạn thảo"
                    >
                        <Maximize2 size={11} />
                    </button>
                </div>
            </div>
            {expanded && (
                <ExpandModal
                    title={label}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    onClose={() => setExpanded(false)}
                />
            )}
        </>
    );
}

// ── Multi Image Upload ────────────────────────────────────────────────────────

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
        <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] font-mono uppercase text-gray-400 flex justify-between items-center">
                {label}
                <span className="text-[9px] font-normal normal-case bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {images.length} file
                </span>
            </label>

            <div
                className={cn(
                    'relative flex flex-col items-center justify-center w-full min-h-[70px] border-2 border-dashed rounded-xl transition-all p-1.5 cursor-pointer',
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
                    <div className="w-full grid grid-cols-4 gap-1 p-0.5">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative aspect-square group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                                {isPdf(img) ? (
                                    <div className="flex flex-col items-center justify-center text-red-500 p-1 text-center">
                                        <FileText size={16} />
                                        <span className="text-[7px] font-bold">PDF</span>
                                    </div>
                                ) : (
                                    <img src={img} alt={`Asset ${idx}`} className="w-full h-full object-cover" />
                                )}
                                <button
                                    onClick={(e) => handleRemove(idx, e)}
                                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X size={7} />
                                </button>
                            </div>
                        ))}
                        <div className="aspect-square flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg text-gray-400 hover:text-brand-orange hover:border-brand-orange transition-colors bg-gray-50">
                            <Upload size={12} />
                            <span className="text-[7px] mt-0.5">Thêm</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-2 px-4 text-center">
                        <Upload size={16} className="mb-1 text-gray-400" />
                        <p className="text-[9px] text-gray-500 font-medium">Nhấn để tải lên</p>
                        <p className="text-[8px] text-gray-400 mt-0.5">{description}</p>
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
                    className="self-end text-[8px] text-red-500 hover:text-red-600 underline"
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
    // Creative mode props
    bannerTitle?: string;
    onBannerTitleChange?: (v: string) => void;
    industry?: string;
    onIndustryChange?: (v: string) => void;
    onOpenProductPicker?: () => void;
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
    bannerTitle,
    onBannerTitleChange,
    industry,
    onIndustryChange,
    onOpenProductPicker,
}: BannerUploadPanelProps) {
    const isCreative = mode === 'creative';

    return (
        <section className="glass-card p-4 rounded-2xl space-y-3">
            {isCreative ? (
                /* ── Creative Mode UI ── */
                <div className="space-y-2.5">
                    {/* Info banner */}
                    <div className="bg-purple-50 border border-purple-100 p-2 rounded-lg text-[9px] text-purple-700 leading-relaxed">
                        <span className="font-bold">✨ Chế độ Tạo Mới:</span> Mô tả ý tưởng banner — AI sẽ thiết kế từ đầu mà không cần ảnh tham chiếu.
                    </div>

                    {/* Banner Title */}
                    <CompactTextInput
                        label="Tiêu đề banner *"
                        value={bannerTitle ?? ''}
                        onChange={onBannerTitleChange ?? (() => { })}
                        placeholder="VD: Flash Sale Cuối Tuần, Khai Trương Chi Nhánh Mới..."
                    />

                    {/* Industry */}
                    <CompactTextInput
                        label="Ngành nghề"
                        value={industry ?? ''}
                        onChange={onIndustryChange ?? (() => { })}
                        placeholder="VD: Ẩm thực, Thời trang, Mỹ phẩm..."
                    />

                    {/* Product Images (optional) */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-mono uppercase text-gray-400">
                                Ảnh sản phẩm (Tùy chọn)
                            </label>
                            {onOpenProductPicker && (
                                <button
                                    type="button"
                                    onClick={onOpenProductPicker}
                                    className="text-[9px] text-purple-500 hover:text-purple-700 font-semibold transition-colors"
                                >
                                    📦 Chọn từ kho SP
                                </button>
                            )}
                        </div>
                        <MultiImageUpload
                            label=""
                            description="Tải ảnh sản phẩm lên (hoặc để trống — AI sẽ tự vẽ)"
                            images={productImages}
                            onImagesChange={onProductImagesChange}
                        />
                    </div>

                    {/* Text Inputs */}
                    <CompactTextInput
                        label="Mô tả thương hiệu"
                        value={brandDescription}
                        onChange={onBrandDescriptionChange}
                        placeholder="VD: Quán cà phê sân vườn, phong cách vintage..."
                    />
                    <CompactTextInput
                        label="Thông tin khuyến mãi (Tùy chọn)"
                        value={promoInfo}
                        onChange={onPromoInfoChange}
                        placeholder="VD: Giảm 50%, Combo 99K, Free ship..."
                    />
                    <CompactTextInput
                        label="Yêu cầu tùy chỉnh (Tùy chọn)"
                        value={prompt}
                        onChange={onPromptChange}
                        placeholder="VD: Tone màu pastel, phong cách tối giản..."
                    />
                </div>
            ) : (
                /* ── Clone / Design Mode UI ── */
                <>
                    {/* Upload Section */}
                    <div className="space-y-2.5">
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
                                <div className="bg-purple-50 border border-purple-100 p-1.5 rounded-lg mb-1.5 text-[8px] text-purple-700">
                                    AI sẽ tự đọc thông tin từ file bạn tải lên (PDF, Ảnh) để tạo nội dung.
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

                    {/* Compact Text Inputs with expand buttons */}
                    <div className="space-y-2">
                        <CompactTextInput
                            label="Mô tả thương hiệu"
                            value={brandDescription}
                            onChange={onBrandDescriptionChange}
                            placeholder="VD: Thương hiệu thời trang cao cấp..."
                        />
                        <CompactTextInput
                            label="Thông tin khuyến mãi (Tùy chọn)"
                            value={promoInfo}
                            onChange={onPromoInfoChange}
                            placeholder="VD: Giảm 50%, Mua 1 tặng 1..."
                        />
                        <CompactTextInput
                            label="Yêu cầu tùy chỉnh (Tùy chọn)"
                            value={prompt}
                            onChange={onPromptChange}
                            placeholder="VD: Đổi nền xanh, thêm chữ..."
                        />
                    </div>
                </>
            )}
        </section>
    );
}
