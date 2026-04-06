import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, Sparkles, ArrowRight, Gift } from 'lucide-react';

interface OnboardingModalProps {
    open: boolean;
    userName: string;
    onClose: () => void;
}

const STEPS = [
    {
        icon: Gift,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        title: 'Chào mừng đến với Ảnh Nét! 🎉',
        description: 'Bạn vừa nhận được 3 credits miễn phí để trải nghiệm. Hãy biến ảnh món ăn của bạn thành tác phẩm nghệ thuật ngay hôm nay!',
        cta: 'Bắt đầu hướng dẫn',
    },
    {
        icon: Upload,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        title: 'Bước 1: Tải ảnh món ăn lên',
        description: 'Chụp hoặc tải lên bất kỳ ảnh món ăn nào — dù là ảnh chụp bằng điện thoại, chất lượng thấp cũng không sao! AI sẽ lo phần còn lại.',
        cta: 'Tiếp theo',
    },
    {
        icon: Camera,
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        title: 'Bước 2: Chọn phong cách',
        description: 'Tùy chỉnh phong cách, ánh sáng, góc máy và nền theo ý muốn. Bạn có thể tải lên nền riêng hoặc để AI tự tạo nền chuyên nghiệp.',
        cta: 'Tiếp theo',
    },
    {
        icon: Sparkles,
        iconBg: 'bg-brand-orange/10',
        iconColor: 'text-brand-orange',
        title: 'Bước 3: Tạo & Tải xuống',
        description: 'Nhấn "Nâng cấp ảnh" và AI Gemini sẽ tạo ra ảnh chuyên nghiệp trong vài giây. Tải xuống hoặc chia sẻ ngay lập tức!',
        cta: 'Bắt đầu ngay!',
    },
];

export default function OnboardingModal({ open, userName, onClose }: OnboardingModalProps) {
    const [step, setStep] = useState(0);
    const current = STEPS[step];
    const Icon = current.icon;
    const isLast = step === STEPS.length - 1;

    const handleNext = () => {
        if (isLast) {
            onClose();
        } else {
            setStep(s => s + 1);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        key={step}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
                        initial={{ scale: 0.85, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.85, opacity: 0, y: -20 }}
                        transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                    >
                        {/* Step indicator */}
                        <div className="flex justify-center gap-1.5 mb-6">
                            {STEPS.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === step
                                        ? 'w-6 bg-brand-orange'
                                        : i < step
                                            ? 'w-1.5 bg-brand-orange/40'
                                            : 'w-1.5 bg-gray-200'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Icon */}
                        <div className={`w-20 h-20 ${current.iconBg} rounded-3xl flex items-center justify-center mx-auto mb-5`}>
                            <Icon size={36} className={current.iconColor} />
                        </div>

                        {/* Content */}
                        <h2 className="text-2xl font-bold mb-3 leading-tight">
                            {step === 0 ? `Xin chào, ${userName}!` : current.title}
                        </h2>
                        <p className="text-gray-500 text-sm leading-relaxed mb-8">
                            {step === 0
                                ? current.description
                                : current.description}
                        </p>

                        {/* CTA */}
                        <button
                            onClick={handleNext}
                            className="btn-primary w-full flex items-center justify-center gap-2 text-base"
                        >
                            {current.cta}
                            {!isLast && <ArrowRight size={18} />}
                            {isLast && <Sparkles size={18} />}
                        </button>

                        {step > 0 && (
                            <button
                                onClick={onClose}
                                className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                Bỏ qua hướng dẫn
                            </button>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
