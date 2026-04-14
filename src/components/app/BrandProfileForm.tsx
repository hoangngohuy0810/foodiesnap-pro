import React, { useState, useRef, useEffect } from 'react';
import {
    Save, Check, Image as ImageIcon,
    MapPin, Phone, Globe, Palette, Loader2, Plus, X, Pipette,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BrandProfile, DEFAULT_BRAND_PROFILE } from '../../types';
import { cn } from '../../lib/utils';

interface BrandProfileFormProps {
    userId: string | undefined;
    brandProfile: BrandProfile | undefined;
}

// ── Extract dominant colors from an image using Canvas ────────────────────────
async function extractColorsFromImage(dataUrl: string, count: number = 3): Promise<string[]> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 64; // sample at small size for speed
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve([]); return; }
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            // Bucket pixels into 32-step color buckets and count
            const buckets: Record<string, number> = {};
            for (let i = 0; i < data.length; i += 4) {
                const a = data[i + 3];
                if (a < 30) continue; // skip transparent
                const r = Math.round(data[i] / 32) * 32;
                const g = Math.round(data[i + 1] / 32) * 32;
                const b = Math.round(data[i + 2] / 32) * 32;
                const key = `${r},${g},${b}`;
                buckets[key] = (buckets[key] || 0) + 1;
            }

            // Sort by frequency, filter near-white and near-black, take top N
            const sorted = Object.entries(buckets)
                .sort((a, b) => b[1] - a[1])
                .map(([k]) => k.split(',').map(Number))
                .filter(([r, g, b]) => {
                    const brightness = (r + g + b) / 3;
                    return brightness > 30 && brightness < 230; // avoid pure black/white
                });

            const colors: string[] = [];
            for (const [r, g, b] of sorted) {
                if (colors.length >= count) break;
                // Avoid too-similar colors
                const tooSimilar = colors.some(existing => {
                    const er = parseInt(existing.slice(1, 3), 16);
                    const eg = parseInt(existing.slice(3, 5), 16);
                    const eb = parseInt(existing.slice(5, 7), 16);
                    return Math.abs(r - er) + Math.abs(g - eg) + Math.abs(b - eb) < 60;
                });
                if (!tooSimilar) {
                    colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
                }
            }
            resolve(colors);
        };
        img.onerror = () => resolve([]);
        img.src = dataUrl;
    });
}

export default function BrandProfileForm({ userId, brandProfile }: BrandProfileFormProps) {
    const [profile, setProfile] = useState<BrandProfile>(brandProfile ?? DEFAULT_BRAND_PROFILE);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Sync from props when brandProfile changes externally
    useEffect(() => {
        if (brandProfile) setProfile(brandProfile);
    }, [brandProfile]);

    const set = (patch: Partial<BrandProfile>) => {
        setProfile(prev => ({ ...prev, ...patch }));
        setSaved(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExtracting(true);
        try {
            const { resizeImageFile } = await import('../../lib/imageUtils');
            const dataUrl = await resizeImageFile(file, 800, 800);
            set({ logo: dataUrl });

            // Auto-extract colors from logo
            const extracted = await extractColorsFromImage(dataUrl, profile.brandColors.length);
            if (extracted.length > 0) {
                const newColors = [...profile.brandColors];
                extracted.forEach((c, i) => { if (i < newColors.length) newColors[i] = c; });
                set({ logo: dataUrl, brandColors: newColors });
            }
        } catch (error) {
            console.error('Lỗi khi xử lý logo:', error);
            alert('Không thể xử lý ảnh, vui lòng thử file nhẹ/nhỏ hơn.');
        } finally {
            setExtracting(false);
        }
    };

    const handleExtractColors = async () => {
        if (!profile.logo) return;
        setExtracting(true);
        const extracted = await extractColorsFromImage(profile.logo, profile.brandColors.length);
        setExtracting(false);
        if (extracted.length > 0) {
            const newColors = [...profile.brandColors];
            extracted.forEach((c, i) => { if (i < newColors.length) newColors[i] = c; });
            set({ brandColors: newColors });
        }
    };

    const handleColorChange = (idx: number, color: string) => {
        const newColors = [...profile.brandColors];
        newColors[idx] = color;
        set({ brandColors: newColors });
    };

    const handleAddColor = () => {
        if (profile.brandColors.length >= 4) return;
        set({ brandColors: [...profile.brandColors, '#CCCCCC'] });
    };

    const handleRemoveColor = (idx: number) => {
        if (profile.brandColors.length <= 1) return;
        const newColors = profile.brandColors.filter((_, i) => i !== idx);
        set({ brandColors: newColors });
    };

    const handleSave = async () => {
        if (!userId) return;
        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'users', userId), { brandProfile: profile });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save brand profile:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const isDirty = JSON.stringify(profile) !== JSON.stringify(brandProfile ?? DEFAULT_BRAND_PROFILE);

    return (
        <div className="space-y-6">
            {/* Row 1: Logo & Basic Info */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Logo section */}
                <div className="shrink-0 flex flex-col items-center sm:items-start gap-2">
                    <label className="text-xs font-mono uppercase text-gray-400">Logo thương hiệu</label>
                    <div
                        onClick={() => logoInputRef.current?.click()}
                        className={cn(
                            'w-32 h-32 rounded-2xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden',
                            profile.logo
                                ? 'border-brand-orange bg-brand-orange/5'
                                : 'border-gray-200 hover:border-brand-orange/50 bg-gray-50'
                        )}
                    >
                        {profile.logo ? (
                            <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <ImageIcon size={28} className="mb-2 opacity-50" />
                                <span className="text-[11px] font-medium text-center px-4 leading-tight">Tải lên logo</span>
                            </div>
                        )}
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />

                    <div className="flex flex-col gap-1.5 mt-1 w-full text-center sm:text-left">
                        {profile.logo && (
                            <>
                                <button
                                    type="button"
                                    onClick={handleExtractColors}
                                    disabled={extracting}
                                    className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-brand-orange hover:text-brand-orange/80 font-semibold disabled:opacity-50 transition-colors"
                                >
                                    {extracting ? <Loader2 size={12} className="animate-spin" /> : <Pipette size={12} />}
                                    Lấy màu từ logo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => set({ logo: null })}
                                    className="text-[11px] text-red-400 hover:text-red-600 transition-colors"
                                >
                                    Xóa logo
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Name & Industry */}
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 block">Tên thương hiệu / Tên quán *</label>
                        <input
                            type="text"
                            value={profile.shopName}
                            onChange={(e) => set({ shopName: e.target.value })}
                            placeholder="VD: FoodieSnap Cafe"
                            className="input-field text-sm font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 block">Ngành nghề kinh doanh</label>
                        <input
                            type="text"
                            value={profile.industry}
                            onChange={(e) => set({ industry: e.target.value })}
                            placeholder="VD: Ẩm thực, Quán nước, Thời trang..."
                            className="input-field text-sm"
                        />
                        <p className="text-xs text-gray-400 mt-1">AI sẽ dựa vào đây để chọn phong cách thiết kế phù hợp nhất.</p>
                    </div>

                    <div>
                        <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 block">Slogan / Câu khẩu hiệu</label>
                        <input
                            type="text"
                            value={profile.slogan}
                            onChange={(e) => set({ slogan: e.target.value })}
                            placeholder="VD: Tinh hoa ẩm thực Việt"
                            className="input-field text-sm"
                        />
                    </div>
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* Row 2: Description & Colors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 block">Mô tả ngắn về thương hiệu</label>
                    <textarea
                        value={profile.description}
                        onChange={(e) => set({ description: e.target.value })}
                        placeholder="VD: Phục vụ cà phê nguyên chất và các loại bánh ngọt tự làm, không gian vintage cổ điển..."
                        rows={4}
                        className="input-field text-sm resize-none"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-mono uppercase text-gray-400 flex items-center gap-1.5">
                            <Palette size={12} />
                            Màu sắc thương hiệu
                        </label>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-medium">
                            {profile.brandColors.length}/4 màu
                        </span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {profile.brandColors.map((color, idx) => (
                            <div key={idx} className="relative group/color flex flex-col items-center gap-1.5">
                                {/* Color swatch */}
                                <label
                                    className={cn(
                                        'relative block w-10 h-10 rounded-xl cursor-pointer transition-all shadow-sm hover:scale-110 hover:shadow-md',
                                        idx === 0 && 'ring-2 ring-offset-2 ring-brand-orange'
                                    )}
                                    style={{ backgroundColor: color }}
                                    title={idx === 0 ? `Màu chính: ${color}` : `Màu phụ ${idx}: ${color}`}
                                >
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => handleColorChange(idx, e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-lg"
                                    />
                                </label>

                                {/* Label */}
                                <span className={cn(
                                    "text-[10px] font-bold uppercase",
                                    idx === 0 ? "text-brand-orange" : "text-gray-400"
                                )}>
                                    {idx === 0 ? 'Màu chính' : `Màu ${idx + 1}`}
                                </span>

                                {/* Remove button */}
                                {idx > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveColor(idx)}
                                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-all hover:bg-red-600 hover:scale-110 shadow-sm"
                                    >
                                        <X size={10} strokeWidth={3} />
                                    </button>
                                )}
                            </div>
                        ))}

                        {/* Add color button */}
                        {profile.brandColors.length < 4 && (
                            <button
                                type="button"
                                onClick={handleAddColor}
                                className="w-10 h-10 mb-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-orange hover:bg-brand-orange/5 hover:text-brand-orange flex items-center justify-center text-gray-400 transition-all"
                                title="Thêm màu phụ"
                            >
                                <Plus size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <hr className="border-gray-100" />

            {/* Row 3: Contact Info */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Thông tin liên hệ</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                            <MapPin size={11} /> Địa chỉ
                        </label>
                        <input
                            type="text"
                            value={profile.address}
                            onChange={(e) => set({ address: e.target.value })}
                            placeholder="VD: 123 Nguyễn Huệ, Q.1"
                            className="input-field text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                            <Phone size={11} /> Số điện thoại
                        </label>
                        <input
                            type="tel"
                            value={profile.phone}
                            onChange={(e) => set({ phone: e.target.value })}
                            placeholder="VD: 0901 234 567"
                            className="input-field text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-mono uppercase text-gray-400 mb-1.5 flex items-center gap-1">
                            <Globe size={11} /> Website / Fanpage
                        </label>
                        <input
                            type="url"
                            value={profile.fanpage}
                            onChange={(e) => set({ fanpage: e.target.value })}
                            placeholder="VD: facebook.com/cuahang"
                            className="input-field text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving || !profile.shopName.trim() || !isDirty}
                    className={cn(
                        'flex items-center justify-center gap-2 py-3 px-8 rounded-xl text-sm font-bold transition-all shadow-sm',
                        saved
                            ? 'bg-green-500 text-white'
                            : isDirty
                                ? 'bg-brand-orange text-white hover:bg-brand-orange/90 hover:shadow-md hover:-translate-y-0.5'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                >
                    {isSaving ? (
                        <><Loader2 size={16} className="animate-spin" /> Đang lưu...</>
                    ) : saved ? (
                        <><Check size={16} strokeWidth={3} /> Đã lưu thành công!</>
                    ) : (
                        <><Save size={16} /> {isDirty ? 'Lưu cập nhật hồ sơ' : 'Đã cập nhật mới nhất'}</>
                    )}
                </button>
            </div>
        </div>
    );
}
