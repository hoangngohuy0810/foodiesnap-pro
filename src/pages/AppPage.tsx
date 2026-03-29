import React, { useState, useEffect } from 'react';
import {
    Camera,
    Upload,
    Settings2,
    Sparkles,
    Download,
    Maximize2,
    Trash2,
    Image as ImageIcon,
    Loader2,
    X,
    Coins,
    ShoppingCart,
    User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, fileToBase64, downloadImage } from '../lib/utils';
import { AspectRatio, ImageSize, GenerationSettings, GeneratedImage } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import OnboardingModal from '../components/OnboardingModal';

const STYLES = ['Chuyên nghiệp', 'Điện ảnh', 'Ấm áp & Thoải mái', 'Tối & Tâm trạng', 'Sáng & Thoáng', 'Tối giản'];
const LIGHTING = ['Ánh sáng tự nhiên', 'Đèn Studio', 'Ánh sáng bên', 'Giờ vàng', 'Neon / Rực rỡ'];
const ANGLES = ['Ngang tầm mắt', 'Góc 45 độ (Cổ điển)', 'Từ trên xuống', 'Góc thấp'];
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const SIZES: ImageSize[] = ['1K', '2K', '4K'];

const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';

export default function AppPage() {
    const { user, userProfile, loading: authLoading, getIdToken } = useAuth();
    const { showToast } = useToast();
    const isAdmin = user?.email === ADMIN_EMAIL;

    const [foodImage, setFoodImage] = useState<File | null>(null);
    const [foodPreview, setFoodPreview] = useState<string | null>(null);
    const [bgImage, setBgImage] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);

    const [settings, setSettings] = useState<GenerationSettings>({
        aspectRatio: '1:1',
        imageSize: '1K',
        count: 1,
        style: 'Chuyên nghiệp',
        lighting: 'Ánh sáng tự nhiên',
        angle: 'Góc 45 độ (Cổ điển)',
        backgroundPrompt: '',
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedImage[]>([]);

    // Onboarding
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Only show onboarding once: when profile is fully loaded AND onboardingCompleted is explicitly false
        // Must check userProfile is loaded (not null) and field is strictly false (not undefined)
        if (
            user &&
            userProfile &&
            (userProfile as any).onboardingCompleted === false &&
            !showOnboarding // avoid re-triggering if already shown
        ) {
            setShowOnboarding(true);
        }
    }, [user, userProfile?.uid]); // only re-run when user or uid changes, NOT on every profile update

    const handleOnboardingClose = async () => {
        setShowOnboarding(false);
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), { onboardingCompleted: true });
            } catch {
                // silent fail
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'food' | 'bg') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'food') {
                setFoodImage(file);
                setFoodPreview(reader.result as string);
            } else {
                setBgImage(file);
                setBgPreview(reader.result as string);
            }
        };
        reader.readAsDataURL(file);
    };

    const generateImages = async () => {
        if (!user) {
            showToast('Vui lòng đăng nhập để tạo ảnh.', 'warning');
            return;
        }

        if (!foodImage) {
            showToast('Vui lòng tải ảnh món ăn lên trước.', 'warning');
            return;
        }

        const credits = userProfile?.credits ?? 0;
        if (!isAdmin && credits < settings.count) {
            showToast(`Không đủ credits. Bạn có ${credits} credits, cần ${settings.count}.`, 'error');
            return;
        }

        setIsGenerating(true);

        try {
            const foodBase64 = await fileToBase64(foodImage);
            const bgBase64 = bgImage ? await fileToBase64(bgImage) : null;
            const token = await getIdToken();

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    foodBase64,
                    foodType: foodImage.type,
                    bgBase64,
                    bgType: bgImage?.type,
                    settings,
                }),
            });

            // Safely parse JSON – server may return empty body or HTML on certain errors
            let data: any = {};
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch {
                    // JSON parse failed even though content-type said JSON
                    data = {};
                }
            } else {
                // Non-JSON response (HTML error page, empty body, rate-limit plain text, etc.)
                const text = await response.text().catch(() => '');
                if (text) console.error('Non-JSON server response:', text);
            }

            if (response.status === 402) {
                showToast('Không đủ credits. Hãy mua thêm để tiếp tục.', 'error');
                return;
            }

            if (!response.ok) {
                // Auto-refund: server trả về refunded
                if (data.refunded > 0) {
                    showToast(`⚠️ Lỗi tạo ảnh. Đã hoàn ${data.refunded} credit(s) về tài khoản của bạn.`, 'warning');
                } else {
                    const statusMsg = response.status === 429
                        ? 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
                        : response.status >= 500
                            ? 'Lỗi máy chủ. Vui lòng thử lại sau.'
                            : data.error || 'Lỗi server khi tạo ảnh.';
                    throw new Error(statusMsg);
                }
                return;
            }

            const newResults = data.results || [];

            // Check if server refunded some credits (partial success)
            if (data.refunded && data.refunded > 0) {
                showToast(`⚠️ Đã hoàn ${data.refunded} credit(s) do một số ảnh tạo thất bại.`, 'warning');
            }

            if (newResults.length > 0) {
                setResults(prev => [...newResults, ...prev]);
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#FF6321', '#F5F2ED', '#1A1A1A'],
                });
                showToast(`✨ Đã tạo thành công ${newResults.length} ảnh!`, 'success');
            } else {
                throw new Error('Không có ảnh nào được tạo. Vui lòng thử lại.');
            }
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Đã xảy ra lỗi trong quá trình tạo ảnh.', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleBatchDownload = async () => {
        if (results.length === 0) return;

        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();

        try {
            await Promise.all(
                results.map(async (img, idx) => {
                    const response = await fetch(img.url);
                    const blob = await response.blob();
                    zip.file(`foodie-snap-${idx + 1}.png`, blob);
                })
            );

            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'foodie-snaps.zip';
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            showToast('Không thể tải xuống tất cả ảnh cùng lúc do lỗi mạng.', 'error');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-orange" />
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen pb-20">
                <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Controls */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Upload Section */}
                        <section className="glass-card p-6 rounded-3xl space-y-4">
                            <h2 className="text-lg flex items-center gap-2">
                                <Upload size={20} className="text-brand-orange" />
                                Tải lên tài nguyên
                            </h2>

                            <div className="space-y-4">
                                {/* Food Upload */}
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'food')}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    <div
                                        className={cn(
                                            'border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center gap-2 text-center',
                                            foodPreview ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-200 hover:border-brand-orange/50'
                                        )}
                                    >
                                        {foodPreview ? (
                                            <img src={foodPreview} alt="Food" className="w-full h-32 object-cover rounded-xl" />
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-brand-orange transition-colors">
                                                    <ImageIcon size={20} />
                                                </div>
                                                <span className="text-sm font-medium">Tải ảnh món ăn lên</span>
                                                <span className="text-xs text-gray-400">Ảnh gốc món ăn của bạn</span>
                                            </>
                                        )}
                                    </div>
                                    {foodPreview && (
                                        <button
                                            onClick={() => { setFoodImage(null); setFoodPreview(null); }}
                                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm z-20 text-gray-400 hover:text-red-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                {/* Background Upload */}
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'bg')}
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    />
                                    <div
                                        className={cn(
                                            'border-2 border-dashed rounded-2xl p-4 transition-all flex flex-col items-center justify-center gap-2 text-center',
                                            bgPreview ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-200 hover:border-brand-orange/50'
                                        )}
                                    >
                                        {bgPreview ? (
                                            <img src={bgPreview} alt="Background" className="w-full h-32 object-cover rounded-xl" />
                                        ) : (
                                            <>
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-brand-orange transition-colors">
                                                    <ImageIcon size={20} />
                                                </div>
                                                <span className="text-sm font-medium">Nền tùy chỉnh (Tùy chọn)</span>
                                                <span className="text-xs text-gray-400">Tải lên bối cảnh của riêng bạn</span>
                                            </>
                                        )}
                                    </div>
                                    {bgPreview && (
                                        <button
                                            onClick={() => { setBgImage(null); setBgPreview(null); }}
                                            className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-sm z-20 text-gray-400 hover:text-red-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Settings Section */}
                        <section className="glass-card p-6 rounded-3xl space-y-6">
                            <h2 className="text-lg flex items-center gap-2">
                                <Settings2 size={20} className="text-brand-orange" />
                                Cài đặt Studio
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Phong cách hình ảnh</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {STYLES.map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setSettings({ ...settings, style: s })}
                                                className={cn(
                                                    'text-xs py-2 px-3 rounded-lg border transition-all',
                                                    settings.style === s ? 'border-brand-orange bg-brand-orange text-white' : 'border-gray-100 hover:border-gray-200'
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Ánh sáng</label>
                                    <select
                                        value={settings.lighting}
                                        onChange={(e) => setSettings({ ...settings, lighting: e.target.value })}
                                        className="input-field text-sm"
                                    >
                                        {LIGHTING.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Góc máy</label>
                                    <select
                                        value={settings.angle}
                                        onChange={(e) => setSettings({ ...settings, angle: e.target.value })}
                                        className="input-field text-sm"
                                    >
                                        {ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Mô tả nền</label>
                                    <textarea
                                        value={settings.backgroundPrompt}
                                        onChange={(e) => setSettings({ ...settings, backgroundPrompt: e.target.value })}
                                        placeholder="VD: Bàn gỗ mộc mạc với các loại thảo mộc rải rác và nền bokeh ấm áp..."
                                        className="input-field text-sm h-20 resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Tỉ lệ khung hình</label>
                                        <select
                                            value={settings.aspectRatio}
                                            onChange={(e) => setSettings({ ...settings, aspectRatio: e.target.value as AspectRatio })}
                                            className="input-field text-sm"
                                        >
                                            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Chất lượng</label>
                                        <select
                                            value={settings.imageSize}
                                            onChange={(e) => setSettings({ ...settings, imageSize: e.target.value as ImageSize })}
                                            className="input-field text-sm"
                                        >
                                            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Số lượng ảnh: {settings.count}</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="4"
                                        value={settings.count}
                                        onChange={(e) => setSettings({ ...settings, count: parseInt(e.target.value) })}
                                        className="w-full accent-brand-orange"
                                    />
                                </div>
                            </div>

                            {/* Credits cost indicator */}
                            {user && (
                                <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                                    <span>
                                        Chi phí: <span className="font-bold text-brand-orange">
                                            {isAdmin ? 'Miễn phí' : `${settings.count} credit${settings.count > 1 ? 's' : ''}`}
                                        </span>
                                    </span>
                                    {!isAdmin && (
                                        <span>
                                            Số dư:{' '}
                                            <span className={cn('font-bold', (userProfile?.credits ?? 0) < settings.count ? 'text-red-500' : 'text-green-600')}>
                                                {userProfile?.credits ?? 0}
                                            </span>
                                        </span>
                                    )}
                                    {isAdmin && (
                                        <span className="font-bold text-purple-600">👑 Admin</span>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={generateImages}
                                disabled={isGenerating || !foodImage}
                                className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Đang tạo...
                                    </>
                                ) : !user ? (
                                    <>
                                        <User size={18} />
                                        Đăng nhập để tạo ảnh
                                    </>
                                ) : (!isAdmin && (userProfile?.credits ?? 0) < settings.count) ? (
                                    <>
                                        <ShoppingCart size={18} />
                                        Mua credits để tiếp tục
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={18} />
                                        Nâng cấp ảnh
                                    </>
                                )}
                            </button>
                        </section>
                    </div>

                    {/* Right Column: Results */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Ảnh đã tạo</h2>
                            <div className="flex items-center gap-3">
                                {results.length > 0 && (
                                    <>
                                        <button
                                            onClick={handleBatchDownload}
                                            className="text-sm font-medium text-brand-orange flex items-center gap-2 hover:underline"
                                        >
                                            <Download size={16} />
                                            Tải xuống tất cả (.zip)
                                        </button>
                                        <button
                                            onClick={() => setResults([])}
                                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                            title="Xóa kết quả"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {results.length === 0 && !isGenerating ? (
                            <div className="h-[600px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-4">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                                    <ImageIcon size={40} />
                                </div>
                                <div className="text-center">
                                    <p className="font-medium">Chưa có ảnh nào được tạo</p>
                                    <p className="text-sm">
                                        {user ? 'Tải ảnh lên và nhấn "Nâng cấp ảnh" để bắt đầu' : 'Đăng nhập để bắt đầu tạo ảnh'}
                                    </p>
                                    {!user && (
                                        <p className="mt-3 text-xs text-brand-orange font-medium">
                                            Nhận 3 credits miễn phí khi đăng ký!
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <AnimatePresence mode="popLayout">
                                    {isGenerating && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="aspect-square glass-card rounded-3xl flex flex-col items-center justify-center space-y-4"
                                        >
                                            <Loader2 className="animate-spin text-brand-orange" size={40} />
                                            <p className="text-sm font-medium text-gray-500">Đang xử lý ảnh của bạn...</p>
                                        </motion.div>
                                    )}
                                    {results.map((img) => (
                                        <motion.div
                                            key={img.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group relative glass-card rounded-3xl overflow-hidden"
                                        >
                                            <img src={img.url} alt="Generated Food" className="w-full aspect-square object-cover" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button
                                                    onClick={() => downloadImage(img.url, `foodie-snap-${img.id}.png`)}
                                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-orange hover:text-white transition-all"
                                                    title="Tải xuống"
                                                >
                                                    <Download size={20} />
                                                </button>
                                                <button
                                                    onClick={() => window.open(img.url, '_blank')}
                                                    className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-orange hover:text-white transition-all"
                                                    title="Xem kích thước đầy đủ"
                                                >
                                                    <Maximize2 size={20} />
                                                </button>
                                            </div>
                                            <div className="p-4 bg-white/90 backdrop-blur-sm flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs font-mono text-gray-400 uppercase">
                                                        {img.settings.style} • {img.settings.aspectRatio}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{new Date(img.timestamp).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="px-2 py-1 bg-brand-orange/10 text-brand-orange rounded text-[10px] font-bold uppercase tracking-tighter">
                                                    {img.settings.imageSize}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-xs">
                    <p>© 2026 FoodieSnap Pro. Powered by Gemini 3.1 Flash Image.</p>
                    <div className="flex items-center gap-6">
                        <a href="/privacy-policy" className="hover:text-brand-orange transition-colors">Chính sách bảo mật</a>
                        <a href="/terms-of-service" className="hover:text-brand-orange transition-colors">Điều khoản dịch vụ</a>
                        <a href="/refund-policy" className="hover:text-brand-orange transition-colors">Chính sách hoàn tiền</a>
                    </div>
                </footer>
            </div>

            <OnboardingModal
                open={showOnboarding}
                userName={userProfile?.displayName || user?.displayName || 'bạn'}
                onClose={handleOnboardingClose}
            />
        </>
    );
}
