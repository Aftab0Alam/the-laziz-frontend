import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, Star, Flame, Sparkles, MessageCircle, UtensilsCrossed } from 'lucide-react';
import Header from '../components/Layout/Header';
import BottomNav from '../components/Layout/BottomNav';
import HeroSlider from '../components/Slider/HeroSlider';
import ProductCard from '../components/Product/ProductCard';
import api from '../utils/api';

/* ── Skeletons ─────────────────────────────────────────────────── */
const CategorySkeleton = () => (
  <div style={{ display: 'flex', gap: 12, padding: '0 16px', overflowX: 'hidden' }}>
    {[...Array(6)].map((_, i) => (
      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div className="skeleton" style={{ width: 72, height: 72, borderRadius: 18 }} />
        <div className="skeleton" style={{ width: 52, height: 9, borderRadius: 4 }} />
      </div>
    ))}
  </div>
);

const ProductCardSkeleton = () => (
  <div style={{ minWidth: 155, borderRadius: 16, overflow: 'hidden', background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', flexShrink: 0 }}>
    <div className="skeleton" style={{ width: '100%', height: 130 }} />
    <div style={{ padding: '10px 12px' }}>
      <div className="skeleton" style={{ height: 11, borderRadius: 4, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 10, width: '55%', borderRadius: 4, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 13, width: '40%', borderRadius: 4 }} />
    </div>
  </div>
);

/* ── Feature strip card ─────────────────────────────────────────── */
const FeatureCard = ({ icon: Icon, title, sub, color, bg }) => (
  <div style={{
    flex: 1, background: bg, borderRadius: 16,
    padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, textAlign: 'center', minWidth: 0,
  }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={20} color={color} />
    </div>
    <div style={{ fontSize: 12, fontWeight: 800, color: '#1a1a1a', lineHeight: 1.2 }}>{title}</div>
    <div style={{ fontSize: 10, color: '#888', fontWeight: 500 }}>{sub}</div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════ */
const HomePage = () => {
  const navigate = useNavigate();

  const { data: slidersData } = useQuery({
    queryKey: ['sliders'],
    queryFn: () => api.get('/sliders').then(r => r.data.data.sliders),
    staleTime: 10 * 60 * 1000,
  });

  const { data: categoriesData, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data.categories),
    staleTime: 60 * 60 * 1000,
  });

  const { data: bestSellersData, isLoading: bsLoading } = useQuery({
    queryKey: ['bestSellers'],
    queryFn: () => api.get('/products?isBestSeller=true&limit=8').then(r => r.data.data.products),
    staleTime: 5 * 60 * 1000,
  });

  const { data: featuredData, isLoading: featLoading } = useQuery({
    queryKey: ['todaySpecial'],
    queryFn: () => api.get('/products?isFeatured=true&limit=6').then(r => r.data.data.products),
    staleTime: 5 * 60 * 1000,
  });

  const { data: crossSellData, isLoading: csLoading } = useQuery({
    queryKey: ['crossSell'],
    queryFn: () => api.get('/crosssell').then(r => r.data.data.crossSell),
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="page-wrapper" style={{ paddingTop: 0, background: '#F7F7F8' }}>
      <Header />

      <div style={{ paddingTop: '60px', paddingBottom: 80 }}>

        {/* ── Hero Slider ─────────────────────────────────────────── */}
        <HeroSlider sliders={slidersData || []} />

        {/* ── Feature pills row ──────────────────────────────────── */}
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
          <FeatureCard icon={Clock}            title="30-45 Min"   sub="Fast Delivery"   color="#E53935" bg="#fff5f5" />
          <FeatureCard icon={Star}             title="4.8 Rated"   sub="Top Rated Food"  color="#F59E0B" bg="#fffbeb" />
          <FeatureCard icon={UtensilsCrossed}  title="100% Fresh"  sub="Made to Order"   color="#10B981" bg="#f0fdf4" />
        </div>

        {/* ── TODAY'S OFFER ───────────────────────────────────────── */}
        {(crossSellData?.isActive && (crossSellData?.productIds?.length > 0 || csLoading)) && (
          <section className="cs-offer-section">
            <div className="cs-offer-banner">
              <div className="cs-blob cs-blob-1" />
              <div className="cs-blob cs-blob-2" />
              <div className="cs-blob cs-blob-3" />

              <div className="cs-offer-toprow">
                <span className="cs-offer-badge">
                  <span className="cs-fire">🔥</span>
                  {crossSellData?.badgeLabel || 'LIMITED TIME'}
                </span>
                <button className="cs-view-all" onClick={() => navigate('/offers')}>View All →</button>
              </div>

              {crossSellData?.discountLabel && (
                <div className="cs-discount-pill">
                  <span className="cs-discount-amount">{crossSellData.discountLabel}</span>
                  <span className="cs-discount-off">OFF</span>
                </div>
              )}

              <h2 className="cs-offer-title">{crossSellData?.title || "Today's Special Offer"}</h2>
              <p className="cs-offer-subtitle">{crossSellData?.subtitle || "Grab these deals before they're gone!"}</p>

              <div className="cs-urgency-row">
                <span className="cs-urgency-dot" />
                <span className="cs-urgency-text">⚡ Hurry! Offer ends at midnight</span>
              </div>
            </div>

            <div className="cs-offer-products hide-scrollbar">
              {csLoading
                ? [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
                : (crossSellData?.productIds || crossSellData?.products || []).map(p => (
                    <ProductCard key={p._id} product={p} offerPrice={p.offerPrice} />
                  ))}
            </div>

            <div style={{ padding: '0 16px 20px' }}>
              <button className="cs-grab-btn" onClick={() => navigate('/offers')}>
                🛍️ Grab This Offer Now
              </button>
            </div>
          </section>
        )}

        {/* ── Categories ──────────────────────────────────────────── */}
        <section style={{ background: 'white', marginBottom: 8 }}>
          <div className="section-header" style={{ paddingTop: 18 }}>
            <div>
              <h2 className="section-title">What are you craving?</h2>
              <p style={{ fontSize: 11, color: '#999', marginTop: 2, fontWeight: 500 }}>Pick a category to explore</p>
            </div>
            <button className="section-link" onClick={() => navigate('/menu')}>
              See All <ChevronRight size={14} />
            </button>
          </div>

          {catLoading ? <CategorySkeleton /> : (
            <div className="categories-scroll hide-scrollbar" style={{ paddingBottom: 16 }}>
              {(categoriesData || []).map(cat => (
                <div key={cat._id} className="category-card" onClick={() => navigate(`/menu?category=${cat.slug}`)}>
                  <div className="category-img-wrapper">
                    {cat.imageUrl
                      ? <img src={cat.imageUrl} alt={cat.name} loading="lazy" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🍽</div>
                    }
                  </div>
                  <span className="category-name">{cat.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Best Sellers ────────────────────────────────────────── */}
        <section style={{ background: 'white', marginBottom: 8 }}>
          <div className="section-header" style={{ paddingTop: 18 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ background: 'linear-gradient(135deg,#E53935,#FF6B35)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Flame size={14} color="white" />
                </div>
                <h2 className="section-title" style={{ margin: 0 }}>Best Sellers</h2>
              </div>
              <p style={{ fontSize: 11, color: '#999', marginTop: 4, fontWeight: 500 }}>Our most-loved dishes</p>
            </div>
            <button className="section-link" onClick={() => navigate('/menu?filter=bestseller')}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="products-scroll hide-scrollbar" style={{ paddingBottom: 16 }}>
            {bsLoading
              ? [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
              : (bestSellersData || []).map(p => <ProductCard key={p._id} product={p} />)
            }
          </div>
        </section>

        {/* ── Promo banner ────────────────────────────────────────── */}
        <div style={{ margin: '0 16px 8px', borderRadius: 20, overflow: 'hidden', position: 'relative', cursor: 'pointer' }} onClick={() => navigate('/menu')}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '22px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                🌟 Special Menu
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1.2, marginBottom: 4 }}>
                Explore Our Full<br />Menu Collection
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 14 }}>
                100+ dishes made fresh daily
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E53935', color: 'white', borderRadius: 999, padding: '8px 18px', fontSize: 12, fontWeight: 800 }}>
                Explore Now <ChevronRight size={14} />
              </div>
            </div>
            <div style={{ fontSize: 72, opacity: 0.85, lineHeight: 1 }}>🍛</div>
          </div>
        </div>

        {/* ── Today's Special ─────────────────────────────────────── */}
        {(featuredData?.length > 0 || featLoading) && (
          <section style={{ background: 'white', marginBottom: 8 }}>
            <div className="section-header" style={{ paddingTop: 18 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={14} color="white" />
                  </div>
                  <h2 className="section-title" style={{ margin: 0 }}>Today's Special</h2>
                </div>
                <p style={{ fontSize: 11, color: '#999', marginTop: 4, fontWeight: 500 }}>Hand-picked for today</p>
              </div>
              <button className="section-link" onClick={() => navigate('/menu?filter=special')}>
                View All <ChevronRight size={14} />
              </button>
            </div>
            <div className="products-scroll hide-scrollbar" style={{ paddingBottom: 16 }}>
              {featLoading
                ? [...Array(4)].map((_, i) => <ProductCardSkeleton key={i} />)
                : (featuredData || []).map(p => <ProductCard key={p._id} product={p} />)
              }
            </div>
          </section>
        )}

        {/* ── Why Choose Us ───────────────────────────────────────── */}
        <section style={{ background: 'white', padding: '20px 16px', marginBottom: 8 }}>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Why Choose Laziz?</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { emoji: '🧑‍🍳', title: 'Expert Chefs', desc: 'Trained professionals with 10+ years experience' },
              { emoji: '🌿', title: 'Fresh Ingredients', desc: 'Sourced fresh every morning from local farms' },
              { emoji: '⚡', title: 'Quick Delivery', desc: 'Hot food at your door in 30-45 minutes' },
              { emoji: '💰', title: 'Best Prices', desc: 'Premium taste without burning your pocket' },
            ].map(item => (
              <div key={item.title} style={{ background: '#F7F7F8', borderRadius: 14, padding: '14px 12px' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{item.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── WhatsApp CTA ────────────────────────────────────────── */}
        <div style={{ margin: '0 16px 8px', background: 'linear-gradient(135deg,#075E54,#128C7E)', borderRadius: 20, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 52, height: 52, background: '#25D366', borderRadius: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 16px rgba(37,211,102,0.4)' }}>
            <MessageCircle size={26} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginBottom: 3 }}>Order on WhatsApp</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>Get faster service, track & chat with us!</div>
          </div>
          <button
            onClick={() => window.open('https://wa.me/' + (import.meta.env.VITE_WHATSAPP_NUMBER || '919876543210'), '_blank')}
            style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: 12, padding: '10px 16px', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Chat Now
          </button>
        </div>

        {/* ── Footer note ─────────────────────────────────────────── */}
        <div style={{ textAlign: 'center', padding: '20px 16px 8px', color: '#bbb', fontSize: 11, fontWeight: 500 }}>
          Made with ❤️ by Laziz Restaurant · All rights reserved
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HomePage;
