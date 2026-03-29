import React, { useState, useEffect } from 'react';
import {
    Upload,
    Settings2,
    Sparkles,
    Download,
    Maximize2,
    Trash2,
    Image as ImageIcon,
    Loader2,
    X,
    ShoppingCart,
    User,
    Zap,
    Star,
    Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn, fileToBase64, downloadImage } from '../lib/utils';
import { AspectRatio, ImageSize, GenerationSettings, GeneratedImage, ImageModelId, IMAGE_MODELS } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import OnboardingModal from '../components/OnboardingModal';

const STYLES = ['Chuyên nghiệp', 'Điện ảnh', 'Ấm áp & Thoải mái', 'Tối & Tâm trạng', 'Sáng & Thoáng', 'Tối giản'];
const LIGHTING = ['Ánh sáng tự nhiên', 'Đèn Studio', 'Ánh sáng bên', 'Giờ vàng', 'Neon / Rực rỡ'];
const ANGLES = ['Ngang tầm mắt', 'Góc 45 độ (Cổ điển)', 'Từ trên xuống', 'Góc thấp'];
const ASPECT_RATIOS: AspectRatio[] = ['1:1', '3:4', '4:3', '9:16', '16:9'];
const SIZES: ImageSize[] = ['1K', '2K', '4K'];

const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';

// Icon map for each model
const MODEL_ICONS: Record<ImageModelId, React.ElementType> = {
    'nano-banana': Zap,
    'nano-banana-2': Cpu,
    'nano-banana-pro': Star,
};

// Color map for each model
const MODEL_COLORS: Record<ImageModelId, string> = {
    'nano-banana': 'border-blue-400 bg-blue-50 text-blue-700',
    'nano-banana-2': 'border-brand-orange bg-brand-orange/10 text-brand-orange',
    'nano-banana-pro': 'border-purple-500 bg-purple-50 text-purple-700',
};

const MODEL_SELECTED_COLORS: Record<ImageModelId, string> = {
    'nano-banana': 'border-blue-500 bg-blue-500 text-white',
    'nano-banana-2': 'border-brand-orange bg-brand-orange text-white',
    'nano-banana-pro': 'border-purple-600 bg-purple-600 text-white',
};

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
        modelId: 'nano-banana-2',
    });

    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedImage[]>([]);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // Onboarding
    const [showOnboarding, setShowOnboarding] = useState(false);

    // Computed: selected model info & total cost
    const selectedModel = IMAGE_MODELS.find(m => m.id === settings.modelId) ?? IMAGE_MODELS[1];
    const totalCreditCost = selectedModel.creditCost * settings.count;

    useEffect(() => {
        if (
            user &&
            userProfile &&
            (userProfile as any).onboardingCompleted === false &&
            !showOnboarding
        ) {
            setShowOnboarding(true);
        }
    }, [user, userProfile?.uid]);

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
        if (!isAdmin && credits < totalCreditCost) {
            showToast(`Không đủ credits. Bạn có ${credits} credits, cần ${totalCreditCost}.`, 'error');
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

            let data: any = {};
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                try {
                    data = await response.json();
                } catch {
                    data = {};
                }
            } else {
                const text = await response.text().catch(() => '');
                if (text) console.error('Non-JSON server response:', text);
            }

            if (response.status === 402) {
                showToast('Không đủ credits. Hãy mua thêm để tiếp tục.', 'error');
                return;
            }

            if (!response.ok) {
                if (data.refunded > 0) {
                    showToast(`⚠️ Lỗi tạo ảnh. Đã hoàn ${data.refunded} credit(s) về tài khoản của bạn.`, 'warning');
                } else {
                    const statusMsg = response.status === 429
                        ? 'Quá nhiều yêu cầu. Vui lòng thử lại sau.'
                        : response.status === 404 || response.status === 502 || response.status === 504
                            ? 'Không thể kết nối đến máy chủ Backend. Vui lòng đảm bảo đã chạy chạy lệnh "npm start" hoặc kiểm tra lại mạng.'
                            : response.status >= 500
                                ? 'Lỗi máy chủ (500). Vui lòng thử lại sau.'
                                : data.error || 'Lỗi không xác định từ máy chủ khi tạo ảnh.';
                    throw new Error(statusMsg);
                }
                return;
            }

            const newResults = data.results || [];

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
        } catch {
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

                                {/* ── Model Selection ── */}
                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">
                                        Model AI
                                    </label>
                                    <div className="space-y-2">
                                        {IMAGE_MODELS.map(model => {
                                            const Icon = MODEL_ICONS[model.id];
                                            const isSelected = settings.modelId === model.id;
                                            return (
                                                <button
                                                    key={model.id}
                                                    onClick={() => setSettings({ ...settings, modelId: model.id })}
                                                    className={cn(
                                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left',
                                                        isSelected
                                                            ? MODEL_SELECTED_COLORS[model.id]
                                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                                    )}
                                                >
                                                    <div className={cn(
                                                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                                                        isSelected ? 'bg-white/20' : MODEL_COLORS[model.id]
                                                    )}>
                                                        <Icon size={15} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-semibold truncate">{model.label}</span>
                                                            {model.badge && (
                                                                <span className={cn(
                                                                    'text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                                                                    isSelected
                                                                        ? 'bg-white/25 text-white'
                                                                        : model.id === 'nano-banana-pro'
                                                                            ? 'bg-purple-100 text-purple-700'
                                                                            : 'bg-brand-orange/15 text-brand-orange'
                                                                )}>
                                                                    {model.badge}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={cn(
                                                            'text-[10px] truncate',
                                                            isSelected ? 'text-white/80' : 'text-gray-400'
                                                        )}>
                                                            {model.description}
                                                        </p>
                                                    </div>
                                                    <div className={cn(
                                                        'text-xs font-bold shrink-0',
                                                        isSelected ? 'text-white' : 'text-gray-500'
                                                    )}>
                                                        {model.creditCost === 0.5 ? '½' : model.creditCost} cr
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* ── Style ── */}
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

                                {/* ── Lighting ── */}
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

                                {/* ── Angle ── */}
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

                                {/* ── Background Prompt ── */}
                                <div>
                                    <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">Mô tả nền</label>
                                    <textarea
                                        value={settings.backgroundPrompt}
                                        onChange={(e) => setSettings({ ...settings, backgroundPrompt: e.target.value })}
                                        placeholder="VD: Bàn gỗ mộc mạc với các loại thảo mộc rải rác và nền bokeh ấm áp..."
                                        className="input-field text-sm h-20 resize-none"
                                    />
                                </div>

                                {/* ── Aspect ratio & Quality ── */}
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

                                {/* ── Count ── */}
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
                                <div className="rounded-xl bg-gray-50 px-3 py-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>
                                            Chi phí:{' '}
                                            <span className="font-bold text-brand-orange">
                                                {isAdmin
                                                    ? 'Miễn phí'
                                                    : `${totalCreditCost % 1 === 0 ? totalCreditCost : totalCreditCost.toFixed(1)} credit${totalCreditCost > 1 ? 's' : ''}`
                                                }
                                            </span>
                                        </span>
                                        {!isAdmin && (
                                            <span>
                                                Số dư:{' '}
                                                <span className={cn('font-bold', (userProfile?.credits ?? 0) < totalCreditCost ? 'text-red-500' : 'text-green-600')}>
                                                    {userProfile?.credits ?? 0}
                                                </span>
                                            </span>
                                        )}
                                        {isAdmin && (
                                            <span className="font-bold text-purple-600">👑 Admin</span>
                                        )}
                                    </div>
                                    {!isAdmin && settings.count > 1 && (
                                        <p className="text-[10px] text-gray-400">
                                            {selectedModel.creditCost === 0.5 ? '½' : selectedModel.creditCost} credit × {settings.count} ảnh = {totalCreditCost % 1 === 0 ? totalCreditCost : totalCreditCost.toFixed(1)} credits
                                        </p>
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
                                ) : (!isAdmin && (userProfile?.credits ?? 0) < totalCreditCost) ? (
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
                                    {results.map((img) => {
                                        const imgModel = IMAGE_MODELS.find(m => m.id === img.settings?.modelId);
                                        return (
                                            <motion.div
                                                key={img.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="group relative glass-card rounded-3xl overflow-hidden cursor-pointer"
                                                onClick={() => setEnlargedImage(img.url)}
                                            >
                                                <img src={img.url} alt="Generated Food" className="w-full aspect-square object-cover" />
                                                
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        downloadImage(img.url, `foodie-snap-${img.id}.png`);
                                                    }}
                                                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-brand-ink opacity-0 group-hover:opacity-100 hover:bg-brand-orange hover:text-white hover:scale-105 transition-all outline-none"
                                                    title="Tải xuống"
                                                >
                                                    <Download size={18} />
                                                </button>
                                                <div className="p-4 bg-white/90 backdrop-blur-sm flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-mono text-gray-400 uppercase">
                                                            {img.settings.style} • {img.settings.aspectRatio}
                                                        </p>
                                                        <p className="text-xs text-gray-500">{new Date(img.timestamp).toLocaleTimeString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {imgModel && (
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-[10px] font-semibold">
                                                                {imgModel.label}
                                                            </span>
                                                        )}
                                                        <div className="px-2 py-1 bg-brand-orange/10 text-brand-orange rounded text-[10px] font-bold uppercase tracking-tighter">
                                                            {img.settings.imageSize}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer */}
                <footer className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-xs">
                    <p>© 2026 FoodieSnap Pro. Powered by Gemini AI Image Generation.</p>
                    <div className="flex items-center gap-6">
                        <a href="/privacy-policy" className="hover:text-brand-orange transition-colors">Chính sách bảo mật</a>
                        <a href="/terms-of-service" className="hover:text-brand-orange transition-colors">Điều khoản dịch vụ</a>
                        <a href="/refund-policy" className="hover:text-brand-orange transition-colors">Chính sách hoàn tiền</a>
                    </div>
                </footer>
            </div>

            {/* Enlarged Image Modal */}
            <AnimatePresence>
                {enlargedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 sm:p-8"
                        onClick={() => setEnlargedImage(null)}
                    >
                        <button
                            onClick={() => setEnlargedImage(null)}
                            className="absolute top-6 right-6 lg:top-10 lg:right-10 w-12 h-12 bg-white/10 hover:bg-brand-orange hover:text-white rounded-full flex items-center justify-center text-gray-300 transition-all backdrop-blur-md z-10"
                        >
                            <X size={24} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            src={enlargedImage}
                            alt="Enlarged Food"
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <OnboardingModal
                open={showOnboarding}
                userName={userProfile?.displayName || user?.displayName || 'bạn'}
                onClose={handleOnboardingClose}
            />
        </>
    );
}
