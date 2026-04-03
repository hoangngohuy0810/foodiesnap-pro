import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Coins, Sparkles,
    User, Camera, Loader2, RefreshCw, BarChart3,
    Receipt, CheckCircle2, Clock3, Package,
} from 'lucide-react';
import {
    collection, query, where, limit, getDocs,
    doc, updateDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CreditOrder {
    id: string;
    orderCode: string;
    packageId: string;
    label: string;
    amount: number;
    credits: number;
    status: 'pending' | 'paid' | 'expired';
    createdAt: number;
    paidAt?: number;
}

type Tab = 'credit-history' | 'stats' | 'profile';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDateTime(ts: number): string {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `Hôm nay, ${timeStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Hôm qua, ${timeStr}`;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ', ' + timeStr;
}

const STATUS_CONFIG: Record<CreditOrder['status'], { label: string; icon: React.ElementType; className: string }> = {
    paid: { label: 'Thành công', icon: CheckCircle2, className: 'text-green-600 bg-green-50' },
    pending: { label: 'Chờ thanh toán', icon: Clock3, className: 'text-yellow-600 bg-yellow-50' },
    expired: { label: 'Hết hạn', icon: Clock3, className: 'text-gray-500 bg-gray-100' },
};

const PACKAGE_COLORS: Record<string, string> = {
    lite: 'text-blue-600 bg-blue-50',
    personal: 'text-brand-orange bg-brand-orange/10',
    startup: 'text-purple-600 bg-purple-50',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>('credit-history');
    const [orders, setOrders] = useState<CreditOrder[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user && activeTab === 'credit-history') {
            fetchOrders();
        }
    }, [user, activeTab]);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
        }
    }, [userProfile]);

    const fetchOrders = async () => {
        if (!user) return;
        setLoadingOrders(true);
        try {
            const q = query(
                collection(db, 'orders'),
                where('userId', '==', user.uid),
                limit(100)
            );
            const snap = await getDocs(q);
            const items: CreditOrder[] = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as CreditOrder))
                .sort((a, b) => b.createdAt - a.createdAt);
            setOrders(items);
        } catch (e) {
            console.error(e);
            showToast('Không thể tải lịch sử nạp credit.', 'error');
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !displayName.trim()) return;
        setSavingProfile(true);
        try {
            await updateProfile(user, { displayName: displayName.trim() });
            await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
            showToast('Cập nhật tên thành công!', 'success');
        } catch (e) {
            showToast('Không thể cập nhật tên. Vui lòng thử lại.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-orange" />
            </div>
        );
    }

    if (!user) return null;

    const totalImages = userProfile?.totalGenerated ?? 0;
    const creditsRemaining = userProfile?.credits ?? 0;
    const totalPaid = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.amount, 0);
    const totalCreditsBought = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + o.credits, 0);

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'credit-history', label: 'Lịch sử nạp credit', icon: Receipt },
        { id: 'stats', label: 'Thống kê', icon: BarChart3 },
        { id: 'profile', label: 'Hồ sơ', icon: User },
    ];

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Xin chào, <span className="font-semibold text-brand-orange">{userProfile?.displayName || user.email}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/app')}
                        className="btn-primary flex items-center gap-2 text-sm"
                    >
                        <Sparkles size={16} />
                        Tạo ảnh mới
                    </button>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { icon: Coins, label: 'Credits còn lại', value: creditsRemaining, color: 'text-brand-orange bg-brand-orange/10' },
                        { icon: Camera, label: 'Tổng ảnh đã tạo', value: totalImages, color: 'text-blue-500 bg-blue-50' },
                        { icon: Package, label: 'Tổng credit đã mua', value: totalCreditsBought, color: 'text-purple-500 bg-purple-50' },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass-card rounded-2xl p-5 flex items-center gap-4"
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                                    <Icon size={22} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{stat.value.toLocaleString('vi-VN')}</p>
                                    <p className="text-xs text-gray-500">{stat.label}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6 w-fit">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-white shadow text-brand-orange'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Icon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* ── Credit History Tab ── */}
                {activeTab === 'credit-history' && (
                    <div>
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h2 className="text-lg font-semibold">Lịch sử nạp credit</h2>
                                {totalPaid > 0 && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Tổng đã nạp: <span className="font-semibold text-brand-orange">{formatVND(totalPaid)}</span>
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={fetchOrders}
                                disabled={loadingOrders}
                                className="p-2 text-gray-400 hover:text-brand-orange transition-colors disabled:opacity-40"
                                title="Tải lại"
                            >
                                <RefreshCw size={16} className={loadingOrders ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        {loadingOrders ? (
                            <div className="h-60 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-brand-orange" />
                            </div>
                        ) : orders.length === 0 ? (
                            <div className="h-60 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-3">
                                <Receipt size={36} className="opacity-30" />
                                <p className="font-medium">Chưa có giao dịch nào</p>
                                <button
                                    onClick={() => navigate('/pricing')}
                                    className="btn-primary text-sm"
                                >
                                    Mua credits ngay
                                </button>
                            </div>
                        ) : (
                            <div className="glass-card rounded-2xl overflow-hidden">
                                {/* Table header */}
                                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    <span>Mã đơn</span>
                                    <span>Gói</span>
                                    <span>Credits</span>
                                    <span>Số tiền</span>
                                    <span>Thời gian / Trạng thái</span>
                                </div>

                                <div className="divide-y divide-gray-50">
                                    {orders.map((order, i) => {
                                        const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
                                        const StatusIcon = statusCfg.icon;
                                        const pkgColor = PACKAGE_COLORS[order.packageId] ?? 'text-gray-600 bg-gray-100';

                                        return (
                                            <motion.div
                                                key={order.id}
                                                initial={{ opacity: 0, x: -8 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-2 sm:gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors"
                                            >
                                                {/* Order code */}
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-semibold text-gray-700">
                                                        {order.orderCode}
                                                    </span>
                                                </div>

                                                {/* Package */}
                                                <div className="flex items-center">
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pkgColor}`}>
                                                        {order.label || order.packageId}
                                                    </span>
                                                </div>

                                                {/* Credits */}
                                                <div className="flex items-center gap-1.5">
                                                    <Coins size={14} className="text-brand-orange shrink-0" />
                                                    <span className="font-bold text-gray-800">+{order.credits.toLocaleString('vi-VN')}</span>
                                                    <span className="text-xs text-gray-400">credits</span>
                                                </div>

                                                {/* Amount */}
                                                <div className="flex items-center">
                                                    <span className="font-semibold text-gray-700 text-sm">
                                                        {formatVND(order.amount)}
                                                    </span>
                                                </div>

                                                {/* Time + Status */}
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-gray-400">
                                                        {order.status === 'paid' && order.paidAt
                                                            ? formatDateTime(order.paidAt)
                                                            : formatDateTime(order.createdAt)}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full w-fit ${statusCfg.className}`}>
                                                        <StatusIcon size={11} />
                                                        {statusCfg.label}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Footer summary */}
                                {orders.filter(o => o.status === 'paid').length > 0 && (
                                    <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            {orders.filter(o => o.status === 'paid').length} giao dịch thành công
                                        </span>
                                        <span className="text-xs font-semibold text-gray-600">
                                            Tổng: <span className="text-brand-orange">{formatVND(totalPaid)}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Stats Tab ── */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Thống kê tài khoản</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="text-sm font-mono uppercase text-gray-400 mb-4">Tổng quan</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Ảnh đã tạo', value: totalImages, unit: 'ảnh' },
                                        { label: 'Credits còn lại', value: creditsRemaining, unit: 'credits' },
                                        { label: 'Credits đã mua', value: totalCreditsBought, unit: 'credits' },
                                        { label: 'Tổng chi tiêu', value: formatVND(totalPaid), unit: '' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <span className="text-sm text-gray-600">{row.label}</span>
                                            <span className="font-bold text-brand-orange">
                                                {typeof row.value === 'number' ? row.value.toLocaleString('vi-VN') : row.value}
                                                {row.unit && <span className="text-xs font-normal text-gray-400 ml-1">{row.unit}</span>}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="text-sm font-mono uppercase text-gray-400 mb-4">Thông tin tài khoản</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Email', value: user.email },
                                        { label: 'Tên hiển thị', value: userProfile?.displayName || '—' },
                                        {
                                            label: 'Ngày tham gia',
                                            value: userProfile?.createdAt
                                                ? new Date(userProfile.createdAt as any).toLocaleDateString('vi-VN')
                                                : '—'
                                        },
                                        { label: 'Đăng nhập qua', value: user.providerData[0]?.providerId === 'google.com' ? 'Google' : 'Email' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <span className="text-sm text-gray-500">{row.label}</span>
                                            <span className="text-sm font-medium text-gray-800 max-w-[180px] truncate text-right">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Profile Tab ── */}
                {activeTab === 'profile' && (
                    <div className="max-w-lg space-y-6">
                        <h2 className="text-lg font-semibold">Chỉnh sửa hồ sơ</h2>

                        <div className="glass-card rounded-2xl p-6 space-y-5">
                            {/* Avatar */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                                    {user.photoURL
                                        ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                        : <User size={28} className="text-gray-400" />
                                    }
                                </div>
                                <div>
                                    <p className="font-semibold">{userProfile?.displayName || 'Người dùng'}</p>
                                    <p className="text-sm text-gray-400">{user.email}</p>
                                </div>
                            </div>

                            {/* Display name */}
                            <div>
                                <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">
                                    Tên hiển thị
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    className="input-field text-sm"
                                    placeholder="Tên của bạn"
                                />
                            </div>

                            {/* Email (readonly) */}
                            <div>
                                <label className="text-xs font-mono uppercase text-gray-400 mb-2 block">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={user.email ?? ''}
                                    readOnly
                                    className="input-field text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                                />
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                disabled={savingProfile || !displayName.trim()}
                                className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                            >
                                {savingProfile && <Loader2 size={15} className="animate-spin" />}
                                Lưu thay đổi
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
