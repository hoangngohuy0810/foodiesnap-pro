import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
    Image as ImageIcon, Coins, Sparkles, Download, Maximize2,
    User, Camera, Loader2, RefreshCw, BarChart3
} from 'lucide-react';
import {
    collection, query, where, orderBy, limit, getDocs,
    doc, updateDoc
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { downloadImage } from '../lib/utils';
import { GenerationSettings } from '../types';

interface HistoryItem {
    id: string;
    images: string[];
    timestamp: number;
    count: number;
    settings: GenerationSettings;
}

type Tab = 'gallery' | 'stats' | 'profile';

export default function DashboardPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState<Tab>('gallery');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            navigate('/');
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        if (user && activeTab === 'gallery') {
            fetchHistory();
        }
    }, [user, activeTab]);

    useEffect(() => {
        if (userProfile) {
            setDisplayName(userProfile.displayName || '');
        }
    }, [userProfile]);

    const fetchHistory = async () => {
        if (!user) return;
        setLoadingHistory(true);
        try {
            // Simple query without orderBy to avoid requiring composite index
            const q = query(
                collection(db, 'generations'),
                where('userId', '==', user.uid),
                limit(50)
            );
            const snap = await getDocs(q);
            const items: HistoryItem[] = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as HistoryItem))
                .sort((a, b) => b.timestamp - a.timestamp); // client-side sort
            setHistory(items);
        } catch (e) {
            console.error(e);
            showToast('Không thể tải lịch sử ảnh.', 'error');
        } finally {
            setLoadingHistory(false);
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
    const totalSessions = history.length;

    const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
        { id: 'gallery', label: 'Ảnh của tôi', icon: ImageIcon },
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
                        { icon: ImageIcon, label: 'Tổng ảnh đã tạo', value: totalImages, color: 'text-blue-500 bg-blue-50' },
                        { icon: Coins, label: 'Credits còn lại', value: creditsRemaining, color: 'text-brand-orange bg-brand-orange/10' },
                        { icon: Camera, label: 'Phiên làm việc', value: totalSessions, color: 'text-purple-500 bg-purple-50' },
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
                                    <p className="text-2xl font-bold">{stat.value}</p>
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

                {/* Gallery Tab */}
                {activeTab === 'gallery' && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Lịch sử tạo ảnh</h2>
                            <button
                                onClick={fetchHistory}
                                className="p-2 text-gray-400 hover:text-brand-orange transition-colors"
                                title="Tải lại"
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        {loadingHistory ? (
                            <div className="h-60 flex items-center justify-center">
                                <Loader2 size={28} className="animate-spin text-brand-orange" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="h-60 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-3">
                                <ImageIcon size={36} className="opacity-30" />
                                <p className="font-medium">Chưa có ảnh nào</p>
                                <button
                                    onClick={() => navigate('/app')}
                                    className="btn-primary text-sm"
                                >
                                    Tạo ảnh đầu tiên
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {history.map((session) => (
                                    <div key={session.id}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <p className="text-xs text-gray-400 font-mono">
                                                {new Date(session.timestamp).toLocaleString('vi-VN')}
                                            </p>
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                                                {session.settings?.style || 'Studio'}
                                            </span>
                                            <span className="text-xs bg-brand-orange/10 text-brand-orange px-2 py-0.5 rounded-full">
                                                {session.count} ảnh
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {session.images.map((url, idx) => (
                                                <div key={idx} className="group relative rounded-2xl overflow-hidden aspect-square">
                                                    <img
                                                        src={url}
                                                        alt={`Generated ${idx + 1}`}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => downloadImage(url, `foodie-snap-${session.id}-${idx + 1}.png`)}
                                                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-orange hover:text-white transition-all"
                                                        >
                                                            <Download size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => window.open(url, '_blank')}
                                                            className="w-9 h-9 bg-white rounded-full flex items-center justify-center text-brand-ink hover:bg-brand-orange hover:text-white transition-all"
                                                        >
                                                            <Maximize2 size={15} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Stats Tab */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        <h2 className="text-lg font-semibold">Thống kê tài khoản</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card rounded-2xl p-6">
                                <h3 className="text-sm font-mono uppercase text-gray-400 mb-4">Tổng quan</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: 'Ảnh đã tạo', value: totalImages, unit: 'ảnh' },
                                        { label: 'Credits đã dùng', value: totalImages, unit: 'credits' },
                                        { label: 'Credits còn lại', value: creditsRemaining, unit: 'credits' },
                                        { label: 'Phiên làm việc', value: totalSessions, unit: 'phiên' },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                            <span className="text-sm text-gray-600">{row.label}</span>
                                            <span className="font-bold text-brand-orange">
                                                {row.value} <span className="text-xs font-normal text-gray-400">{row.unit}</span>
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

                {/* Profile Tab */}
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
