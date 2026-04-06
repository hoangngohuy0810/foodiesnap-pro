import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Download, Image as ImageIcon, Loader2, Trash2,
    Clock, History, RefreshCw,
} from 'lucide-react';
import {
    collection, query, where, limit, getDocs,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { downloadImage } from '../../lib/utils';
import { GeneratedImage, GenerationSettings, GenerationType } from '../../types';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(timestamp: number): string {
    const d = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (d.toDateString() === today.toDateString()) return `Hôm nay, ${timeStr}`;
    if (d.toDateString() === yesterday.toDateString()) return `Hôm qua, ${timeStr}`;
    return (
        d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
        ', ' + timeStr
    );
}

function groupByDate(
    images: GeneratedImage[]
): { label: string; images: GeneratedImage[] }[] {
    const groups: Record<string, GeneratedImage[]> = {};
    for (const img of images) {
        const key = new Date(img.timestamp).toDateString();
        if (!groups[key]) groups[key] = [];
        groups[key].push(img);
    }
    return Object.entries(groups).map(([, imgs]) => {
        const d = new Date(imgs[0].timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let label: string;
        if (d.toDateString() === today.toDateString()) label = 'Hôm nay';
        else if (d.toDateString() === yesterday.toDateString()) label = 'Hôm qua';
        else
            label = d.toLocaleDateString('vi-VN', {
                weekday: 'long',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });

        return { label, images: imgs };
    });
}

// ── Firestore session → flat GeneratedImage[] ─────────────────────────────────

interface FirestoreSession {
    id: string;
    images: string[];
    timestamp: number;
    count: number;
    settings: GenerationSettings;
    type?: GenerationType;
    styles?: string[];
    bannerTypography?: string;
}

function sessionToImages(session: FirestoreSession): GeneratedImage[] {
    return session.images.map((url, idx) => ({
        id: `${session.id}-${idx}`,
        url,
        timestamp: session.timestamp,
        settings: session.settings,
        type: session.type || 'food',
        bannerStyle: session.styles?.[idx],
        bannerTypography: session.bannerTypography,
    }));
}

// ── component ─────────────────────────────────────────────────────────────────

interface GenerationHistoryProps {
    /** Images produced in this browser session (prepended on top) */
    sessionImages: GeneratedImage[];
    isGenerating: boolean;
    pendingCount: number;
    isLoggedIn: boolean;
    userId?: string;
    onEnlarge: (url: string) => void;
    onClearSession: () => void;
    onBatchDownload: () => void;
}

export default function GenerationHistory({
    sessionImages,
    isGenerating,
    pendingCount,
    isLoggedIn,
    userId,
    onEnlarge,
    onClearSession,
    onBatchDownload,
}: GenerationHistoryProps) {
    const [historyImages, setHistoryImages] = useState<GeneratedImage[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch full Firestore history for this user
    const fetchHistory = useCallback(async () => {
        if (!userId) return;
        setLoadingHistory(true);
        try {
            const q = query(
                collection(db, 'generations'),
                where('userId', '==', userId),
                limit(100)
            );
            const snap = await getDocs(q);
            const sessions: FirestoreSession[] = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as FirestoreSession))
                .sort((a, b) => b.timestamp - a.timestamp);

            const flat = sessions.flatMap(sessionToImages);
            setHistoryImages(flat);
        } catch (e) {
            console.error('Failed to load history:', e);
        } finally {
            setLoadingHistory(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Re-fetch when new session images arrive (after a generation completes)
    useEffect(() => {
        if (sessionImages.length > 0) {
            // Small delay to allow Firestore to persist before re-fetching
            const t = setTimeout(() => fetchHistory(), 1500);
            return () => clearTimeout(t);
        }
    }, [sessionImages.length, fetchHistory]);

    // Deduplicate: session images shown at top, then history images not already in session
    const sessionIds = new Set(sessionImages.map(i => i.url));
    const historyOnly = historyImages.filter(i => !sessionIds.has(i.url));
    const allImages: GeneratedImage[] = [...sessionImages, ...historyOnly];

    const isEmpty = allImages.length === 0 && !isGenerating && !loadingHistory;
    const dateGroups = groupByDate(allImages);
    const totalCount = allImages.length;

    return (
        <div className="space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <History size={20} className="text-brand-orange" />
                    Ảnh đã tạo
                    {totalCount > 0 && (
                        <span className="text-sm font-normal text-gray-400 font-sans">
                            ({totalCount} ảnh)
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-2">
                    {/* Refresh */}
                    <button
                        onClick={fetchHistory}
                        disabled={loadingHistory}
                        className="p-2 text-gray-400 hover:text-brand-orange transition-colors disabled:opacity-40"
                        title="Tải lại lịch sử"
                    >
                        <RefreshCw size={15} className={loadingHistory ? 'animate-spin' : ''} />
                    </button>

                    {sessionImages.length > 0 && (
                        <>
                            <button
                                onClick={onBatchDownload}
                                className="text-sm font-medium text-brand-orange flex items-center gap-1.5 hover:underline"
                            >
                                <Download size={15} />
                                Tải phiên (.zip)
                            </button>
                            <button
                                onClick={onClearSession}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Xóa ảnh phiên hiện tại"
                            >
                                <Trash2 size={15} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Loading history ── */}
            {loadingHistory && allImages.length === 0 && !isGenerating && (
                <div className="h-40 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-brand-orange" />
                </div>
            )}

            {/* ── Empty state ── */}
            {isEmpty && (
                <div className="h-[320px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center text-gray-400 space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                        <ImageIcon size={40} />
                    </div>
                    <div className="text-center">
                        <p className="font-medium">Chưa có ảnh nào được tạo</p>
                        <p className="text-sm">
                            {isLoggedIn
                                ? 'Tạo ảnh món ăn hoặc banner để bắt đầu'
                                : 'Đăng nhập để bắt đầu tạo ảnh'}
                        </p>
                        {!isLoggedIn && (
                            <p className="mt-3 text-xs text-brand-orange font-medium">
                                Nhận 3 credits miễn phí khi đăng ký!
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Content ── */}
            {(allImages.length > 0 || isGenerating) && (
                <div className="space-y-6">
                    {/* Generating skeletons */}
                    <AnimatePresence>
                        {isGenerating && (
                            <motion.div
                                key="skeletons"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                                        <Clock size={13} className="text-brand-orange animate-pulse" />
                                        Đang tạo...
                                    </div>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
                                    {Array.from({ length: pendingCount }).map((_, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: i * 0.08 }}
                                            className="glass-card rounded-lg overflow-hidden"
                                        >
                                            <div className="aspect-square flex flex-col items-center justify-center bg-gray-50">
                                                <Loader2 className="animate-spin text-brand-orange" size={16} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Date-grouped images */}
                    {dateGroups.map(({ label, images }) => (
                        <div key={label}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                                    <Clock size={13} className="text-brand-orange" />
                                    {label}
                                </div>
                                <div className="flex-1 h-px bg-gray-100" />
                                <span className="text-[10px] text-gray-400">{images.length} ảnh</span>
                            </div>

                            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
                                <AnimatePresence mode="popLayout">
                                    {images.map((img) => {
                                        const isBanner = img.type === 'banner';
                                        return (
                                            <motion.div
                                                key={img.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="group relative rounded-lg overflow-hidden cursor-pointer bg-gray-100"
                                                onClick={() => onEnlarge(img.url)}
                                                title={isBanner ? (img.bannerStyle || 'Banner') : (img.settings?.style ?? '')}
                                            >
                                                <img
                                                    src={img.url}
                                                    alt={isBanner ? 'Banner' : 'Food'}
                                                    className="w-full aspect-square object-cover"
                                                    loading="lazy"
                                                />

                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadImage(img.url, `${isBanner ? 'banner' : 'foodie-snap'}-${img.id}.png`);
                                                        }}
                                                        className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-700 opacity-0 group-hover:opacity-100 hover:bg-brand-orange hover:text-white transition-all"
                                                        title="Tải xuống"
                                                    >
                                                        <Download size={10} />
                                                    </button>
                                                </div>

                                                {/* Type dot */}
                                                <div className={`absolute top-1 left-1 w-1.5 h-1.5 rounded-full ${isBanner ? 'bg-purple-500' : 'bg-brand-orange'}`} />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
