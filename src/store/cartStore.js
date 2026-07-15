import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      get itemCount() { return get().items.reduce((sum, i) => sum + i.quantity, 0); },
      get cartTotal() { return get().items.reduce((sum, i) => sum + i.subtotal, 0); },

      addItem: (product) => {
        const items = get().items;
        const existing = items.find(i => i.productId === product._id);
        if (existing) {
          set({ items: items.map(i => i.productId === product._id
            ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price }
            : i)
          });
        } else {
          const price = product.discountedPrice || product.price;
          set({ items: [...items, {
            productId: product._id, name: product.name,
            imageUrl: product.imageUrl, price, quantity: 1, subtotal: price,
          }]});
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) { get().removeItem(productId); return; }
        set({ items: get().items.map(i => i.productId === productId
          ? { ...i, quantity, subtotal: quantity * i.price } : i)
        });
      },

      clearCart: () => set({ items: [] }),

      getItemQuantity: (productId) => {
        const item = get().items.find(i => i.productId === productId);
        return item ? item.quantity : 0;
      },
    }),
    { name: 'laziz-cart' }
  )
);

export default useCartStore;
