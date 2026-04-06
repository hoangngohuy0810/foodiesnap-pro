import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Sparkles, Camera, Zap, Star, Crown, ChevronDown, ChevronUp,
    CheckCircle2, ArrowRight, Upload, Sliders, Download,
    Shield, Clock, RefreshCw, HandCoins, Timer
} from 'lucide-react';
import { CREDIT_PACKAGES } from '../types';
import { cn } from '../lib/utils';

const FEATURES = [
    {
        icon: Timer,
        color: 'text-brand-orange bg-brand-orange/10',
        title: 'Tốc Độ Ánh Sáng',
        desc: 'Tiết kiệm hàng giờ setup studio. Chỉ mất ~10 giây để AI xử lý xong một bức ảnh.',
    },
    {
        icon: HandCoins,
        color: 'text-green-500 bg-green-50',
        title: 'Tối Ưu Chi Phí',
        desc: 'Không cần thuê thợ chụp, không cần thiết bị đắt tiền. Tiết kiệm đến 95% chi phí hình ảnh.',
    },
    {
        icon: Sparkles,
        color: 'text-blue-500 bg-blue-50',
        title: 'Chất Lượng Đỉnh Cao',
        desc: 'Tích hợp mô hình Gemini Pro mới nhất, đảm bảo độ sắc nét, màu sắc đạt chuẩn in ấn thương mại.',
    },
    {
        icon: Sliders,
        color: 'text-purple-500 bg-purple-50',
        title: 'Tùy Biến Đa Dạng',
        desc: 'Tự do chọn góc chụp, phong cách nền, và tùy biến ánh sáng để phù hợp với định vị thương hiệu.',
    },
    {
        icon: RefreshCw,
        color: 'text-yellow-500 bg-yellow-50',
        title: 'Dùng Bao Nhiêu Trả Bấy Nhiêu',
        desc: 'Không đăng ký thuê bao hàng tháng. Mua credits một lần dùng mãi mãi. Hoàn 100% nếu ảnh lỗi.',
    },
    {
        icon: Shield,
        color: 'text-red-500 bg-red-50',
        title: 'Bảo Mật Tuyệt Đối',
        desc: 'Mọi hình ảnh của bạn được lưu trữ an toàn riêng biệt, hoàn toàn thuộc quyền sở hữu của bạn.',
    },
];

const FAQS = [
    {
        q: 'Ảnh Nét có thể giúp tôi tiết kiệm chi phí như thế nào?',
        a: 'Thay vì thuê dịch vụ chụp ảnh với giá hàng triệu đồng cho mỗi concept, bạn chỉ cần tự chụp bằng điện thoại và để Ảnh Nét nâng cấp với chi phí chỉ vài ngàn đồng mỗi ảnh. Giúp bạn cắt giảm đến 95% chi phí marketing.',
    },
    {
        q: 'Tôi không biết gì về thiết kế có dùng được không?',
        a: 'Hoàn toàn được! Ảnh Nét được thiết kế với giao diện cực kỳ trực quan. Chế độ Nhanh (Quick Mode) giúp bạn có ngay ảnh đẹp chỉ với 1 thao tác tải ảnh lên, AI sẽ tự động lo phần còn lại.',
    },
    {
        q: 'Credits là gì? Tôi cần bao nhiêu credits?',
        a: '1 credit = 1 ảnh được tạo ra. Mỗi lần generate, bạn dùng đúng số credits bằng số ảnh bạn chọn. Đặc biệt, Credits không bao giờ hết hạn.',
    },
    {
        q: 'Tôi có thể dùng thử miễn phí không?',
        a: 'Có! Khi đăng ký tài khoản mới, bạn nhận ngay 4 credits miễn phí để trải nghiệm chất lượng thực tế trước khi quyết định nâng cấp.',
    },
    {
        q: 'Thanh toán bằng phương thức nào?',
        a: 'Hiện tại hỗ trợ chuyển khoản ngân hàng VietQR. Quá trình thanh toán tự động xác nhận qua webhook và credits được cộng ngay lập tức (1-5 giây).',
    },
    {
        q: 'Nếu ảnh tạo ra bị lỗi thì sao?',
        a: 'Hệ thống tự động hoàn trả 100% credits nếu quá trình tạo ảnh thất bại. Bạn hoàn toàn yên tâm không bị mất phí vô lý.',
    },
];

const STEPS = [
    { num: '01', icon: Upload, title: 'Tải Ảnh Gốc', desc: 'Chỉ cần một bức ảnh chụp từ điện thoại thông thường.' },
    { num: '02', icon: Sliders, title: 'Cấu Hình Nhanh', desc: 'Chọn phong cách, phông nền hoặc để AI tự động quyết định.' },
    { num: '03', icon: Sparkles, title: 'AI Biến Hóa', desc: 'Đợi vài giây để Gemini xử lý ánh sáng và chi tiết.' },
    { num: '04', icon: Download, title: 'Tải Xuống', desc: 'Sẵn sàng dùng ngay cho Menu, Website hoặc Fanpage.' },
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
                        Khởi tạo đột phá với Gemini AI
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight text-gray-900">
                        Chụp Ảnh Sản Phẩm <br />
                        <span className="text-brand-orange italic">Siêu Tốc & Siêu Rẻ</span>
                    </h1>

                    <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                        Chấm dứt việc đốt tiền cho studio! Chỉ với một bức ảnh chụp từ điện thoại, AI sẽ lập tức biến hóa thành hình ảnh sắc nét đẳng cấp thương mại. <b>Tiết kiệm đến 95% chi phí và thời gian.</b>
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                        <Link to="/app" className="btn-primary text-lg px-8 py-4 flex items-center gap-2 justify-center shadow-xl shadow-brand-orange/20">
                            <Sparkles size={20} />
                            Bắt Đầu Miễn Phí — 4 Credits
                        </Link>
                        <a
                            href="#pricing"
                            className="border-2 border-gray-200 text-gray-700 font-medium px-8 py-4 rounded-full hover:border-brand-orange hover:text-brand-orange transition-all text-lg"
                        >
                            Xem Bảng Giá
                        </a>
                    </div>

                    <p className="text-sm text-gray-400">
                        <CheckCircle2 size={14} className="inline mr-1 text-green-500" />
                        Trải nghiệm ngay, không cần thẻ tín dụng
                    </p>
                </motion.div>

                {/* Before / After mockup */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="mt-16 flex flex-col md:flex-row gap-6 items-center justify-center w-full max-w-5xl mx-auto"
                >
                    <div className="relative rounded-3xl overflow-hidden shadow-xl w-full md:w-1/2 max-w-[400px] aspect-square group">
                        <img src="/anh-goc.jpg" alt="Ảnh gốc chụp điện thoại" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                            <Camera size={14} /> Ảnh Gốc Điện Thoại
                        </div>
                    </div>

                    <div className="flex items-center shrink-0 rotate-90 md:rotate-0">
                        <div className="w-14 h-14 bg-brand-orange rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,99,33,0.5)]">
                            <ArrowRight size={24} className="text-white" />
                        </div>
                    </div>

                    <div className="relative rounded-3xl overflow-hidden shadow-2xl w-full md:w-1/2 max-w-[400px] aspect-square group border-4 border-brand-orange/20">
                        <img src="/anh-net.png" alt="Ảnh sau khi dùng AI" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute top-4 right-4 bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                            <Sparkles size={14} /> Đẳng Cấp Studio
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                            <span className="bg-black/70 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full font-medium">
                                Tiết kiệm 1.500.000đ phí chụp hình
                            </span>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ─── SOCIAL PROOF ─── */}
            <section className="py-12 px-6 bg-brand-cream border-y border-orange-100">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { num: '95%', label: 'Tiết Kiệm Chi Phí' },
                            { num: '10s', label: 'Hoàn Thành 1 Ảnh' },
                            { num: '10,000+', label: 'Ảnh Đã Xử Lý' },
                            { num: '24/7', label: 'Hoạt Động Liên Tục' },
                        ].map((s, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                            >
                                <p className="text-3xl md:text-5xl font-extrabold text-brand-orange mb-2">{s.num}</p>
                                <p className="text-gray-600 font-medium text-sm md:text-base">{s.label}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── HOW IT WORKS ─── */}
            <section className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Tối Ưu Hóa Quy Trình</h2>
                        <p className="text-gray-500 text-lg">Từ khâu chuẩn bị đến khi đăng tải chỉ mất vài phút</p>
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
                                    className="text-center p-6 rounded-3xl bg-gray-50 border border-gray-100 hover:border-brand-orange/30 transition-colors"
                                >
                                    <div className="relative inline-flex mb-6">
                                        <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center">
                                            <Icon size={28} className="text-brand-orange" />
                                        </div>
                                        <div className="absolute -top-3 -right-3 w-8 h-8 bg-brand-orange rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md">
                                            {step.num}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-xl mb-3 text-gray-900">{step.title}</h3>
                                    <p className="text-gray-500 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── FEATURES ─── */}
            <section className="py-24 px-6 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Giải Pháp Toàn Diện</h2>
                        <p className="text-gray-500 text-lg">Xóa bỏ hoàn toàn rào cản về kỹ thuật và ngân sách</p>
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
                                    className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg transition-all"
                                >
                                    <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center mb-6', f.color)}>
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="font-bold text-xl mb-3">{f.title}</h3>
                                    <p className="text-gray-600 leading-relaxed">{f.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── PRICING ─── */}
            <section id="pricing" className="py-24 px-6 bg-white">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Đầu Tư Nhỏ, Lợi Nhuận Lớn</h2>
                        <p className="text-gray-500 text-lg">Thay vì chi hàng triệu cho mỗi concept, nay chỉ vài ngàn đồng một bức ảnh. Dùng bao nhiêu trả bấy nhiêu.</p>
                    </div>

                    {/* Free tier */}
                    <div className="mb-8 p-6 md:p-8 border border-green-200 rounded-3xl bg-gradient-to-r from-green-50 to-emerald-50 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <p className="text-green-800 font-bold text-2xl mb-2">🎁 Trải Nghiệm Hoàn Toàn Miễn Phí</p>
                            <p className="text-green-700">Tạo tài khoản và nhận ngay <strong>4 credits</strong> miễn phí. Tự mình kiểm chứng chất lượng mà không cần rủi ro tài chính.</p>
                        </div>
                        <Link to="/app" className="shrink-0 bg-green-600 text-white px-8 py-4 rounded-full font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20 text-center w-full md:w-auto">
                            Nhận Miễn Phí Ngay
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
                                        'relative rounded-3xl p-8 border flex flex-col',
                                        pkg.badge ? 'border-brand-orange shadow-2xl shadow-brand-orange/10 scale-100 md:scale-105 bg-white z-10' : 'border-gray-200 bg-gray-50'
                                    )}
                                >
                                    {pkg.badge && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-md">
                                            {pkg.badge}
                                        </div>
                                    )}
                                    <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-6', PKG_COLORS[pkg.id])}>
                                        <Icon size={28} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">{pkg.label}</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-4xl font-extrabold text-gray-900">{pkg.amount.toLocaleString('vi-VN')}</span>
                                        <span className="text-lg font-semibold text-gray-500">đ</span>
                                    </div>
                                    <div className="bg-orange-50 text-brand-orange font-bold text-lg px-4 py-2 rounded-xl mb-6 inline-block w-max">
                                        {pkg.credits} Credits
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1">
                                        <li className="flex items-start gap-3 text-gray-700 font-medium">
                                            <CheckCircle2 size={20} className="text-brand-orange shrink-0 mt-0.5" />
                                            <span>Chỉ ~<strong>{(pkg.amount / pkg.credits).toLocaleString('vi-VN')}đ</strong> / ảnh</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-gray-600">
                                            <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
                                            <span>Không giới hạn thời gian sử dụng</span>
                                        </li>
                                        <li className="flex items-start gap-3 text-gray-600">
                                            <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
                                            <span>Hoàn 100% credits nếu ảnh lỗi</span>
                                        </li>
                                        {pkg.id !== 'lite' && (
                                            <li className="flex items-start gap-3 text-gray-600">
                                                <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
                                                <span>Hỗ trợ khách hàng ưu tiên</span>
                                            </li>
                                        )}
                                    </ul>

                                    <Link
                                        to="/app"
                                        className={cn(
                                            'w-full py-4 rounded-2xl font-bold text-center transition-all text-base',
                                            pkg.badge
                                                ? 'bg-brand-orange text-white hover:bg-brand-orange/90 shadow-lg shadow-brand-orange/25'
                                                : 'bg-white border-2 border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50'
                                        )}
                                    >
                                        Bắt Đầu Ngay
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─── FAQ ─── */}
            <section className="py-24 px-6 bg-brand-cream border-t border-orange-100">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">Mọi Thắc Mắc Đã Được Giải Đáp</h2>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <div key={i} className="bg-white rounded-2xl shadow-sm border border-orange-50 overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-orange-50/50 transition-colors"
                                >
                                    <span className="font-bold text-lg text-gray-800">{faq.q}</span>
                                    {openFaq === i
                                        ? <ChevronUp size={20} className="text-brand-orange shrink-0" />
                                        : <ChevronDown size={20} className="text-gray-400 shrink-0" />
                                    }
                                </button>
                                {openFaq === i && (
                                    <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100">
                                        <div className="pt-4">{faq.a}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA BOTTOM ─── */}
            <section className="py-24 px-6 bg-brand-ink text-white text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-brand-orange/20 to-transparent pointer-events-none" />
                <div className="max-w-3xl mx-auto space-y-8 relative z-10">
                    <h2 className="text-5xl font-bold leading-tight">Gia Tăng Doanh Số Nhờ Hình Ảnh Chuyên Nghiệp</h2>
                    <p className="text-gray-300 text-xl leading-relaxed">
                        Đừng để hình ảnh kém chất lượng làm mất điểm trong mắt khách hàng. Bắt đầu tối ưu chi phí và tăng tỷ lệ chuyển đổi ngay hôm nay!
                    </p>
                    <Link
                        to="/app"
                        className="inline-flex items-center gap-3 bg-brand-orange text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-white hover:text-brand-orange transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,99,33,0.4)]"
                    >
                        <Sparkles size={24} />
                        Tạo Ảnh Miễn Phí Ngay
                    </Link>
                    <p className="text-gray-400 text-sm">
                        <Clock size={16} className="inline mr-1 mb-0.5" />
                        Chỉ mất 30 giây đăng ký — Nhận 4 credits miễn phí.
                    </p>
                </div>
            </section>

            {/* ─── FOOTER ─── */}
            <footer className="bg-black text-gray-400 border-t border-white/10 px-6 py-12">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center">
                            <Camera size={20} className="text-white" />
                        </div>
                        <span className="text-white font-bold text-xl tracking-wide">Ảnh Nét</span>
                    </div>

                    <p className="text-sm text-center">© 2026 Ảnh Nét. Vận hành bởi Gemini 3.1 Flash AI.</p>

                    <div className="flex flex-wrap justify-center gap-6 text-sm font-medium">
                        <Link to="/privacy-policy" className="hover:text-white transition-colors">Bảo Mật</Link>
                        <Link to="/terms-of-service" className="hover:text-white transition-colors">Điều Khoản</Link>
                        <Link to="/refund-policy" className="hover:text-white transition-colors">Hoàn Tiền</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}