import React, { useRef, useState, useEffect } from 'react';
import { LogoSettings } from '../../../types';

interface Props {
    settings: LogoSettings;
    onChange: (settings: LogoSettings) => void;
    aspectRatio: string;
    brandProfileLogo?: string | null;
}

export default function LogoSettingsPanel({ settings, onChange, aspectRatio, brandProfileLogo }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const { resizeImageFile } = await import('../../../lib/imageUtils');
                const dataUrl = await resizeImageFile(file, 800, 800);
                onChange({ ...settings, image: dataUrl });
            } catch (err) {
                console.error('Lỗi khi tải logo:', err);
                alert('Không thể xử lý ảnh, vui lòng thử file nhẹ/nhỏ hơn.');
            }
        }
    };

    const handleRemoveLogo = () => {
        onChange({ ...settings, image: null });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const setQuickPosition = (pos: 'top-left' | 'top-center' | 'bottom-right') => {
        let x = 15, y = 15;
        if (pos === 'top-center') { x = 50; y = 15; }
        else if (pos === 'bottom-right') { x = 85; y = 85; }
        onChange({ ...settings, positionX: x, positionY: y });
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        if (!settings.image) return;
        setIsDragging(true);
        updatePosition(e);
    };

    const updatePosition = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
        if (!containerRef.current) return;
        if ('touches' in e && e.cancelable) e.preventDefault();

        const rect = containerRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

        let x = ((clientX - rect.left) / rect.width) * 100;
        let y = ((clientY - rect.top) / rect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        onChange({ ...settings, positionX: x, positionY: y });
    };

    useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => { if (isDragging) updatePosition(e); };
        const handleUp = () => setIsDragging(false);

        if (isDragging) {
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove, { passive: false });
            window.addEventListener('touchend', handleUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleUp);
        };
    }, [isDragging, settings]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-gray-400">Chèn Logo</label>
                {settings.image && (
                    <button onClick={handleRemoveLogo} className="text-[9px] text-red-500 hover:text-red-700 font-medium">
                        Xóa Logo
                    </button>
                )}
            </div>

            {!settings.image ? (
                <div className="space-y-1.5">
                    {/* Restore from brand profile if available */}
                    {brandProfileLogo && (
                        <button
                            type="button"
                            onClick={() => onChange({ ...settings, image: brandProfileLogo })}
                            className="w-full flex items-center gap-2 px-3 py-2 bg-brand-orange/5 border border-brand-orange/20 hover:bg-brand-orange/10 rounded-xl transition-colors"
                        >
                            <img src={brandProfileLogo} alt="Brand logo" className="w-6 h-6 object-contain rounded" />
                            <span className="text-[10px] font-medium text-brand-orange">Dùng logo từ hồ sơ quán</span>
                        </button>
                    )}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                        <p className="text-xs font-medium text-gray-500">Tải lên Logo (PNG tách nền)</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">Click để chọn file</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="whiteBorder"
                            checked={settings.addWhiteBorder}
                            onChange={(e) => onChange({ ...settings, addWhiteBorder: e.target.checked })}
                            className="w-3.5 h-3.5 text-brand-orange rounded border-gray-300 focus:ring-brand-orange"
                        />
                        <label htmlFor="whiteBorder" className="text-[10px] text-gray-600 cursor-pointer">
                            Thêm viền trắng quanh logo
                        </label>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                        {[
                            { pos: 'top-left' as const, label: 'Trên trái' },
                            { pos: 'top-center' as const, label: 'Giữa trên' },
                            { pos: 'bottom-right' as const, label: 'Dưới phải' },
                        ].map(({ pos, label }) => (
                            <button
                                key={pos}
                                onClick={() => setQuickPosition(pos)}
                                className="py-1.5 text-[9px] font-medium bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-100"
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-[9px] text-gray-400 mb-1 block">
                            Kích thước: {settings.size}%
                        </label>
                        <input
                            type="range"
                            min="5"
                            max="50"
                            value={settings.size}
                            onChange={(e) => onChange({ ...settings, size: parseInt(e.target.value) })}
                            className="w-full accent-brand-orange"
                        />
                    </div>

                    <div>
                        <label className="text-[9px] text-gray-400 mb-1 block">
                            Xem trước & Kéo thả vị trí
                        </label>
                        <div className="flex justify-center bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <div
                                ref={containerRef}
                                onMouseDown={handleMouseDown}
                                onTouchStart={handleMouseDown}
                                className="relative bg-gray-200 rounded shadow-inner overflow-hidden cursor-crosshair"
                                style={{
                                    width: '100%',
                                    maxWidth: '180px',
                                    aspectRatio: aspectRatio.replace(':', '/'),
                                }}
                            >
                                {/* Checkerboard background */}
                                <div className="absolute inset-0 opacity-20" style={{
                                    backgroundImage: 'linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)',
                                    backgroundSize: '16px 16px',
                                    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                                }} />

                                {/* Logo preview */}
                                <div
                                    className="absolute pointer-events-none"
                                    style={{
                                        left: `${settings.positionX}%`,
                                        top: `${settings.positionY}%`,
                                        width: `${settings.size}%`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                >
                                    <img
                                        src={settings.image}
                                        alt="Logo Preview"
                                        className="w-full h-auto"
                                        style={settings.addWhiteBorder ? {
                                            filter: 'drop-shadow(1px 1px 0 white) drop-shadow(-1px -1px 0 white) drop-shadow(1px -1px 0 white) drop-shadow(-1px 1px 0 white)',
                                        } : {}}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png"
                className="hidden"
            />
        </div>
    );
}
