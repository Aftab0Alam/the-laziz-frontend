import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';

// Lazy load pages
const HomePage       = lazy(() => import('./pages/HomePage'));
const MenuPage       = lazy(() => import('./pages/MenuPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CartPage       = lazy(() => import('./pages/CartPage'));
const CheckoutPage   = lazy(() => import('./pages/CheckoutPage'));
const LoginPage      = lazy(() => import('./pages/LoginPage'));
const SignupPage     = lazy(() => import('./pages/SignupPage'));

// Placeholder pages (we'll build these next)
const ProfilePage    = lazy(() => import('./pages/ProfilePage'));
const OrdersPage     = lazy(() => import('./pages/OrdersPage'));
const OrderSuccessPage = lazy(() => import('./pages/OrderSuccessPage'));
const OffersPage     = lazy(() => import('./pages/OffersPage'));
const AddressesPage  = lazy(() => import('./pages/AddressesPage'));
const FavouritesPage = lazy(() => import('./pages/FavouritesPage'));

// Admin pages
const AdminLayout     = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard  = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminOrders     = lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts   = lazy(() => import('./pages/admin/AdminProducts'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminUsers      = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCrossSell  = lazy(() => import('./pages/admin/AdminCrossSell'));
const AdminSliders    = lazy(() => import('./pages/admin/AdminSliders'));

// TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

// Full-screen loader
const PageLoader = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, background: '#fff' }}>
    <div style={{ width: 56, height: 56, background: '#FFEBEE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽</div>
    <div style={{ fontSize: 14, color: '#999', fontFamily: 'Poppins, sans-serif' }}>Loading...</div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Admin-only route guard
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!['admin', 'superadmin'].includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/"           element={<HomePage />} />
            <Route path="/menu"       element={<MenuPage />} />
            <Route path="/product/:slug" element={<ProductDetailPage />} />
            <Route path="/cart"       element={<CartPage />} />
            <Route path="/offers"     element={<OffersPage />} />
            <Route path="/login"      element={<LoginPage />} />
            <Route path="/signup"     element={<SignupPage />} />

            {/* Protected routes */}
            <Route path="/checkout"   element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/orders"     element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/order-success" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
            <Route path="/addresses"  element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
            <Route path="/favourites" element={<ProtectedRoute><FavouritesPage /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders"     element={<AdminOrders />} />
              <Route path="products"   element={<AdminProducts />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="users"      element={<AdminUsers />} />
              <Route path="offers"     element={<AdminCrossSell />} />
              <Route path="sliders"    element={<AdminSliders />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>

        {/* Global Toast */}
        <Toaster
          position="bottom-center"
          containerStyle={{ bottom: 80 }}
          toastOptions={{
            duration: 2500,
            style: {
              fontFamily: 'Poppins, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 12,
              padding: '10px 16px',
              maxWidth: 320,
            },
            success: { style: { background: '#1A1A1A', color: 'white' } },
            error: { style: { background: '#B71C1C', color: 'white' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
