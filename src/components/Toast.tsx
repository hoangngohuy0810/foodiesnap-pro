import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast } from '../contexts/ToastContext';
import { cn } from '../lib/utils';

const CONFIG = {
    success: {
        icon: CheckCircle2,
        classes: 'bg-green-50 border-green-200 text-green-800',
        iconClass: 'text-green-500',
    },
    error: {
        icon: XCircle,
        classes: 'bg-red-50 border-red-200 text-red-800',
        iconClass: 'text-red-500',
    },
    warning: {
        icon: AlertTriangle,
        classes: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        iconClass: 'text-yellow-500',
    },
    info: {
        icon: Info,
        classes: 'bg-blue-50 border-blue-200 text-blue-800',
        iconClass: 'text-blue-500',
    },
};

function ToastItem({ toast }: { toast: Toast }) {
    const { removeToast } = useToast();
    const { icon: Icon, classes, iconClass } = CONFIG[toast.type];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg max-w-sm w-full pointer-events-auto',
                classes
            )}
        >
            <Icon size={18} className={cn('mt-0.5 shrink-0', iconClass)} />
            <p className="text-sm font-medium flex-1 leading-relaxed">{toast.message}</p>
            <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}

export default function ToastContainer() {
    const { toasts } = useToast();

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </AnimatePresence>
        </div>
    );
}
