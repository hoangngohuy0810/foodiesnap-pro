import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Store, Save, Check, ChevronDown, ChevronUp, Image as ImageIcon,
    X, MapPin, Phone, Globe, Palette, Loader2,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BrandProfile, DEFAULT_BRAND_PROFILE } from '../../types';
import { cn } from '../../lib/utils';

interface BrandProfilePanelProps {
    userId: string | undefined;
    brandProfile: BrandProfile | undefined;
}

const COLOR_PRESETS = [
    '#FF6321', '#E53E3E', '#DD6B20', '#D69E2E',
    '#38A169', '#3182CE', '#805AD5', '#D53F8C',
    '#1A1A1A', '#4A5568', '#FFFFFF', '#F7FAFC',
];

export default function BrandProfilePanel({ userId, brandProfile }: BrandProfilePanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [profile, setProfile] = useState<BrandProfile>(brandProfile ?? DEFAULT_BRAND_PROFILE);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [editingColorIdx, setEditingColorIdx] = useState<number | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Sync from props when brandProfile changes externally
    useEffect(() => {
        if (brandProfile) {
            setProfile(brandProfile);
        }
    }, [brandProfile]);

    const hasProfile = !!(brandProfile?.shopName);

    const set = (patch: Partial<BrandProfile>) => {
        setProfile(prev => ({ ...prev, ...patch }));
        setSaved(false);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            set({ logo: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    const handleColorChange = (idx: number, color: string) => {
        const newColors = [...profile.brandColors];
        newColors[idx] = color;
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
            {/* Header — always visible */}
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
                        <span className="text-xs font-semibold text-gray-700 block leading-tight">
                            Hồ sơ quán
                        </span>
                        {hasProfile ? (
                            <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                                <Check size={9} /> {brandProfile?.shopName}
                            </span>
                        ) : (
                            <span className="text-[10px] text-gray-400">
                                Thiết lập 1 lần, tự động điền mãi
                            </span>
                        )}
                    </div>
                </div>
                <div className="text-gray-400">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </button>

            {/* Collapsible content */}
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
                            {/* Hint */}
                            <p className="text-[10px] text-gray-400 pt-2 leading-relaxed">
                                Lưu thông tin quán 1 lần — tự động điền vào banner, logo, mô tả mỗi khi bạn tạo thiết kế.
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
                                    <input
                                        ref={logoInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleLogoUpload}
                                    />
                                    {profile.logo && (
                                        <button
                                            type="button"
                                            onClick={() => set({ logo: null })}
                                            className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            Xóa logo
                                        </button>
                                    )}
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

                            {/* Brand Colors */}
                            <div>
                                <label className="text-[10px] font-mono uppercase text-gray-400 mb-1.5 block flex items-center gap-1">
                                    <Palette size={10} />
                                    Màu thương hiệu
                                </label>
                                <div className="flex items-center gap-2">
                                    {profile.brandColors.map((color, idx) => (
                                        <div key={idx} className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setEditingColorIdx(editingColorIdx === idx ? null : idx)}
                                                className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-brand-orange transition-all shadow-sm"
                                                style={{ backgroundColor: color }}
                                                title={`Màu ${idx + 1}: ${color}`}
                                            />
                                            {editingColorIdx === idx && (
                                                <div className="absolute top-10 left-0 z-20 bg-white border border-gray-200 rounded-xl p-2 shadow-xl">
                                                    <div className="grid grid-cols-4 gap-1 mb-2">
                                                        {COLOR_PRESETS.map(c => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => { handleColorChange(idx, c); setEditingColorIdx(null); }}
                                                                className={cn(
                                                                    'w-6 h-6 rounded-md border transition-all hover:scale-110',
                                                                    color === c ? 'border-brand-orange ring-1 ring-brand-orange' : 'border-gray-200'
                                                                )}
                                                                style={{ backgroundColor: c }}
                                                            />
                                                        ))}
                                                    </div>
                                                    <input
                                                        type="color"
                                                        value={color}
                                                        onChange={(e) => handleColorChange(idx, e.target.value)}
                                                        className="w-full h-6 rounded cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <span className="text-[9px] text-gray-300 ml-1">Click để đổi</span>
                                </div>
                            </div>

                            {/* Contact info — compact 2-col */}
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

                            {/* Save button */}
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
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : saved ? (
                                    <>
                                        <Check size={14} />
                                        Đã lưu thành công!
                                    </>
                                ) : (
                                    <>
                                        <Save size={14} />
                                        {isDirty ? 'Lưu hồ sơ quán' : 'Không có thay đổi'}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
