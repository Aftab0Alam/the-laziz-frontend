import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, Tag, ShoppingCart, User } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const itemCount = useCartStore(s => s.items.reduce((sum, i) => sum + i.quantity, 0));
  const { isAuthenticated } = useAuthStore();

  const tabs = [
    { path: '/', icon: <Home size={22} />, label: 'Home' },
    { path: '/menu', icon: <UtensilsCrossed size={22} />, label: 'Menu' },
    { path: '/offers', icon: <Tag size={22} />, label: 'Offers' },
    { path: '/cart', icon: <ShoppingCart size={22} />, label: 'Cart', badge: itemCount },
    { path: '/profile', icon: <User size={22} />, label: 'Profile' },
  ];

  const handleNav = (path) => {
    if ((path === '/profile') && !isAuthenticated) { navigate('/login'); return; }
    navigate(path);
  };

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.path}
          className={`nav-item${location.pathname === tab.path ? ' active' : ''}`}
          onClick={() => handleNav(tab.path)}
          aria-label={tab.label}
        >
          <span className="nav-icon">
            {tab.icon}
            {tab.badge > 0 && <span className="nav-badge">{tab.badge}</span>}
          </span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
