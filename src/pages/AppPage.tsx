import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fileToBase64 } from '../lib/utils';
import { GenerationSettings, GeneratedImage, IMAGE_MODELS, IMAGE_SIZE_MULTIPLIER } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import OnboardingModal from '../components/OnboardingModal';

// ── sub-components ────────────────────────────────────────────────────────────
import UploadPanel, { SideDish } from '../components/app/UploadPanel';
import SettingsPanel from '../components/app/SettingsPanel';
import GenerationHistory from '../components/app/GenerationHistory';

// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';

const DEFAULT_SETTINGS: GenerationSettings = {
    aspectRatio: '1:1',
    imageSize: '1K',
    count: 1,
    style: 'Chuyên nghiệp',
    lighting: 'Ánh sáng tự nhiên',
    angle: 'Góc 45 độ (Cổ điển)',
    backgroundPrompt: '',
    modelId: 'nano-banana-2',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function AppPage() {
    const { user, userProfile, loading: authLoading, getIdToken } = useAuth();
    const { showToast } = useToast();
    const isAdmin = user?.email === ADMIN_EMAIL;

    // ── upload state ──
    const [foodImage, setFoodImage] = useState<File | null>(null);
    const [foodPreview, setFoodPreview] = useState<string | null>(null);
    const [bgImage, setBgImage] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [sideDishes, setSideDishes] = useState<SideDish[]>([]);

    // ── generation state ──
    const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
    const [isGenerating, setIsGenerating] = useState(false);
    const [sessionImages, setSessionImages] = useState<GeneratedImage[]>([]);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // ── onboarding ──
    const [showOnboarding, setShowOnboarding] = useState(false);

    // ── derived ──
    const selectedModel = IMAGE_MODELS.find(m => m.id === settings.modelId) ?? IMAGE_MODELS[1];
    const sizeMultiplier = IMAGE_SIZE_MULTIPLIER[settings.imageSize] ?? 1;
    const costPerImage = selectedModel.creditCost * sizeMultiplier;
    const totalCreditCost = costPerImage * settings.count;
    const credits = userProfile?.credits ?? 0;

    // ── effects ──
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

    // ── handlers: upload ──
    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        type: 'food' | 'bg'
    ) => {
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

    const handleOnboardingClose = async () => {
        setShowOnboarding(false);
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), { onboardingCompleted: true });
            } catch { /* silent */ }
        }
    };

    // ── handler: generate ──
    const generateImages = async () => {
        if (!user) { showToast('Vui lòng đăng nhập để tạo ảnh.', 'warning'); return; }
        if (!foodImage) { showToast('Vui lòng tải ảnh món ăn lên trước.', 'warning'); return; }
        if (!isAdmin && credits < totalCreditCost) {
            showToast(`Không đủ credits. Bạn có ${credits} credits, cần ${totalCreditCost}.`, 'error');
            return;
        }

        setIsGenerating(true);
        try {
            const foodBase64 = await fileToBase64(foodImage);
            const bgBase64 = bgImage ? await fileToBase64(bgImage) : null;
            const token = await getIdToken();

            // Encode side dishes to base64
            const sideDishesData = await Promise.all(
                sideDishes.map(async (d) => ({
                    base64: await fileToBase64(d.file),
                    mimeType: d.file.type || 'image/png',
                    description: d.description,
                }))
            );

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
                    sideDishes: sideDishesData,
                }),
            });

            let data: any = {};
            const ct = response.headers.get('content-type') || '';
            if (ct.includes('application/json')) {
                try { data = await response.json(); } catch { data = {}; }
            } else {
                const text = await response.text().catch(() => '');
                if (text) console.error('Non-JSON server response:', text);
            }

            if (response.status === 402) {
                showToast('Không đủ credits. Hãy mua thêm để tiếp tục.', 'error'); return;
            }

            if (!response.ok) {
                if (data.refunded > 0) {
                    showToast(`⚠️ Lỗi tạo ảnh. Đã hoàn ${data.refunded} credit(s).`, 'warning');
                } else {
                    const msg =
                        response.status === 429 ? 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' :
                            [404, 502, 504].includes(response.status) ? 'Không thể kết nối đến máy chủ Backend.' :
                                response.status >= 500 ? 'Lỗi máy chủ (500). Vui lòng thử lại sau.' :
                                    data.error || 'Lỗi không xác định từ máy chủ khi tạo ảnh.';
                    throw new Error(msg);
                }
                return;
            }

            if (data.refunded > 0) {
                showToast(`⚠️ Đã hoàn ${data.refunded} credit(s) do một số ảnh tạo thất bại.`, 'warning');
            }

            const newResults: GeneratedImage[] = data.results ?? [];
            if (newResults.length > 0) {
                setSessionImages(prev => [...newResults, ...prev]);
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#FF6321', '#F5F2ED', '#1A1A1A'] });
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

    // ── handler: batch download ──
    const handleBatchDownload = async () => {
        if (sessionImages.length === 0) return;
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        try {
            await Promise.all(
                sessionImages.map(async (img, idx) => {
                    const res = await fetch(img.url);
                    const blob = await res.blob();
                    zip.file(`foodie-snap-${idx + 1}.png`, blob);
                })
            );
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url; a.download = 'foodie-snaps.zip'; a.click();
            URL.revokeObjectURL(url);
        } catch {
            showToast('Không thể tải xuống tất cả ảnh cùng lúc do lỗi mạng.', 'error');
        }
    };

    // ── loading guard ──
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-orange" />
            </div>
        );
    }

    // ── render ──
    return (
        <>
            <div className="min-h-screen pb-20">
                <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ── Left column: controls ── */}
                    <div className="lg:col-span-4 space-y-4">
                        <UploadPanel
                            foodPreview={foodPreview}
                            bgPreview={bgPreview}
                            onFoodChange={(e) => handleFileChange(e, 'food')}
                            onBgChange={(e) => handleFileChange(e, 'bg')}
                            onFoodClear={() => { setFoodImage(null); setFoodPreview(null); }}
                            onBgClear={() => { setBgImage(null); setBgPreview(null); }}
                            sideDishes={sideDishes}
                            onSideDishesChange={setSideDishes}
                        />

                        <SettingsPanel
                            settings={settings}
                            onChange={setSettings}
                            isGenerating={isGenerating}
                            hasFoodImage={!!foodImage}
                            isLoggedIn={!!user}
                            isAdmin={isAdmin}
                            credits={credits}
                            costPerImage={costPerImage}
                            sizeMultiplier={sizeMultiplier}
                            totalCreditCost={totalCreditCost}
                            onGenerate={generateImages}
                        />
                    </div>

                    {/* ── Right column: history ── */}
                    <div className="lg:col-span-8">
                        <GenerationHistory
                            sessionImages={sessionImages}
                            isGenerating={isGenerating}
                            pendingCount={settings.count}
                            isLoggedIn={!!user}
                            userId={user?.uid}
                            onEnlarge={setEnlargedImage}
                            onClearSession={() => setSessionImages([])}
                            onBatchDownload={handleBatchDownload}
                        />
                    </div>
                </main>

                {/* ── Footer ── */}
                <footer className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-xs">
                    <p>© 2026 FoodieSnap Pro. Powered by Gemini AI Image Generation.</p>
                    <div className="flex items-center gap-6">
                        <a href="/privacy-policy" className="hover:text-brand-orange transition-colors">Chính sách bảo mật</a>
                        <a href="/terms-of-service" className="hover:text-brand-orange transition-colors">Điều khoản dịch vụ</a>
                        <a href="/refund-policy" className="hover:text-brand-orange transition-colors">Chính sách hoàn tiền</a>
                    </div>
                </footer>
            </div>

            {/* ── Enlarged image modal ── */}
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
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            src={enlargedImage}
                            alt="Enlarged Food"
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Onboarding ── */}
            <OnboardingModal
                open={showOnboarding}
                userName={userProfile?.displayName || user?.displayName || 'bạn'}
                onClose={handleOnboardingClose}
            />
        </>
    );
}
