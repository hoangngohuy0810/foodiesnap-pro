import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Star, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CREDIT_PACKAGES, CreditPackageId, Order } from '../types';
import { cn } from '../lib/utils';

interface PricingModalProps {
  open: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

const ICONS = {
  starter: Zap,
  pro: Star,
  ultra: Crown,
};

const ICON_COLORS = {
  starter: 'text-blue-500 bg-blue-50',
  pro: 'text-brand-orange bg-brand-orange/10',
  ultra: 'text-purple-600 bg-purple-50',
};

export default function PricingModal({ open, onClose, onOrderCreated }: PricingModalProps) {
  const { getIdToken, userProfile } = useAuth();
  const [loading, setLoading] = useState<CreditPackageId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (packageId: CreditPackageId) => {
    setError(null);
    setLoading(packageId);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Lỗi tạo đơn hàng');
      onOrderCreated(data as Order);
    } catch (e: any) {
      setError(e.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Mua Credits</h2>
              <p className="text-sm text-gray-500 mt-1">
                {userProfile
                  ? `Số dư hiện tại: ${userProfile.credits} credits`
                  : '1 credit = 1 ảnh được tạo'}
              </p>
            </div>

            <div className="space-y-3">
              {CREDIT_PACKAGES.map((pkg) => {
                const Icon = ICONS[pkg.id];
                const isLoading = loading === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      'relative border-2 rounded-2xl p-4 flex items-center gap-4 transition-all',
                      pkg.badge ? 'border-brand-orange' : 'border-gray-100 hover:border-gray-200',
                    )}
                  >
                    {pkg.badge && (
                      <span className="absolute -top-2.5 left-4 bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {pkg.badge}
                      </span>
                    )}

                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', ICON_COLORS[pkg.id])}>
                      <Icon size={20} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-lg">{pkg.label}</span>
                        <span className="text-brand-orange font-mono font-bold">
                          {pkg.credits} credits
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {(pkg.amount / pkg.credits).toLocaleString('vi-VN')}đ / credit
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-lg mb-1">
                        {pkg.amount.toLocaleString('vi-VN')}đ
                      </div>
                      <button
                        onClick={() => handleBuy(pkg.id)}
                        disabled={!!loading}
                        className={cn(
                          'text-xs font-bold px-4 py-2 rounded-xl transition-all',
                          pkg.badge
                            ? 'bg-brand-orange text-white hover:bg-brand-orange/90'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                          loading && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Mua ngay'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl">
                {error}
              </div>
            )}

            <p className="text-center text-xs text-gray-400 mt-5">
              Thanh toán qua chuyển khoản ngân hàng VietQR · Credits không hết hạn
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
