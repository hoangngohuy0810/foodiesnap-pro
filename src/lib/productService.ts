import { Product } from '../types';

/** Helper: fetch with auth token */
async function authFetch(url: string, token: string, options: RequestInit = {}): Promise<Response> {
    return fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
        },
    });
}

/** List all products for current user */
export async function listProducts(token: string): Promise<Product[]> {
    const res = await authFetch('/api/products', token);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Không thể tải danh sách sản phẩm.');
    }
    const data = await res.json();
    return data.products;
}

/** Create a new product */
export async function createProduct(
    token: string,
    product: Omit<Product, 'id' | 'createdAt'>
): Promise<Product> {
    const res = await authFetch('/api/products', token, {
        method: 'POST',
        body: JSON.stringify(product),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Không thể tạo sản phẩm.');
    }
    const data = await res.json();
    return data.product;
}

/** Update an existing product */
export async function updateProduct(
    token: string,
    id: string,
    updates: Partial<Omit<Product, 'id' | 'createdAt'>>
): Promise<Product> {
    const res = await authFetch(`/api/products/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Không thể cập nhật sản phẩm.');
    }
    const data = await res.json();
    return data.product;
}

/** Delete a product */
export async function deleteProduct(token: string, id: string): Promise<void> {
    const res = await authFetch(`/api/products/${id}`, token, {
        method: 'DELETE',
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Không thể xóa sản phẩm.');
    }
}
