import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface ForgotPasswordModalProps {
    open: boolean;
    onClose: () => void;
}

export default function ForgotPasswordModal({ open, onClose }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSent(true);
        } catch (err: any) {
            const msgs: Record<string, string> = {
                'auth/user-not-found': 'Email này chưa được đăng ký.',
                'auth/invalid-email': 'Địa chỉ email không hợp lệ.',
                'auth/too-many-requests': 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
            };
            setError(msgs[err.code] ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSent(false);
        setEmail('');
        setError(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => e.target === e.currentTarget && handleClose()}
                >
                    <motion.div
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 relative"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                        >
                            <X size={20} />
                        </button>

                        {sent ? (
                            <div className="text-center py-4 space-y-3">
                                <CheckCircle2 size={48} className="text-green-500 mx-auto" />
                                <h2 className="text-xl font-bold">Đã gửi email!</h2>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    Kiểm tra hộp thư của <strong>{email}</strong> và làm theo hướng dẫn để đặt lại mật khẩu.
                                </p>
                                <button onClick={handleClose} className="btn-primary w-full mt-2">
                                    Đã hiểu
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <Mail size={24} className="text-brand-orange" />
                                    </div>
                                    <h2 className="text-xl font-bold">Quên mật khẩu?</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Nhập email của bạn, chúng tôi sẽ gửi link đặt lại mật khẩu.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            placeholder="Email của bạn"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="input-field pl-9 text-sm"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    {error && (
                                        <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2">
                                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary w-full flex items-center justify-center gap-2"
                                    >
                                        {loading && <Loader2 size={16} className="animate-spin" />}
                                        Gửi email đặt lại
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
