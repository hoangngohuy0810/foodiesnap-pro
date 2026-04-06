import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Camera, Coins, User, LogOut, LayoutDashboard, Menu, X, Shield, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import PricingModal from './PricingModal';
import PaymentModal from './PaymentModal';
import { Order } from '../types';
import { cn } from '../lib/utils';

const ADMIN_EMAIL = 'ngohuyhoang1995@gmail.com';

export default function Navbar() {
    const { user, userProfile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [pricingModalOpen, setPricingModalOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isAdmin = user?.email === ADMIN_EMAIL;
    const isLanding = location.pathname === '/';

    const handleOrderCreated = (order: Order) => {
        setCurrentOrder(order);
        setPricingModalOpen(false);
        setPaymentModalOpen(true);
    };

    // Listen for custom event from PricingPage
    useEffect(() => {
        const handleOpenPayment = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                setCurrentOrder(customEvent.detail);
                setPricingModalOpen(false);
                setPaymentModalOpen(true);
            }
        };
        window.addEventListener('open-payment', handleOpenPayment);
        return () => window.removeEventListener('open-payment', handleOpenPayment);
    }, []);

    const handlePaymentSuccess = () => {
        setPaymentModalOpen(false);
        setCurrentOrder(null);
    };

    return (
        <>
            <header className={cn(
                'sticky top-0 z-40 border-b',
                isLanding
                    ? 'bg-brand-cream/80 backdrop-blur-md border-brand-cream/20'
                    : 'bg-white/80 backdrop-blur-md border-gray-100'
            )}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center text-white">
                            <Camera size={20} />
                        </div>
                        <span className="text-xl font-bold tracking-tight hidden sm:block">
                            Ảnh Đẹp
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        <Link
                            to="/app"
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                                location.pathname === '/app'
                                    ? 'bg-brand-orange/10 text-brand-orange'
                                    : 'text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            Studio
                        </Link>
                        <Link
                            to="/pricing"
                            className={cn(
                                'px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5',
                                location.pathname === '/pricing'
                                    ? 'bg-brand-orange/10 text-brand-orange'
                                    : 'text-gray-600 hover:bg-gray-100'
                            )}
                        >
                            <Tag size={14} />
                            Bảng giá
                        </Link>
                        {user && (
                            <Link
                                to="/dashboard"
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                                    location.pathname === '/dashboard'
                                        ? 'bg-brand-orange/10 text-brand-orange'
                                        : 'text-gray-600 hover:bg-gray-100'
                                )}
                            >
                                Dashboard
                            </Link>
                        )}
                        {isAdmin && (
                            <Link
                                to="/admin"
                                className={cn(
                                    'px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5',
                                    location.pathname === '/admin'
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                )}
                            >
                                <Shield size={14} />
                                Admin
                            </Link>
                        )}
                    </nav>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                <button
                                    onClick={() => setPricingModalOpen(true)}
                                    className="flex items-center gap-1.5 bg-brand-orange/10 text-brand-orange px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-brand-orange/20 transition-colors"
                                >
                                    <Coins size={14} />
                                    <span>{userProfile?.credits ?? 0}</span>
                                </button>

                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-brand-orange transition-all"
                                    title="Dashboard"
                                >
                                    {user.photoURL
                                        ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                        : <User size={15} className="text-gray-500" />
                                    }
                                </button>

                                <button
                                    onClick={() => signOut()}
                                    className="hidden md:flex p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                                    title="Đăng xuất"
                                >
                                    <LogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setAuthModalOpen(true)}
                                    className="text-sm font-medium text-gray-600 hover:text-brand-orange transition-colors px-3 py-2 hidden sm:block"
                                >
                                    Đăng nhập
                                </button>
                                <button
                                    onClick={() => setAuthModalOpen(true)}
                                    className="btn-primary text-sm py-2 px-4"
                                >
                                    Dùng thử miễn phí
                                </button>
                            </>
                        )}

                        {/* Mobile hamburger */}
                        <button
                            className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 flex flex-col gap-2">
                        <Link
                            to="/app"
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <Camera size={16} />
                            Studio
                        </Link>
                        <Link
                            to="/pricing"
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50',
                                location.pathname === '/pricing' ? 'text-brand-orange' : 'text-gray-700'
                            )}
                        >
                            <Tag size={16} />
                            Bảng giá
                        </Link>
                        {user && (
                            <Link
                                to="/dashboard"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <LayoutDashboard size={16} />
                                Dashboard
                            </Link>
                        )}
                        {isAdmin && (
                            <Link
                                to="/admin"
                                onClick={() => setMobileMenuOpen(false)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-purple-700 hover:bg-purple-50"
                            >
                                <Shield size={16} />
                                Admin
                            </Link>
                        )}
                        {user && (
                            <button
                                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50"
                            >
                                <LogOut size={16} />
                                Đăng xuất
                            </button>
                        )}
                    </div>
                )}
            </header>

            <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            <PricingModal
                open={pricingModalOpen}
                onClose={() => setPricingModalOpen(false)}
                onOrderCreated={handleOrderCreated}
            />
            <PaymentModal
                open={paymentModalOpen}
                order={currentOrder}
                onClose={() => { setPaymentModalOpen(false); setCurrentOrder(null); }}
                onPaid={handlePaymentSuccess}
            />
        </>
    );
}
