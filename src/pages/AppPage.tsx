import React, { useState, useEffect } from 'react';
import { Loader2, X, UtensilsCrossed, LayoutTemplate, Zap, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { fileToBase64 } from '../lib/utils';
import {
    GenerationSettings, GeneratedImage, IMAGE_MODELS, IMAGE_SIZE_MULTIPLIER,
    BannerGenerationSettings, BannerGeneratedImage, BannerGenerationState,
    DEFAULT_BANNER_SETTINGS, BannerPurpose,
} from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import OnboardingModal from '../components/OnboardingModal';

// ── Food sub-components ───────────────────────────────────────────────────────
import UploadPanel, { SideDish } from '../components/app/UploadPanel';
import SettingsPanel from '../components/app/SettingsPanel';
import QuickModePanel from '../components/app/QuickModePanel';

// ── Brand Profile ─────────────────────────────────────────────────────────────
import BrandProfilePanel from '../components/app/BrandProfilePanel';

// ── Banner sub-components ─────────────────────────────────────────────────────
import BannerUploadPanel from '../components/app/banner/BannerUploadPanel';
import BannerSettingsPanel from '../components/app/banner/BannerSettingsPanel';
import BannerGallery from '../components/app/banner/BannerGallery';

// ── Shared history ────────────────────────────────────────────────────────────
import GenerationHistory from '../components/app/GenerationHistory';

// ── Services ──────────────────────────────────────────────────────────────────
import { generateCreativeBanner, editBanner } from '../lib/bannerService';
import ProductPickerModal from '../components/app/banner/ProductPickerModal';
import { applyLogoToImage } from '../lib/imageUtils';

// ─────────────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';

type AppTab = 'food' | 'banner';

const DEFAULT_FOOD_SETTINGS: GenerationSettings = {
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

    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<AppTab>('food');

    // ── Quick Mode state (default: quick for new users, saved in localStorage) ──
    const [isQuickMode, setIsQuickMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('foodiesnap-quick-mode');
        return saved !== null ? saved === 'true' : true; // default: quick mode ON
    });

    const toggleQuickMode = (val: boolean) => {
        setIsQuickMode(val);
        localStorage.setItem('foodiesnap-quick-mode', String(val));
    };

    // ══════════════════════════════════════════════════════════════════════════
    // SHARED STATE — unified session images from both food & banner
    // ══════════════════════════════════════════════════════════════════════════
    const [sessionImages, setSessionImages] = useState<GeneratedImage[]>([]);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // ══════════════════════════════════════════════════════════════════════════
    // FOOD TAB STATE
    // ══════════════════════════════════════════════════════════════════════════
    const [foodImage, setFoodImage] = useState<File | null>(null);
    const [foodPreview, setFoodPreview] = useState<string | null>(null);
    const [bgImage, setBgImage] = useState<File | null>(null);
    const [bgPreview, setBgPreview] = useState<string | null>(null);
    const [sideDishes, setSideDishes] = useState<SideDish[]>([]);
    const [foodSettings, setFoodSettings] = useState<GenerationSettings>(() => {
        const saved = localStorage.getItem('foodiesnap-food-settings');
        if (saved) {
            try { return JSON.parse(saved); } catch { }
        }
        return DEFAULT_FOOD_SETTINGS;
    });
    const [isFoodGenerating, setIsFoodGenerating] = useState(false);

    // Persist food settings to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('foodiesnap-food-settings', JSON.stringify(foodSettings));
    }, [foodSettings]);

    // Quick mode uses user's saved detailed settings but forces count to 1
    const QUICK_SETTINGS: GenerationSettings = {
        ...foodSettings,
        count: 1,
    };
    const quickCreditCost = (IMAGE_MODELS.find(m => m.id === QUICK_SETTINGS.modelId)?.creditCost ?? 2) * (IMAGE_SIZE_MULTIPLIER[QUICK_SETTINGS.imageSize] ?? 1);

    // ══════════════════════════════════════════════════════════════════════════
    // BANNER TAB STATE
    // ══════════════════════════════════════════════════════════════════════════
    const [bannerSettings, setBannerSettings] = useState<BannerGenerationSettings>(DEFAULT_BANNER_SETTINGS);
    const [referenceImages, setReferenceImages] = useState<string[]>([]);
    const [productImages, setProductImages] = useState<string[]>([]);
    const [venueImages, setVenueImages] = useState<string[]>([]);
    const [brandDescription, setBrandDescription] = useState('');
    const [promoInfo, setPromoInfo] = useState('');
    const [bannerPrompt, setBannerPrompt] = useState('');
    const [bannerTitle, setBannerTitle] = useState('');
    const [industry, setIndustry] = useState('');
    const [bannerPurpose, setBannerPurpose] = useState<BannerPurpose>('promo');
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [bannerState, setBannerState] = useState<BannerGenerationState>({
        isGenerating: false,
        error: null,
        results: [],
    });

    // ── Brand Profile auto-fill tracking ──
    const [brandProfileApplied, setBrandProfileApplied] = useState(false);
    // ── Track if user manually removed logo in banner session (don't re-auto-fill) ──
    const [logoManuallyRemoved, setLogoManuallyRemoved] = useState(false);

    // ── onboarding ──
    const [showOnboarding, setShowOnboarding] = useState(false);

    // ── derived (food) ──
    const selectedModel = IMAGE_MODELS.find(m => m.id === foodSettings.modelId) ?? IMAGE_MODELS[1];
    const sizeMultiplier = IMAGE_SIZE_MULTIPLIER[foodSettings.imageSize] ?? 1;
    const costPerImage = selectedModel.creditCost * sizeMultiplier;
    const totalCreditCost = costPerImage * foodSettings.count;
    const credits = userProfile?.credits ?? 0;

    // ── derived: combined generating state for history skeleton ──
    const isAnyGenerating = isFoodGenerating || bannerState.isGenerating;
    const pendingCount = isFoodGenerating
        ? (isQuickMode ? 1 : foodSettings.count)
        : (bannerState.isGenerating ? bannerSettings.quantity : 0);

    // ── Brand Profile ──
    const brandProfile = userProfile?.brandProfile;

    // ── effects ──

    // Auto-fill banner fields from Brand Profile when switching to banner tab
    useEffect(() => {
        if (activeTab === 'banner' && brandProfile && !brandProfileApplied) {
            // Auto-fill brand description if empty
            if (!brandDescription && brandProfile.description) {
                const parts = [brandProfile.description];
                if (brandProfile.slogan) parts.push(brandProfile.slogan);
                if (brandProfile.shopName) parts.unshift(brandProfile.shopName);
                setBrandDescription(parts.join(' — '));
            }
            // Auto-fill industry from brand profile
            if (!industry && brandProfile.industry) {
                setIndustry(brandProfile.industry);
            }
            // Auto-fill logo only if user hasn't manually removed it this session
            if (!bannerSettings.logo.image && brandProfile.logo && !logoManuallyRemoved) {
                setBannerSettings(prev => ({
                    ...prev,
                    logo: { ...prev.logo, image: brandProfile.logo },
                }));
            }
            setBrandProfileApplied(true);
        }
    }, [activeTab, brandProfile]);

    // Interceptor: detect when user removes logo from banner settings (image goes null)
    // to prevent re-auto-fill from brand profile
    const handleBannerSettingsChange = (newSettings: BannerGenerationSettings) => {
        // Detect manual logo removal: image was set, now becomes null
        if (bannerSettings.logo.image && !newSettings.logo.image) {
            setLogoManuallyRemoved(true);
        }
        // Detect manual logo upload: user added a new logo → reset removed flag
        if (!bannerSettings.logo.image && newSettings.logo.image) {
            setLogoManuallyRemoved(false);
        }
        setBannerSettings(newSettings);
    };

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

    // Re-apply logo when banner logo settings change
    useEffect(() => {
        const reapplyLogos = async () => {
            if (bannerState.results.length === 0) return;

            const updatedResults = await Promise.all(
                bannerState.results.map(async (img) => {
                    if (!img.rawUrl) return img;
                    let newUrl = img.rawUrl;
                    if (bannerSettings.logo.image) {
                        newUrl = await applyLogoToImage(img.rawUrl, bannerSettings.logo);
                    }
                    return { ...img, url: newUrl };
                })
            );

            setBannerState(prev => {
                if (prev.results.length !== updatedResults.length) return prev;
                const mergedResults = prev.results.map((prevImg, i) => ({
                    ...prevImg,
                    url: updatedResults[i].url,
                }));
                return { ...prev, results: mergedResults };
            });
        };
        reapplyLogos();
    }, [bannerSettings.logo]);

    // ══════════════════════════════════════════════════════════════════════════
    // FOOD HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

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

    const generateFoodImages = async (useQuickSettings = false) => {
        if (!user) { showToast('Vui lòng đăng nhập để tạo ảnh.', 'warning'); return; }
        if (!foodImage) { showToast('Vui lòng tải ảnh món ăn lên trước.', 'warning'); return; }

        const activeSettings = useQuickSettings ? QUICK_SETTINGS : foodSettings;
        const activeCost = useQuickSettings ? quickCreditCost : totalCreditCost;

        if (!isAdmin && credits < activeCost) {
            showToast(`Không đủ credits. Bạn có ${credits} credits, cần ${activeCost}.`, 'error');
            return;
        }

        setIsFoodGenerating(true);
        try {
            // Không cần crop input — API đã hỗ trợ imageConfig.aspectRatio để kiểm soát tỷ lệ output.
            // Giữ nguyên ảnh gốc để AI có thêm context (crop input có thể làm mất nội dung quan trọng).
            const foodBase64 = await fileToBase64(foodImage);
            const bgBase64 = bgImage ? await fileToBase64(bgImage) : null;
            const token = await getIdToken();

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
                    settings: activeSettings,
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

            const newResults: GeneratedImage[] = (data.results ?? []).map((r: any) => ({
                ...r,
                type: 'food' as const,
            }));
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
            setIsFoodGenerating(false);
        }
    };

    const handleBatchDownload = async () => {
        if (sessionImages.length === 0) return;
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        try {
            await Promise.all(
                sessionImages.map(async (img, idx) => {
                    const res = await fetch(img.url);
                    const blob = await res.blob();
                    const prefix = img.type === 'banner' ? 'banner' : 'foodie-snap';
                    zip.file(`${prefix}-${idx + 1}.png`, blob);
                })
            );
            const content = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url; a.download = 'foodiesnap-session.zip'; a.click();
            URL.revokeObjectURL(url);
        } catch {
            showToast('Không thể tải xuống tất cả ảnh cùng lúc do lỗi mạng.', 'error');
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // BANNER HANDLERS
    // ══════════════════════════════════════════════════════════════════════════

    const generateBannerImages = async () => {
        if (!user) { showToast('Vui lòng đăng nhập để tạo banner.', 'warning'); return; }
        if (!bannerTitle.trim()) {
            showToast('Vui lòng nhập tiêu đề banner.', 'warning'); return;
        }

        setBannerState({ isGenerating: true, error: null, results: [] });

        try {
            const token = await getIdToken();

            const images = await generateCreativeBanner(
                token,
                bannerTitle,
                industry,
                bannerPurpose,
                brandDescription,
                promoInfo,
                bannerPrompt,
                productImages,
                brandProfile?.brandColors ?? [],
                bannerSettings.logo.image ?? null,
                bannerSettings,
                referenceImages,
                venueImages,
            );

            const bannerResults: BannerGeneratedImage[] = await Promise.all(
                images.map(async (img) => {
                    // Do NOT crop banner output — the AI generates at the requested ratio already.
                    // Cropping the output would cut off content from the generated banner.
                    const rawUrl = img.base64;
                    let url = rawUrl;
                    if (bannerSettings.logo.image) {
                        url = await applyLogoToImage(rawUrl, bannerSettings.logo);
                    }
                    return {
                        id: crypto.randomUUID(),
                        url,
                        rawUrl,
                        style: img.style,
                        aspectRatio: bannerSettings.aspectRatio,
                    };
                })
            );

            setBannerState({ isGenerating: false, error: null, results: bannerResults });

            if (bannerResults.length > 0) {
                const historyImages: GeneratedImage[] = images.map((img, idx) => ({
                    id: bannerResults[idx].id,
                    url: (img as any).url || bannerResults[idx].url,
                    timestamp: Date.now(),
                    settings: {
                        aspectRatio: bannerSettings.aspectRatio,
                        imageSize: bannerSettings.quality,
                    } as any,
                    type: 'banner' as const,
                    bannerStyle: img.style,
                    bannerTypography: bannerSettings.typography,
                }));
                setSessionImages(prev => [...historyImages, ...prev]);

                confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#FF6321', '#6366f1', '#a855f7'] });
                showToast(`✨ Đã tạo thành công ${bannerResults.length} banner!`, 'success');
            }
        } catch (err: any) {
            console.error(err);
            setBannerState(prev => ({ ...prev, isGenerating: false, error: err.message }));
            showToast(err.message || 'Đã xảy ra lỗi khi tạo banner.', 'error');
        }
    };

    const handleBannerRegenerate = async (id: string, editPromptText: string) => {
        const imageIndex = bannerState.results.findIndex(img => img.id === id);
        if (imageIndex === -1) return;

        const currentImage = bannerState.results[imageIndex];

        setBannerState(prev => {
            const newResults = [...prev.results];
            newResults[imageIndex] = { ...newResults[imageIndex], isRegenerating: true };
            return { ...prev, results: newResults };
        });

        try {
            const token = await getIdToken();
            // Do NOT crop after edit — same as initial generation, the AI output should be used as-is.
            const rawBase64 = await editBanner(token, currentImage.rawUrl, editPromptText, currentImage.aspectRatio);
            let newBase64 = rawBase64;

            if (bannerSettings.logo.image) {
                newBase64 = await applyLogoToImage(rawBase64, bannerSettings.logo);
            }

            setBannerState(prev => {
                const newResults = [...prev.results];
                newResults[imageIndex] = {
                    ...newResults[imageIndex],
                    url: newBase64,
                    rawUrl: rawBase64,
                    isRegenerating: false,
                };
                return { ...prev, results: newResults };
            });
            showToast('✨ Đã chỉnh sửa banner thành công!', 'success');
        } catch (error: any) {
            console.error('Banner edit failed:', error);
            setBannerState(prev => {
                const newResults = [...prev.results];
                newResults[imageIndex] = { ...newResults[imageIndex], isRegenerating: false };
                return { ...prev, results: newResults, error: error.message || 'Lỗi khi chỉnh sửa ảnh.' };
            });
            showToast(error.message || 'Lỗi khi chỉnh sửa banner.', 'error');
        }
    };

    // ── banner canGenerate — requires bannerTitle (reference images optional) ──
    const bannerCanGenerate = !!user && bannerTitle.trim().length > 0;

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
                <main className="max-w-7xl mx-auto px-4 py-6">

                    {/* ══════ Tab Bar ══════ */}
                    <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('food')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'food'
                                ? 'bg-white text-brand-orange shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <UtensilsCrossed size={16} />
                            Món ăn
                        </button>
                        <button
                            onClick={() => setActiveTab('banner')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'banner'
                                ? 'bg-white text-brand-orange shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <LayoutTemplate size={16} />
                            Banner
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* ══════ Left column: Tab controls ══════ */}
                        <div className="lg:col-span-4 space-y-4">
                            {/* ── Brand Profile (visible on both tabs when logged in) ── */}
                            {user && (
                                <BrandProfilePanel
                                    userId={user.uid}
                                    brandProfile={brandProfile}
                                />
                            )}

                            {activeTab === 'food' && (
                                <>
                                    {/* ── Quick / Advanced Mode Toggle ── */}
                                    <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg w-full">
                                        <button
                                            onClick={() => toggleQuickMode(true)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${isQuickMode
                                                ? 'bg-white text-brand-orange shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Zap size={13} />
                                            Nhanh
                                        </button>
                                        <button
                                            onClick={() => toggleQuickMode(false)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${!isQuickMode
                                                ? 'bg-white text-brand-orange shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            <Settings2 size={13} />
                                            Chi tiết
                                        </button>
                                    </div>

                                    {isQuickMode ? (
                                        <QuickModePanel
                                            foodPreview={foodPreview}
                                            bgPreview={bgPreview}
                                            settings={foodSettings}
                                            onFoodChange={(e) => handleFileChange(e, 'food')}
                                            onFoodClear={() => { setFoodImage(null); setFoodPreview(null); }}
                                            onBgChange={(e) => handleFileChange(e, 'bg')}
                                            onBgClear={() => { setBgImage(null); setBgPreview(null); }}
                                            sideDishes={sideDishes}
                                            onSideDishesChange={setSideDishes}
                                            isGenerating={isFoodGenerating}
                                            isLoggedIn={!!user}
                                            credits={credits}
                                            quickCreditCost={quickCreditCost}
                                            onGenerate={() => generateFoodImages(true)}
                                            onSwitchToAdvanced={() => toggleQuickMode(false)}
                                        />
                                    ) : (
                                        <>
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
                                                settings={foodSettings}
                                                onChange={setFoodSettings}
                                                isGenerating={isFoodGenerating}
                                                hasFoodImage={!!foodImage}
                                                isLoggedIn={!!user}
                                                isAdmin={isAdmin}
                                                credits={credits}
                                                costPerImage={costPerImage}
                                                sizeMultiplier={sizeMultiplier}
                                                totalCreditCost={totalCreditCost}
                                                onGenerate={() => generateFoodImages(false)}
                                            />
                                        </>
                                    )}
                                </>
                            )}

                            {activeTab === 'banner' && (
                                <>
                                    {/* Auto-fill hint */}
                                    {brandProfileApplied && brandProfile?.shopName && (
                                        <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-[10px] text-green-700 flex items-center gap-1.5">
                                            <span>✓</span>
                                            <span>Đã tự động điền từ hồ sơ <strong>{brandProfile.shopName}</strong></span>
                                        </div>
                                    )}

                                    <BannerUploadPanel
                                        referenceImages={referenceImages}
                                        onReferenceImagesChange={setReferenceImages}
                                        productImages={productImages}
                                        onProductImagesChange={setProductImages}
                                        venueImages={venueImages}
                                        onVenueImagesChange={setVenueImages}
                                        brandDescription={brandDescription}
                                        onBrandDescriptionChange={setBrandDescription}
                                        promoInfo={promoInfo}
                                        onPromoInfoChange={setPromoInfo}
                                        prompt={bannerPrompt}
                                        onPromptChange={setBannerPrompt}
                                        bannerTitle={bannerTitle}
                                        onBannerTitleChange={setBannerTitle}
                                        industry={industry}
                                        onIndustryChange={setIndustry}
                                        onOpenProductPicker={user ? () => setShowProductPicker(true) : undefined}
                                    />

                                    <BannerSettingsPanel
                                        settings={bannerSettings}
                                        onChange={handleBannerSettingsChange}
                                        isGenerating={bannerState.isGenerating}
                                        canGenerate={bannerCanGenerate}
                                        isLoggedIn={!!user}
                                        credits={credits}
                                        onGenerate={generateBannerImages}
                                        brandProfileLogo={brandProfile?.logo ?? null}
                                        purpose={bannerPurpose}
                                        onPurposeChange={setBannerPurpose}
                                    />

                                </>
                            )}
                        </div>

                        {/* ══════ Right column: Shared history + Banner current results ══════ */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Banner current results (only when banner tab active & has results) */}
                            {activeTab === 'banner' && (bannerState.results.length > 0 || bannerState.isGenerating) && (
                                <BannerGallery
                                    images={bannerState.results}
                                    isGenerating={bannerState.isGenerating}
                                    expectedCount={bannerSettings.quantity}
                                    onRegenerate={handleBannerRegenerate}
                                />
                            )}

                            {/* Shared Generation History — always visible */}
                            <GenerationHistory
                                sessionImages={sessionImages}
                                isGenerating={isAnyGenerating}
                                pendingCount={pendingCount}
                                isLoggedIn={!!user}
                                userId={user?.uid}
                                onEnlarge={setEnlargedImage}
                                onClearSession={() => setSessionImages([])}
                                onBatchDownload={handleBatchDownload}
                            />
                        </div>
                    </div>
                </main>

                {/* ── Footer ── */}
                <footer className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 text-gray-400 text-xs">
                    <p>© 2026 Ảnh Nét. Powered by Gemini AI Image Generation.</p>
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
                            alt="Enlarged"
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Product Picker Modal ── */}
            {showProductPicker && user && (
                <ProductPickerModalWithToken
                    onClose={() => setShowProductPicker(false)}
                    onSelect={(imgs) => setProductImages(prev => [...prev, ...imgs])}
                    currentImages={productImages}
                    getToken={getIdToken}
                />
            )}

            {/* ── Onboarding ── */}
            <OnboardingModal
                open={showOnboarding}
                userName={userProfile?.displayName || user?.displayName || 'bạn'}
                onClose={handleOnboardingClose}
            />
        </>
    );
}

// ── Wrapper to lazy-load token for ProductPickerModal ─────────────────────────

function ProductPickerModalWithToken({
    onClose,
    onSelect,
    currentImages,
    getToken,
}: {
    onClose: () => void;
    onSelect: (imgs: string[]) => void;
    currentImages: string[];
    getToken: () => Promise<string>;
}) {
    const [token, setToken] = React.useState('');
    React.useEffect(() => {
        getToken().then(setToken).catch(() => { });
    }, []);
    if (!token) return null;
    return (
        <ProductPickerModal
            token={token}
            onClose={onClose}
            onSelect={onSelect}
            currentImages={currentImages}
        />
    );
}
