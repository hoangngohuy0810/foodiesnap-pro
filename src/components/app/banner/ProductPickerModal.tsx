import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, Package } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Product } from '../../../types';
import { listProducts } from '../../../lib/productService';

interface ProductPickerModalProps {
    token: string;
    onClose: () => void;
    onSelect: (images: string[]) => void;
    /** Already selected product images (to show checkmarks) */
    currentImages?: string[];
}

export default function ProductPickerModal({
    token,
    onClose,
    onSelect,
    currentImages = [],
}: ProductPickerModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        setError('');
        try {
            const list = await listProducts(token);
            setProducts(list.filter(p => p.image)); // Only show products with images
        } catch (e: any) {
            setError(e.message || 'Không thể tải sản phẩm.');
        } finally {
            setLoading(false);
        }
    };

    const toggleProduct = (productId: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(productId)) {
                next.delete(productId);
            } else {
                next.add(productId);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const selectedImages = products
            .filter(p => selected.has(p.id))
            .map(p => p.image);
        onSelect(selectedImages);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Package size={16} className="text-purple-500" />
                        <h3 className="text-sm font-bold text-gray-700">Chọn sản phẩm</h3>
                        {selected.size > 0 && (
                            <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {selected.size} đã chọn
                            </span>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <Loader2 size={24} className="animate-spin text-purple-500" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
                            <p className="text-sm">{error}</p>
                            <button onClick={loadProducts} className="text-xs text-purple-500 hover:text-purple-700 font-semibold">
                                Thử lại
                            </button>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-400 space-y-2">
                            <Package size={32} className="opacity-30" />
                            <p className="text-sm font-medium">Chưa có sản phẩm nào</p>
                            <p className="text-xs">Thêm sản phẩm trong Dashboard → Sản phẩm</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {products.map((product) => {
                                const isSelected = selected.has(product.id);
                                return (
                                    <button
                                        key={product.id}
                                        onClick={() => toggleProduct(product.id)}
                                        className={cn(
                                            'relative rounded-xl overflow-hidden border-2 transition-all text-left',
                                            isSelected
                                                ? 'border-purple-500 ring-2 ring-purple-200'
                                                : 'border-gray-200 hover:border-gray-300'
                                        )}
                                    >
                                        {/* Image */}
                                        <div className="aspect-square bg-gray-50">
                                            <img
                                                src={product.image}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {/* Info */}
                                        <div className="p-1.5">
                                            <p className="text-[10px] font-semibold text-gray-700 truncate">{product.name}</p>
                                            {product.price && (
                                                <p className="text-[9px] text-brand-orange font-bold">{product.price}</p>
                                            )}
                                        </div>
                                        {/* Checkmark */}
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center shadow-sm">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selected.size === 0}
                        className={cn(
                            'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
                            selected.size > 0
                                ? 'bg-purple-500 text-white hover:bg-purple-600'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        Chọn {selected.size > 0 ? `(${selected.size})` : ''}
                    </button>
                </div>
            </div>
        </div>
    );
}
