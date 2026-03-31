import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Sparkles, Check, Zap, Cpu, Star,
    Gift, ChevronRight, HelpCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { CREDIT_PACKAGES, IMAGE_MODELS, IMAGE_SIZE_MULTIPLIER } from '../types';
import { useAuth } from '../contexts/AuthContext';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtVND(amount: number): string {
    return amount.toLocaleString('vi-VN') + 'đ';
}

function fmtCr(n: number): string {
    if (n === 0.5) return '½';
    return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// Calculate how many 1K images each package allows per model
function imagesPerPackage(credits: number, creditCost: number): string {
    const n = Math.floor(credits / creditCost);
    return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
    {
        q: 'Credit là gì?',
        a: 'Credit là đơn vị dùng để tạo ảnh AI trên FoodieSnap. Mỗi lần tạo ảnh sẽ trừ một số credit tùy theo model và chất lượng bạn chọn.',
    },
    {
        q: 'Credit có hết hạn không?',
        a: 'Không. Credit sau khi mua sẽ không bao giờ hết hạn và có thể sử dụng bất kỳ lúc nào.',
    },
    {
        q: 'Chất lượng ảnh ảnh hưởng đến credit thế nào?',
        a: '1K × 1, 2K × 2, 4K × 3. Ảnh chất lượng cao hơn sẽ tốn nhiều credit hơn nhưng cho kết quả sắc nét, in ấn được.',
    },
    {
        q: 'Có hoàn tiền không?',
        a: 'FoodieSnap không hoàn tiền sau khi credit đã được cộng vào tài khoản. Tuy nhiên, credit bị trừ do lỗi hệ thống sẽ được hoàn lại tự động.',
    },
    {
        q: '4 credit miễn phí dùng được gì?',
        a: 'Bạn có thể tạo 2 ảnh chất lượng 1K với model Nano Banana 2 (phổ biến nhất), hoặc 4 ảnh với Nano Banana. Đủ để trải nghiệm trọn vẹn.',
    },
];

// ── model credit table ────────────────────────────────────────────────────────

const MODEL_ICONS = { 'nano-banana': Zap, 'nano-banana-2': Cpu, 'nano-banana-pro': Star };
const MODEL_COLORS = {
    'nano-banana': 'text-blue-600 bg-blue-50',
    'nano-banana-2': 'text-brand-orange bg-brand-orange/10',
    'nano-banana-pro': 'text-purple-600 bg-purple-50',
};

// ── package card accent ───────────────────────────────────────────────────────

const PKG_STYLE: Record<string, { accent: string; border: string; badge: string }> = {
    lite: { accent: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-600' },
    personal: { accent: 'bg-brand-orange/5', border: 'border-brand-orange', badge: 'bg-brand-orange text-white' },
    startup: { accent: 'bg-purple-50', border: 'border-purple-400', badge: 'bg-purple-500 text-white' },
};

// ─────────────────────────────────────────────────────────────────────────────

export default function PricingPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const handleBuy = () => {
        if (!user) {
            navigate('/?signin=1');
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen pb-24">
            <div className="max-w-5xl mx-auto px-6 py-14">

                {/* ── Hero ── */}
                <div className="text-center mb-14">
                    <span className="inline-flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange text-xs font-semibold px-3 py-1 rounded-full mb-4">
                        <Gift size={13} /> 4 credits miễn phí khi đăng ký
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Đơn giản & minh bạch
                    </h1>
                    <p className="text-gray-500 text-lg max-w-xl mx-auto">
                        Mua credits một lần, dùng mãi mãi. Không subscription, không phí ẩn.
                        <br />
                        <span className="font-semibold text-brand-ink">1.000đ = 2 credits</span>
                    </p>
                </div>

                {/* ── Packages ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    {CREDIT_PACKAGES.map((pkg, i) => {
                        const style = PKG_STYLE[pkg.id];
                        const isPopular = pkg.badge === 'Phổ biến';
                        const pricePerCr = (pkg.amount / pkg.credits).toFixed(0);
                        return (
                            <motion.div
                                key={pkg.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className={cn(
                                    'relative rounded-3xl border-2 p-6 flex flex-col',
                                    style.border,
                                    style.accent,
                                    isPopular && 'shadow-xl shadow-brand-orange/15'
                                )}
                            >
                                {/* Badge */}
                                {pkg.badge && (
                                    <span className={cn(
                                        'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap',
                                        style.badge
                                    )}>
                                        {pkg.badge}
                                    </span>
                                )}

                                <h3 className="text-xl font-bold mb-1">{pkg.label}</h3>
                                <div className="mb-4">
                                    <span className="text-3xl font-bold">{fmtVND(pkg.amount)}</span>
                                    <span className="text-gray-400 text-sm ml-2">/gói</span>
                                </div>

                                {/* Credits */}
                                <div className="flex items-baseline gap-1.5 mb-2">
                                    <span className="text-4xl font-bold text-brand-orange">{pkg.credits}</span>
                                    <span className="text-gray-500 text-sm">credits</span>
                                </div>
                                <p className="text-xs text-gray-400 mb-6">
                                    ≈ {pricePerCr}đ / credit
                                </p>

                                {/* What you can make */}
                                <ul className="space-y-2 mb-8 flex-1">
                                    {IMAGE_MODELS.map(m => {
                                        const Icon = MODEL_ICONS[m.id];
                                        return (
                                            <li key={m.id} className="flex items-center gap-2 text-xs text-gray-600">
                                                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0', MODEL_COLORS[m.id])}>
                                                    <Icon size={11} />
                                                </div>
                                                <span>
                                                    {imagesPerPackage(pkg.credits, m.creditCost)} ảnh 1K
                                                    {' '}
                                                    <span className="text-gray-400">({m.label})</span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                    <li className="flex items-center gap-2 text-xs text-gray-400">
                                        <Check size={13} className="text-green-500 shrink-0" />
                                        Credits không bao giờ hết hạn
                                    </li>
                                </ul>

                                <button
                                    onClick={handleBuy}
                                    className={cn(
                                        'w-full py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2',
                                        isPopular
                                            ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                                            : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-brand-orange hover:text-brand-orange'
                                    )}
                                >
                                    Mua ngay
                                    <ChevronRight size={15} />
                                </button>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Credit cost table ── */}
                <div className="glass-card rounded-3xl p-6 mb-16">
                    <h2 className="text-lg font-bold mb-1">Chi phí theo model & chất lượng</h2>
                    <p className="text-sm text-gray-500 mb-5">
                        Chi phí = <span className="font-semibold">creditCost model</span> × <span className="font-semibold">hệ số chất lượng</span>
                    </p>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left py-2 pr-4 font-mono text-[10px] uppercase text-gray-400">Model</th>
                                    {(['1K', '2K', '4K'] as const).map(size => (
                                        <th key={size} className="text-center py-2 px-3 font-mono text-[10px] uppercase text-gray-400">
                                            {size} (×{IMAGE_SIZE_MULTIPLIER[size]})
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {IMAGE_MODELS.map(m => {
                                    const Icon = MODEL_ICONS[m.id];
                                    return (
                                        <tr key={m.id} className="border-b border-gray-50 last:border-0">
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center shrink-0', MODEL_COLORS[m.id])}>
                                                        <Icon size={13} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-xs">{m.label}</p>
                                                        <p className="text-[10px] text-gray-400">{m.description}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {(['1K', '2K', '4K'] as const).map(size => {
                                                const cost = m.creditCost * IMAGE_SIZE_MULTIPLIER[size];
                                                return (
                                                    <td key={size} className="text-center py-3 px-3">
                                                        <span className="font-bold text-brand-orange">{fmtCr(cost)}</span>
                                                        <span className="text-gray-400 text-xs"> cr</span>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3">* Chi phí trên là cho mỗi ảnh. Tạo nhiều ảnh cùng lúc thì nhân thêm số lượng.</p>
                </div>

                {/* ── Free tier callout ── */}
                <div className="rounded-3xl bg-gradient-to-r from-brand-orange to-orange-400 p-8 text-white text-center mb-16">
                    <Gift size={32} className="mx-auto mb-3 opacity-90" />
                    <h2 className="text-2xl font-bold mb-2">Bắt đầu miễn phí</h2>
                    <p className="opacity-90 mb-5">
                        Nhận ngay <span className="font-bold">4 credits miễn phí</span> khi tạo tài khoản.
                        Đủ để tạo 2 ảnh chất lượng 1K với model Nano Banana 2.
                    </p>
                    <button
                        onClick={() => navigate(user ? '/app' : '/?signin=1')}
                        className="bg-white text-brand-orange font-bold px-6 py-2.5 rounded-full hover:scale-105 transition-transform inline-flex items-center gap-2"
                    >
                        <Sparkles size={16} />
                        {user ? 'Tạo ảnh ngay' : 'Đăng ký miễn phí'}
                    </button>
                </div>

                {/* ── FAQ ── */}
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-center mb-8">Câu hỏi thường gặp</h2>
                    <div className="space-y-3">
                        {FAQS.map((faq, i) => (
                            <div
                                key={i}
                                className="glass-card rounded-2xl overflow-hidden"
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left"
                                >
                                    <span className="font-semibold text-sm flex items-center gap-2">
                                        <HelpCircle size={15} className="text-brand-orange shrink-0" />
                                        {faq.q}
                                    </span>
                                    <ChevronRight
                                        size={16}
                                        className={cn(
                                            'text-gray-400 transition-transform shrink-0',
                                            openFaq === i && 'rotate-90'
                                        )}
                                    />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
