import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Store, Save, Check, ChevronDown, ChevronUp, Image as ImageIcon,
    MapPin, Phone, Globe, Palette, Loader2, Plus, X, Pipette,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BrandProfile, DEFAULT_BRAND_PROFILE } from '../../types';
import { cn } from '../../lib/utils';

interface BrandProfilePanelProps {
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

export default function BrandProfilePanel({ userId, brandProfile }: BrandProfilePanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<BrandProfile>(brandProfile ?? DEFAULT_BRAND_PROFILE);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Sync from props when brandProfile changes externally
    useEffect(() => {
        if (brandProfile) setProfile(brandProfile);
    }, [brandProfile]);

    const hasProfile = !!(brandProfile?.shopName);

    const set = (patch: Partial<BrandProfile>) => {
        setProfile(prev => ({ ...prev, ...patch }));
        setSaved(false);
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = async () => {
            const dataUrl = reader.result as string;
            set({ logo: dataUrl });
            // Auto-extract colors from logo
            setExtracting(true);
            const extracted = await extractColorsFromImage(dataUrl, profile.brandColors.length);
            setExtracting(false);
            if (extracted.length > 0) {
                const newColors = [...profile.brandColors];
                extracted.forEach((c, i) => { if (i < newColors.length) newColors[i] = c; });
                set({ logo: dataUrl, brandColors: newColors });
            }
        };
        reader.readAsDataURL(file);
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
        <section className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                type="button"
                onClick={() => setIsOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
            >
                <div className="flex items-center gap-2.5">
                    <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        hasProfile ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    )}>
                        <Store size={16} />
                    </div>
                    <div>
                        <span className="text-xs font-semibold text-gray-700 block leading-tight">Hồ sơ quán</span>
                        {hasProfile ? (
                            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                                <Check size={9} /> {brandProfile?.shopName}
                            </span>
                        ) : (
                            <span className="text-[10px] text-gray-400">Thiết lập 1 lần, tự động điền mãi</span>
                        )}
                    </div>
                </div>
                <div className="text-gray-400">{isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400 pt-2 leading-relaxed">
                                Lưu thông tin quán 1 lần — tự động điền vào banner, logo, mô tả mỗi khi tạo thiết kế.
                            </p>

                            {/* Logo upload */}
                            <div>
                                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Logo quán</label>
                                <div className="flex items-center gap-3">
                                    <div
                                        onClick={() => logoInputRef.current?.click()}
                                        className={cn(
                                            'w-14 h-14 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer transition-all overflow-hidden',
                                            profile.logo
                                                ? 'border-brand-orange bg-brand-orange/5'
                                                : 'border-gray-200 hover:border-brand-orange/50 bg-gray-50'
                                        )}
                                    >
                                        {profile.logo ? (
                                            <img src={profile.logo} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <ImageIcon size={18} className="text-gray-300" />
                                        )}
                                    </div>
                                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                    <div className="flex flex-col gap-1">
                                        {profile.logo && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={handleExtractColors}
                                                    disabled={extracting}
                                                    className="flex items-center gap-1 text-[10px] text-brand-orange hover:text-brand-orange/80 font-medium disabled:opacity-50"
                                                >
                                                    {extracting ? <Loader2 size={10} className="animate-spin" /> : <Pipette size={10} />}
                                                    Trích xuất màu từ logo
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => set({ logo: null })}
                                                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors text-left"
                                                >
                                                    Xóa logo
                                                </button>
                                            </>
                                        )}
                                        {!profile.logo && (
                                            <p className="text-[9px] text-gray-400 leading-tight">
                                                Tải logo lên để tự động<br />trích xuất màu thương hiệu
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Shop name */}
                            <div>
                                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Tên quán *</label>
                                <input
                                    type="text"
                                    value={profile.shopName}
                                    onChange={(e) => set({ shopName: e.target.value })}
                                    placeholder="VD: Quán Bún Bò Huế Cô Ba"
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Mô tả ngắn</label>
                                <textarea
                                    value={profile.description}
                                    onChange={(e) => set({ description: e.target.value })}
                                    placeholder="VD: Bún bò Huế truyền thống 20 năm, nước dùng đậm đà..."
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20 h-14 resize-none"
                                />
                            </div>

                            {/* Slogan */}
                            <div>
                                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block">Slogan</label>
                                <input
                                    type="text"
                                    value={profile.slogan}
                                    onChange={(e) => set({ slogan: e.target.value })}
                                    placeholder="VD: Hương vị cố đô giữa lòng Sài Gòn"
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                                />
                            </div>

                            {/* Brand Colors — simplified */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-mono uppercase text-gray-400 flex items-center gap-1">
                                        <Palette size={10} />
                                        Màu thương hiệu
                                        <span className="font-normal normal-case text-gray-300">
                                            ({profile.brandColors.length}/4 — {profile.brandColors.length === 1 ? 'chỉ màu chính' : `1 chính + ${profile.brandColors.length - 1} phụ`})
                                        </span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {profile.brandColors.map((color, idx) => (
                                        <div key={idx} className="relative group/color">
                                            {/* Color swatch — clicking opens native color picker */}
                                            <label
                                                className={cn(
                                                    'relative block w-8 h-8 rounded-lg cursor-pointer transition-all shadow-sm hover:scale-110 hover:shadow-md',
                                                    idx === 0 && 'ring-2 ring-offset-1 ring-brand-orange'
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
                                            {/* Remove button (not for primary color) */}
                                            {idx > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveColor(idx)}
                                                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-opacity"
                                                >
                                                    <X size={8} />
                                                </button>
                                            )}
                                            {/* Primary badge */}
                                            {idx === 0 && (
                                                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[7px] text-brand-orange font-bold whitespace-nowrap">
                                                    Chính
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add color button */}
                                    {profile.brandColors.length < 4 && (
                                        <button
                                            type="button"
                                            onClick={handleAddColor}
                                            className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-200 hover:border-brand-orange hover:text-brand-orange flex items-center justify-center text-gray-300 transition-all"
                                            title="Thêm màu phụ"
                                        >
                                            <Plus size={12} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-[9px] text-gray-400 mt-1.5">Click vào ô màu để chọn màu. Màu chính (khung cam) là màu đại diện thương hiệu.</p>
                            </div>

                            {/* Contact info */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block flex items-center gap-0.5">
                                        <MapPin size={9} /> Địa chỉ
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.address}
                                        onChange={(e) => set({ address: e.target.value })}
                                        placeholder="123 Nguyễn Huệ, Q.1"
                                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block flex items-center gap-0.5">
                                        <Phone size={9} /> SĐT
                                    </label>
                                    <input
                                        type="tel"
                                        value={profile.phone}
                                        onChange={(e) => set({ phone: e.target.value })}
                                        placeholder="0901 234 567"
                                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                                    />
                                </div>
                            </div>

                            {/* Fanpage */}
                            <div>
                                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1 block flex items-center gap-0.5">
                                    <Globe size={9} /> Fanpage / Website
                                </label>
                                <input
                                    type="url"
                                    value={profile.fanpage}
                                    onChange={(e) => set({ fanpage: e.target.value })}
                                    placeholder="https://facebook.com/quancoaba"
                                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-orange/20"
                                />
                            </div>

                            {/* Save */}
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !profile.shopName.trim() || !isDirty}
                                className={cn(
                                    'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all',
                                    saved
                                        ? 'bg-green-100 text-green-700'
                                        : isDirty
                                            ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                )}
                            >
                                {isSaving ? (
                                    <><Loader2 size={14} className="animate-spin" />Đang lưu...</>
                                ) : saved ? (
                                    <><Check size={14} />Đã lưu thành công!</>
                                ) : (
                                    <><Save size={14} />{isDirty ? 'Lưu hồ sơ quán' : 'Không có thay đổi'}</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
