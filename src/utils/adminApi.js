import api from './api';

// ─── DASHBOARD ───────────────────────────────────────────────────
export const fetchDashboardStats = () =>
  api.get('/orders/admin/dashboard-stats').then(r => r.data.data);

// ─── ORDERS ──────────────────────────────────────────────────────
export const fetchAllOrders = (params = {}) =>
  api.get('/orders/admin/all', { params }).then(r => r.data.data);

export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/admin/${id}/status`, { status }).then(r => r.data.data);

// ─── PRODUCTS ────────────────────────────────────────────────────
export const fetchAdminProducts = (params = {}) =>
  api.get('/products', { params: { available: 'all', limit: 50, ...params } }).then(r => r.data.data);

export const createProduct = (formData) =>
  api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);

export const updateProduct = (id, formData) =>
  api.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);

export const deleteProduct = (id) =>
  api.delete(`/products/${id}`).then(r => r.data);

// ─── CATEGORIES ──────────────────────────────────────────────────
export const fetchCategories = () =>
  api.get('/categories').then(r => r.data.data.categories);

export const createCategory = (formData) =>
  api.post('/categories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);

export const updateCategory = (id, formData) =>
  api.put(`/categories/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);

export const deleteCategory = (id) =>
  api.delete(`/categories/${id}`).then(r => r.data);

// ─── USERS ───────────────────────────────────────────────────────
export const fetchAllUsers = (params = {}) =>
  api.get('/admin/users', { params }).then(r => r.data.data);

export const updateUserStatus = (id, isActive) =>
  api.patch(`/admin/users/${id}/status`, { isActive }).then(r => r.data.data);

export const updateUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role }).then(r => r.data.data);

// ─── CROSS-SELL ───────────────────────────────────────────────────
export const fetchCrossSell = () =>
  api.get('/crosssell').then(r => r.data.data.crossSell);

// Admin-specific load (includes current offerPrices)
export const fetchCrossSellAdmin = () =>
  api.get('/crosssell/admin').then(r => r.data.data.crossSell);

export const fetchCrossSellProducts = () =>
  api.get('/crosssell/products').then(r => r.data.data.products);

// payload.products = [{ productId, offerPrice }]
export const updateCrossSell = (payload) =>
  api.put('/crosssell', payload).then(r => r.data.data.crossSell);

