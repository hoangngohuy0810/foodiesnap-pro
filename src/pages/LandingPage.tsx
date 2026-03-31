import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Sparkles, Camera, Zap, Star, Crown, ChevronDown, ChevronUp,
    CheckCircle2, ArrowRight, Upload, Sliders, Download,
    Shield, Clock, RefreshCw
} from 'lucide-react';
import { CREDIT_PACKAGES } from '../types';
import { cn } from '../lib/utils';

const FEATURES = [
    {
        icon: Sparkles,
        color: 'text-brand-orange bg-brand-orange/10',
        title: 'AI Gemini Flash',
        desc: 'Công nghệ Gemini 3.1 Flash tạo ảnh chất lượng studio trong vài giây.',
    },
    {
        icon: Sliders,
        color: 'text-blue-500 bg-blue-50',
        title: 'Tùy chỉnh hoàn toàn',
        desc: 'Kiểm soát phong cách, ánh sáng, góc máy, nền theo ý muốn.',
    },
    {
        icon: Upload,
        color: 'text-purple-500 bg-purple-50',
        title: 'Nền tùy chỉnh',
        desc: 'Tải lên nền của riêng bạn hoặc để AI tạo bối cảnh chuyên nghiệp.',
    },
    {
        icon: Download,
        color: 'text-green-500 bg-green-50',
        title: 'Xuất chất lượng cao',
        desc: 'Tải xuống ảnh 1K, 2K, 4K sắc nét — sẵn sàng đăng ngay.',
    },
    {
        icon: RefreshCw,
        color: 'text-yellow-500 bg-yellow-50',
        title: 'Credits không hết hạn',
        desc: 'Mua một lần, dùng mãi mãi. Không mất credits nếu ảnh lỗi.',
    },
    {
        icon: Shield,
        color: 'text-red-500 bg-red-50',
        title: 'Bảo mật dữ liệu',
        desc: 'Ảnh của bạn được lưu trữ an toàn trên Firebase, chỉ bạn mới xem được.',
    },
];

const FAQS = [
    {
        q: 'FoodieSnap Pro hoạt động như thế nào?',
        a: 'Bạn tải ảnh món ăn lên, chọn phong cách và cài đặt mong muốn. AI Gemini sẽ xử lý và tạo ra ảnh chất lượng studio chuyên nghiệp trong vài giây.',
    },
    {
        q: 'Credits là gì? Tôi cần bao nhiêu credits?',
        a: '1 credit = 1 ảnh được tạo ra. Mỗi lần generate, bạn dùng đúng số credits bằng số ảnh bạn chọn (tối đa 4 ảnh/lần). Credits không hết hạn.',
    },
    {
        q: 'Tôi có thể dùng thử miễn phí không?',
        a: 'Có! Khi đăng ký tài khoản mới, bạn nhận ngay 3 credits miễn phí để trải nghiệm mà không cần thanh toán.',
    },
    {
        q: 'Chất lượng ảnh output như thế nào?',
        a: 'Ảnh được tạo ra ở độ phân giải cao (1K/2K/4K), phù hợp cho đăng mạng xã hội, menu nhà hàng, website thương mại điện tử.',
    },
    {
        q: 'Thanh toán bằng phương thức nào?',
        a: 'Hiện tại hỗ trợ chuyển khoản ngân hàng VietQR (tự động xác nhận qua webhook). Credits được cộng ngay sau khi thanh toán thành công.',
    },
    {
        q: 'Nếu ảnh tạo ra bị lỗi thì sao?',
        a: 'Hệ thống tự động hoàn trả credits nếu quá trình tạo ảnh thất bại. Bạn không bao giờ mất credits vô lý.',
    },
    {
        q: 'Tôi có thể dùng ảnh output vào mục đích thương mại không?',
        a: 'Có, ảnh được tạo thuộc quyền sở hữu của bạn và có thể dùng cho mục đích thương mại theo Điều khoản sử dụng của FoodieSnap Pro.',
    },
];

const STEPS = [
    { num: '01', icon: Upload, title: 'Tải ảnh lên', desc: 'Upload ảnh món ăn từ điện thoại hoặc máy tính.' },
    { num: '02', icon: Sliders, title: 'Chọn phong cách', desc: 'Tùy chỉnh ánh sáng, góc máy, nền theo sở thích.' },
    { num: '03', icon: Sparkles, title: 'AI xử lý', desc: 'Gemini AI tạo ra ảnh chuyên nghiệp trong ~10 giây.' },
    { num: '04', icon: Download, title: 'Tải về & Dùng ngay', desc: 'Xuất ảnh chất lượng cao, sẵn sàng đăng ngay.' },
];

const PKG_ICONS = { lite: Zap, personal: Star, startup: Crown };
const PKG_COLORS = {
    lite: 'text-blue-500 bg-blue-50',
    personal: 'text-brand-orange bg-brand-orange/10',
    startup: 'text-purple-600 bg-purple-50',
};

export default function LandingPage() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <div className="overflow-x-hidden">
            {/* ─── HERO ─── */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-24">
                {/* BG decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-orange/5 rounded-full blur-3xl" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="relative max-w-4xl mx-auto space-y-6"
                >
                    <div className="inline-flex items-center gap-2 bg-brand-orange/10 text-brand-orange px-4 py-1.5 rounded-full text-sm font-semibold">
                        <Sparkles size={14} />
                        Powered by Gemini 3.1 Flash Image
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                        Ảnh món ăn{' '}
                        <span className="text-brand-orange italic">chuyên nghiệp</span>
                        <br />
                        chỉ trong vài giây
                    </h1>

                    <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        Biến ảnh điện thoại bình thường thành tác phẩm nhiếp ảnh ẩm thực đẳng cấp nhà hàng.
                        Dùng thử miễn phí ngay hôm nay.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <Link to="/app" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 justify-center">
                            <Sparkles size={20} />
                            Dùng thử miễn phí — 4 credits
                        </Link>
                        <a
                            href="#pricing"
                            className="border-2 border-gray-200 text-gray-700 font-medium px-8 py-4 rounded-full hover:border-brand-orange hover:text-brand-orange transition-all text-lg"
                        >
                            Xem bảng giá
                        </a>
                    </div>

                    <p className="text-sm text-gray-400">
                        <CheckCircle2 size={14} className="inline mr-1 text-green-500" />
                        Không cần thẻ tín dụng &nbsp;·&nbsp;
                        <CheckCircle2 size={14} className="inline mr-1 text-green-500" />
                        4 credits miễn phí khi đăng ký
                    </p>
                </motion.div>

                {/* Before / After mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="mt-16 flex gap-6 justify-center flex-wrap"
                >
                    <div className="relative glass-card rounded-3xl overflow-hidden w-64 h-64 flex items-center justify-center bg-gray-100">
                        <div className="text-center text-gray-400 p-4">
                            <Camera size={40} className="mx-auto mb-2 opacity-30" />
                            <p className="text-xs font-mono uppercase tracking-wider">Ảnh gốc</p>
                            <p className="text-xs text-gray-300 mt-1">Chụp bằng điện thoại</p>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-gray-800/70 text-white text-[10px] px-2 py-1 rounded-full font-mono">TRƯỚC</div>
                    </div>

                    <div className="flex items-center">
                        <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center shadow-lg">
                            <ArrowRight size={20} className="text-white" />
                        </div>
                    </div>

                    <div className="relative glass-card rounded-3xl overflow-hidden w-64 h-64 flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="text-center text-brand-orange/60 p-4">
                            <Sparkles size={40} className="mx-auto mb-2" />
                            <p className="text-xs font-mono uppercase tracking-wider text-brand-orange">Sau AI</p>
                            <p className="text-xs text-brand-orange/50 mt-1">Chất lượng studio</p>
                        </div>
                        <div className="absolute bottom-3 left-3 bg-brand-orange text-white text-[10px] px-2 py-1 rounded-full font-mono">SAU ✨</div>
                    </div>
                </motion.div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Cách hoạt động</h2>
                        <p className="text-gray-500 text-lg">Chỉ 4 bước đơn giản để có ảnh chuyên nghiệp</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {STEPS.map((step, i) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.1 }}
                                    className="text-center"
                                >
                                    <div className="relative inline-block mb-4">
                                        <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center">
                                            <Icon size={28} className="text-brand-orange" />
                                        </div>
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-orange rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                                            {i + 1}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── FEATURES ─── */}
            <section className="py-24 px-6 bg-brand-cream">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Tính năng nổi bật</h2>
                        <p className="text-gray-500 text-lg">Mọi thứ bạn cần để tạo ảnh thức ăn đẳng cấp</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {FEATURES.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.08 }}
                                    className="glass-card rounded-2xl p-6"
                                >
                                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', f.color)}>
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── PRICING ─── */}
            <section id="pricing" className="py-24 px-6 bg-white">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Bảng giá đơn giản</h2>
                        <p className="text-gray-500 text-lg">Pay-as-you-go — chỉ trả cho những gì bạn dùng. Credits không hết hạn.</p>
                    </div>

                    {/* Free tier */}
                    <div className="mb-6 p-6 border-2 border-dashed border-green-200 rounded-3xl bg-green-50/50 text-center">
                        <p className="text-green-700 font-bold text-lg mb-1">🎁 Miễn phí khi đăng ký</p>
                        <p className="text-green-600 text-sm">Tạo tài khoản và nhận ngay <strong>4 credits</strong> miễn phí để trải nghiệm — không cần thẻ tín dụng!</p>
                        <Link to="/app" className="mt-3 inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition-colors">
                            Bắt đầu miễn phí <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {CREDIT_PACKAGES.map((pkg) => {
                            const Icon = PKG_ICONS[pkg.id];
                            return (
                                <motion.div
                                    key={pkg.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className={cn(
                                        'relative rounded-3xl p-6 border-2 flex flex-col',
                                        pkg.badge ? 'border-brand-orange shadow-xl shadow-brand-orange/10 scale-105' : 'border-gray-100'
                                    )}
                                >
                                    {pkg.badge && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-xs font-bold px-3 py-1 rounded-full">
                                            {pkg.badge}
                                        </div>
                                    )}
                                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', PKG_COLORS[pkg.id])}>
                                        <Icon size={22} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-1">{pkg.label}</h3>
                                    <p className="text-3xl font-bold mb-1">
                                        {pkg.amount.toLocaleString('vi-VN')}
                                        <span className="text-base font-normal text-gray-400">đ</span>
                                    </p>
                                    <p className="text-brand-orange font-semibold text-lg mb-4">{pkg.credits} credits</p>
                                    <p className="text-xs text-gray-400 mb-6">
                                        = {(pkg.amount / pkg.credits).toLocaleString('vi-VN')}đ / ảnh
                                    </p>

                                    <ul className="space-y-2 mb-6 flex-1">
                                        <li className="flex items-center gap-2 text-sm text-gray-600">
                                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                            {pkg.credits} ảnh chất lượng cao
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-gray-600">
                                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                            Credits không hết hạn
                                        </li>
                                        <li className="flex items-center gap-2 text-sm text-gray-600">
                                            <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                            Hoàn tiền nếu lỗi
                                        </li>
                                        {pkg.id !== 'lite' && (
                                            <li className="flex items-center gap-2 text-sm text-gray-600">
                                                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                                Ưu tiên hỗ trợ
                                            </li>
                                        )}
                                    </ul>

                                    <Link
                                        to="/app"
                                        className={cn(
                                            'w-full py-3 rounded-2xl font-semibold text-center transition-all text-sm',
                                            pkg.badge
                                                ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        )}
                                    >
                                        Mua ngay
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── SOCIAL PROOF ─── */}
            <section className="py-16 px-6 bg-brand-cream">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="grid grid-cols-3 gap-8">
                        {[
                            { num: '10,000+', label: 'Ảnh đã tạo' },
                            { num: '500+', label: 'Người dùng' },
                            { num: '< 10s', label: 'Thời gian tạo ảnh' },
                        ].map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <p className="text-4xl font-bold text-brand-orange">{s.num}</p>
                                <p className="text-gray-500 text-sm mt-1">{s.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Câu hỏi thường gặp</h2>
                    </div>

                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-sm md:text-base">{faq.q}</span>
                                    {openFaq === i
                                        ? <ChevronUp size={18} className="text-brand-orange shrink-0" />
                                        : <ChevronDown size={18} className="text-gray-400 shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed border-t border-gray-50">
                                        <div className="pt-3">{faq.a}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA BOTTOM ─── */}
            <section className="py-24 px-6 bg-brand-ink text-white text-center">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-5xl">🍜</div>
                    <h2 className="text-4xl font-bold">Sẵn sàng nâng tầm ảnh món ăn?</h2>
                    <p className="text-gray-300 text-lg">
                        Tham gia cùng hàng trăm chủ nhà hàng, food blogger đang dùng FoodieSnap Pro.
                    </p>
                    <Link
                        to="/app"
                        className="inline-flex items-center gap-2 bg-brand-orange text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-brand-orange/90 transition-all hover:scale-105"
                    >
                        <Sparkles size={20} />
                        Bắt đầu miễn phí ngay
                    </Link>
                    <p className="text-gray-500 text-sm">
                        <Clock size={14} className="inline mr-1" />
                        Đăng ký mất chưa đến 30 giây
                    </p>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="bg-brand-ink text-gray-400 border-t border-white/5 px-6 py-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
                            <Camera size={16} className="text-white" />
                        </div>
                        <span className="text-white font-bold">FoodieSnap <span className="text-brand-orange italic">Pro</span></span>
                    </div>

                    <p className="text-xs text-center">© 2026 FoodieSnap Pro. Powered by Gemini 3.1 Flash Image.</p>

                    <div className="flex items-center gap-5 text-xs">
                        <Link to="/privacy-policy" className="hover:text-white transition-colors">Chính sách bảo mật</Link>
                        <Link to="/terms-of-service" className="hover:text-white transition-colors">Điều khoản dịch vụ</Link>
                        <Link to="/refund-policy" className="hover:text-white transition-colors">Chính sách hoàn tiền</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
