import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, CheckCircle2, Clock, Loader2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { cn } from '../lib/utils';

interface PaymentModalProps {
  open: boolean;
  order: Order | null;
  onClose: () => void;
  onPaid: () => void;
}

const TIMEOUT_MINUTES = 15;
const POLL_INTERVAL_MS = 3000;

export default function PaymentModal({ open, order, onClose, onPaid }: PaymentModalProps) {
  const { getIdToken } = useAuth();
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired'>('pending');
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_MINUTES * 60);
  const [copied, setCopied] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset khi mở modal mới
  useEffect(() => {
    if (!open || !order) return;
    setStatus('pending');
    setSecondsLeft(TIMEOUT_MINUTES * 60);

    // Countdown timer
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setStatus('expired');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // Polling status đơn hàng
    const poll = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/orders/${order.orderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'paid') {
          clearInterval(pollRef.current!);
          clearInterval(timerRef.current!);
          setStatus('paid');
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.5 },
            colors: ['#FF6321', '#F5F2ED', '#1A1A1A', '#22c55e'],
          });
          setTimeout(onPaid, 2500);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời, tiếp tục poll
      }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    poll(); // Poll ngay lập tức lần đầu

    return () => {
      clearInterval(pollRef.current!);
      clearInterval(timerRef.current!);
    };
  }, [open, order?.orderId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (!order) return null;

  const qrUrl = `https://qr.sepay.vn/img?acc=${order.bankAccount}&bank=${order.bankName}&amount=${order.amount}&des=${order.orderCode}&template=compact`;

  const fields = [
    { label: 'Ngân hàng', value: order.bankName, key: 'bank' },
    { label: 'Số tài khoản', value: order.bankAccount, key: 'account' },
    { label: 'Số tiền', value: `${order.amount.toLocaleString('vi-VN')}đ`, key: 'amount' },
    { label: 'Nội dung CK', value: order.orderCode, key: 'code', highlight: true },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
              <h2 className="text-xl font-bold">Thanh toán VietQR</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {order.credits} credits • {order.amount.toLocaleString('vi-VN')}đ
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Paid success state */}
              {status === 'paid' && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8 space-y-3"
                >
                  <CheckCircle2 size={56} className="text-green-500 mx-auto" />
                  <h3 className="text-xl font-bold text-green-600">Thanh toán thành công!</h3>
                  <p className="text-gray-500 text-sm">
                    {order.credits} credits đã được cộng vào tài khoản của bạn.
                  </p>
                </motion.div>
              )}

              {/* Expired state */}
              {status === 'expired' && (
                <div className="text-center py-8 space-y-3">
                  <Clock size={48} className="text-gray-400 mx-auto" />
                  <h3 className="text-lg font-bold text-gray-600">Đã hết thời gian</h3>
                  <p className="text-gray-500 text-sm">
                    Nếu bạn đã chuyển khoản, giao dịch sẽ được tự động ghi nhận và credits sẽ được cộng trong vài phút.
                  </p>
                  <button onClick={onClose} className="btn-primary">
                    <RefreshCw size={16} />
                    Tạo đơn mới
                  </button>
                </div>
              )}

              {/* Pending state */}
              {status === 'pending' && (
                <>
                  {/* Countdown */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Thời gian còn lại:</span>
                    <span className={cn(
                      'font-mono font-bold px-3 py-1 rounded-full text-sm',
                      secondsLeft > 60 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600 animate-pulse'
                    )}>
                      <Clock size={12} className="inline mr-1" />
                      {formatTime(secondsLeft)}
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="border-2 border-gray-100 rounded-2xl p-3 bg-white">
                      <img
                        src={qrUrl}
                        alt="QR Code thanh toán"
                        className="w-48 h-48 rounded-xl"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Transfer details */}
                  <div className="space-y-2">
                    {fields.map(field => (
                      <div
                        key={field.key}
                        className={cn(
                          'flex items-center justify-between rounded-xl px-4 py-3',
                          field.highlight ? 'bg-brand-orange/10 border border-brand-orange/30' : 'bg-gray-50'
                        )}
                      >
                        <div>
                          <p className="text-[10px] font-mono text-gray-400 uppercase">{field.label}</p>
                          <p className={cn(
                            'font-semibold text-sm mt-0.5',
                            field.highlight ? 'text-brand-orange font-mono tracking-widest' : 'text-gray-800'
                          )}>
                            {field.value}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(field.value, field.key)}
                          className="p-1.5 rounded-lg hover:bg-white transition-colors shrink-0"
                          title="Sao chép"
                        >
                          {copied === field.key
                            ? <CheckCircle2 size={16} className="text-green-500" />
                            : <Copy size={16} className="text-gray-400" />
                          }
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Polling indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <Loader2 size={12} className="animate-spin" />
                    Đang chờ xác nhận thanh toán...
                  </div>

                  <p className="text-xs text-center text-gray-400 leading-relaxed">
                    Nhập đúng nội dung chuyển khoản{' '}
                    <span className="font-bold text-brand-orange">{order.orderCode}</span>{' '}
                    để hệ thống tự động xác nhận trong ~10 giây.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
