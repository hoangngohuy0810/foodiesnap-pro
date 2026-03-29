import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Users, ShoppingCart, BarChart3, Search,
    Loader2, RefreshCw, Coins, CheckCircle2, Clock, XCircle, AlertTriangle,
    Cpu, Zap, Star
} from 'lucide-react';
import { IMAGE_MODELS } from '../types';
import {
    collection, getDocs, query, limit,
    doc, updateDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';

const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';

interface AdminUser {
    uid: string;
    email: string;
    displayName: string;
    credits: number;
    totalGenerated: number;
    createdAt: any;
}

interface AdminOrder {
    id: string;
    userId: string;
    packageId: string;
    orderCode: string;
    amount: number;
    credits: number;
    status: 'pending' | 'paid' | 'expired';
    createdAt: number;
    paidAt?: number;
}

type Tab = 'stats' | 'users' | 'orders' | 'models';

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>('stats');
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [searchUser, setSearchUser] = useState('');
    const [editingCredits, setEditingCredits] = useState<{ uid: string; value: string } | null>(null);
    const [savingCredits, setSavingCredits] = useState(false);

    // Auth guard
    useEffect(() => {
        if (!authLoading) {
            if (!user || user.email !== ADMIN_EMAIL) {
                navigate('/');
            }
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user?.email === ADMIN_EMAIL) {
            if (activeTab === 'users') fetchUsers();
            if (activeTab === 'orders') fetchOrders();
        }
    }, [activeTab, user]);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const snap = await getDocs(query(collection(db, 'users'), limit(100)));
            const sorted = snap.docs
                .map(d => ({ uid: d.id, ...d.data() } as AdminUser))
                .sort((a, b) => {
                    const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? (typeof a.createdAt === 'number' ? a.createdAt : 0);
                    const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? (typeof b.createdAt === 'number' ? b.createdAt : 0);
                    return bTime - aTime;
                });
            setUsers(sorted);
        } catch {
            showToast('Không thể tải danh sách người dùng.', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const snap = await getDocs(query(collection(db, 'orders'), limit(100)));
            const sorted = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as AdminOrder))
                .sort((a, b) => b.createdAt - a.createdAt);
            setOrders(sorted);
        } catch {
            showToast('Không thể tải danh sách đơn hàng.', 'error');
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleSaveCredits = async (uid: string) => {
        if (!editingCredits) return;
        const newCredits = parseInt(editingCredits.value);
        if (isNaN(newCredits) || newCredits < 0) {
            showToast('Số credits không hợp lệ.', 'error');
            return;
        }
        setSavingCredits(true);
        try {
            await updateDoc(doc(db, 'users', uid), { credits: newCredits });
            setUsers(prev => prev.map(u => u.uid === uid ? { ...u, credits: newCredits } : u));
            showToast('Đã cập nhật credits thành công!', 'success');
            setEditingCredits(null);
        } catch {
            showToast('Không thể cập nhật credits.', 'error');
        } finally {
            setSavingCredits(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-brand-orange" />
            </div>
        );
    }

    if (!user || user.email !== ADMIN_EMAIL) return null;

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchUser.toLowerCase()) ||
        u.displayName?.toLowerCase().includes(searchUser.toLowerCase())
    );

    const totalRevenue = orders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.amount, 0);

    const totalCredsSold = orders
        .filter(o => o.status === 'paid')
        .reduce((sum, o) => sum + o.credits, 0);

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'stats', label: 'Tổng quan', icon: BarChart3 },
        { id: 'users', label: 'Người dùng', icon: Users },
        { id: 'orders', label: 'Đơn hàng', icon: ShoppingCart },
        { id: 'models', label: 'Model AI', icon: Cpu },
    ];

    const MODEL_ICON_MAP: Record<string, React.ElementType> = {
        'nano-banana': Zap,
        'nano-banana-2': Cpu,
        'nano-banana-pro': Star,
    };

    const MODEL_COLOR_MAP: Record<string, { card: string; icon: string; badge: string }> = {
        'nano-banana': { card: 'border-blue-200 bg-blue-50/50', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-700' },
        'nano-banana-2': { card: 'border-orange-200 bg-orange-50/50', icon: 'bg-orange-100 text-brand-orange', badge: 'bg-orange-100 text-brand-orange' },
        'nano-banana-pro': { card: 'border-purple-200 bg-purple-50/50', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700' },
    };

    const STATUS_CONFIG = {
        paid: { icon: CheckCircle2, color: 'text-green-600 bg-green-50', label: 'Đã thanh toán' },
        pending: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Đang chờ' },
        expired: { icon: XCircle, color: 'text-red-500 bg-red-50', label: 'Hết hạn' },
    };

    return (
        <div className="min-h-screen pb-20">
            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                        <Shield size={20} className="text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                        <p className="text-xs text-gray-400">Chỉ dành cho quản trị viên</p>
                    </div>
                </div>

                {/* Quick stats (always visible) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Tổng users', value: users.length || '—', color: 'text-blue-500 bg-blue-50', icon: Users },
                        { label: 'Tổng đơn hàng', value: orders.length || '—', color: 'text-purple-500 bg-purple-50', icon: ShoppingCart },
                        {
                            label: 'Doanh thu',
                            value: totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)}K đ` : '—',
                            color: 'text-green-500 bg-green-50',
                            icon: Coins
                        },
                        { label: 'Credits đã bán', value: totalCredsSold || '—', color: 'text-brand-orange bg-brand-orange/10', icon: Coins },
                    ].map((s, i) => {
                        const Icon = s.icon;
                        return (
                            <div key={i} className="glass-card rounded-2xl p-4 flex items-center gap-3">
                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', s.color)}>
                                    <Icon size={18} />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{s.value}</p>
                                    <p className="text-[10px] text-gray-400">{s.label}</p>
                                </div>
                            </div>
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
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                                    activeTab === tab.id ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
                                )}
                            >
                                <Icon size={15} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Stats Tab */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <ShoppingCart size={16} className="text-purple-500" />
                                    Doanh thu theo gói
                                </h3>
                                {['starter', 'pro', 'ultra'].map(pkgId => {
                                    const pkgOrders = orders.filter(o => o.packageId === pkgId && o.status === 'paid');
                                    const rev = pkgOrders.reduce((s, o) => s + o.amount, 0);
                                    return (
                                        <div key={pkgId} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <span className="text-sm capitalize text-gray-600">{pkgId}</span>
                                            <span className="text-sm font-bold text-gray-800">
                                                {pkgOrders.length} đơn · {(rev / 1000).toFixed(0)}K đ
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="font-semibold mb-4 flex items-center gap-2">
                                    <BarChart3 size={16} className="text-blue-500" />
                                    Tóm tắt hệ thống
                                </h3>
                                {[
                                    { label: 'Tổng người dùng', value: users.length },
                                    { label: 'Đơn paid', value: orders.filter(o => o.status === 'paid').length },
                                    { label: 'Đơn pending', value: orders.filter(o => o.status === 'pending').length },
                                    { label: 'Tổng credits đã bán', value: totalCredsSold },
                                    { label: 'Tổng doanh thu', value: `${(totalRevenue / 1000).toFixed(0)}K đ` },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                        <span className="text-sm text-gray-500">{row.label}</span>
                                        <span className="text-sm font-bold text-gray-800">{row.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                            <AlertTriangle size={16} className="text-yellow-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-yellow-700">
                                Để xem đầy đủ thống kê users và orders, chuyển sang tab tương ứng để tải dữ liệu.
                            </p>
                        </div>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div>
                        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                            <h2 className="text-lg font-semibold">Danh sách người dùng ({filteredUsers.length})</h2>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm email hoặc tên..."
                                        value={searchUser}
                                        onChange={e => setSearchUser(e.target.value)}
                                        className="input-field pl-8 text-sm py-2 w-60"
                                    />
                                </div>
                                <button
                                    onClick={fetchUsers}
                                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                                >
                                    <RefreshCw size={16} />
                                </button>
                            </div>
                        </div>

                        {loadingUsers ? (
                            <div className="h-40 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-purple-500" />
                            </div>
                        ) : (
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-mono">
                                            <tr>
                                                <th className="text-left px-4 py-3">Email / Tên</th>
                                                <th className="text-center px-4 py-3">Credits</th>
                                                <th className="text-center px-4 py-3">Ảnh đã tạo</th>
                                                <th className="text-center px-4 py-3">Ngày tham gia</th>
                                                <th className="text-center px-4 py-3">Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredUsers.map(u => (
                                                <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium">{u.displayName || '(Chưa đặt tên)'}</p>
                                                        <p className="text-xs text-gray-400">{u.email}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {editingCredits?.uid === u.uid ? (
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <input
                                                                    type="number"
                                                                    value={editingCredits.value}
                                                                    onChange={e => setEditingCredits({ uid: u.uid, value: e.target.value })}
                                                                    className="w-20 border border-purple-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                                                                    min="0"
                                                                />
                                                                <button
                                                                    onClick={() => handleSaveCredits(u.uid)}
                                                                    disabled={savingCredits}
                                                                    className="text-green-600 hover:text-green-700 p-1"
                                                                >
                                                                    {savingCredits ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                                </button>
                                                                <button
                                                                    onClick={() => setEditingCredits(null)}
                                                                    className="text-gray-400 hover:text-gray-600 p-1"
                                                                >
                                                                    <XCircle size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="font-bold text-brand-orange">{u.credits}</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-600">{u.totalGenerated}</td>
                                                    <td className="px-4 py-3 text-center text-xs text-gray-400">
                                                        {u.createdAt?.toDate
                                                            ? u.createdAt.toDate().toLocaleDateString('vi-VN')
                                                            : u.createdAt
                                                                ? new Date(u.createdAt).toLocaleDateString('vi-VN')
                                                                : '—'
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => setEditingCredits({ uid: u.uid, value: String(u.credits) })}
                                                            className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 mx-auto"
                                                        >
                                                            <Coins size={12} />
                                                            Sửa credits
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredUsers.length === 0 && (
                                        <div className="text-center py-10 text-gray-400">
                                            Không tìm thấy người dùng
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Models Tab */}
                {activeTab === 'models' && (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-lg font-semibold mb-1">Cấu hình Model AI & Giá Credits</h2>
                            <p className="text-sm text-gray-400 mb-6">Danh sách các model Gemini được hỗ trợ và chi phí credits tương ứng mỗi ảnh.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {IMAGE_MODELS.map(model => {
                                const Icon = MODEL_ICON_MAP[model.id] ?? Cpu;
                                const colors = MODEL_COLOR_MAP[model.id] ?? MODEL_COLOR_MAP['nano-banana-2'];
                                return (
                                    <div key={model.id} className={cn('glass-card rounded-2xl p-6 border-2 space-y-4', colors.card)}>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', colors.icon)}>
                                                <Icon size={22} />
                                            </div>
                                            {model.badge && (
                                                <span className={cn('text-[10px] font-bold px-2 py-1 rounded-full', colors.badge)}>
                                                    {model.badge}
                                                </span>
                                            )}
                                        </div>

                                        {/* Name & description */}
                                        <div>
                                            <h3 className="font-bold text-base">{model.label}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5">{model.description}</p>
                                        </div>

                                        {/* API model name */}
                                        <div className="bg-white/70 rounded-lg px-3 py-2">
                                            <p className="text-[10px] text-gray-400 uppercase font-mono mb-0.5">API Model</p>
                                            <p className="text-xs font-mono text-gray-700 break-all">{model.apiModel}</p>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                                            <span className="text-sm text-gray-500">Giá mỗi ảnh</span>
                                            <span className="text-xl font-black text-gray-800">
                                                {model.creditCost === 0.5 ? '½' : model.creditCost}
                                                <span className="text-sm font-semibold text-gray-500 ml-1">credit</span>
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pricing summary table */}
                        <div className="glass-card rounded-2xl p-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Coins size={16} className="text-brand-orange" />
                                Bảng giá tóm tắt
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-mono">
                                        <tr>
                                            <th className="text-left px-4 py-3">Model</th>
                                            <th className="text-left px-4 py-3">API Model</th>
                                            <th className="text-center px-4 py-3">Credit / ảnh</th>
                                            <th className="text-center px-4 py-3">1 ảnh</th>
                                            <th className="text-center px-4 py-3">2 ảnh</th>
                                            <th className="text-center px-4 py-3">3 ảnh</th>
                                            <th className="text-center px-4 py-3">4 ảnh</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {IMAGE_MODELS.map(model => {
                                            const Icon = MODEL_ICON_MAP[model.id] ?? Cpu;
                                            const colors = MODEL_COLOR_MAP[model.id] ?? MODEL_COLOR_MAP['nano-banana-2'];
                                            return (
                                                <tr key={model.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', colors.icon)}>
                                                                <Icon size={13} />
                                                            </div>
                                                            <span className="font-medium">{model.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-xs text-gray-500">{model.apiModel}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-brand-orange">
                                                        {model.creditCost === 0.5 ? '0.5' : model.creditCost}
                                                    </td>
                                                    {[1, 2, 3, 4].map(n => (
                                                        <td key={n} className="px-4 py-3 text-center text-gray-700 font-semibold">
                                                            {model.creditCost * n % 1 === 0 ? model.creditCost * n : (model.creditCost * n).toFixed(1)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                            <Cpu size={16} className="text-blue-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-blue-700">
                                Để thay đổi giá hoặc thêm model mới, chỉnh sửa mảng <code className="bg-blue-100 px-1 rounded font-mono text-xs">IMAGE_MODELS</code> trong <code className="bg-blue-100 px-1 rounded font-mono text-xs">src/types.ts</code> và cập nhật tương ứng trong <code className="bg-blue-100 px-1 rounded font-mono text-xs">server.js</code>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Orders Tab */}
                {activeTab === 'orders' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Danh sách đơn hàng ({orders.length})</h2>
                            <button
                                onClick={fetchOrders}
                                className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        {loadingOrders ? (
                            <div className="h-40 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-purple-500" />
                            </div>
                        ) : (
                            <div className="glass-card rounded-2xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-mono">
                                            <tr>
                                                <th className="text-left px-4 py-3">Mã đơn</th>
                                                <th className="text-left px-4 py-3">Gói</th>
                                                <th className="text-center px-4 py-3">Số tiền</th>
                                                <th className="text-center px-4 py-3">Credits</th>
                                                <th className="text-center px-4 py-3">Trạng thái</th>
                                                <th className="text-center px-4 py-3">Ngày tạo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {orders.map(order => {
                                                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                                                const StatusIcon = cfg.icon;
                                                return (
                                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg">{order.orderCode}</span>
                                                        </td>
                                                        <td className="px-4 py-3 capitalize text-gray-600">{order.packageId}</td>
                                                        <td className="px-4 py-3 text-center font-semibold">
                                                            {order.amount.toLocaleString('vi-VN')}đ
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-brand-orange font-bold">{order.credits}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium', cfg.color)}>
                                                                <StatusIcon size={11} />
                                                                {cfg.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-xs text-gray-400">
                                                            {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {orders.length === 0 && (
                                        <div className="text-center py-10 text-gray-400">
                                            Chưa có đơn hàng nào
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
