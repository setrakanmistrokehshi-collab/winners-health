import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existing = items.find((i) => i._id === product._id);

        if (existing) {
          set({
            items: items.map((i) =>
              i._id === product._id
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({
            items: [...items, { ...product, quantity }],
          });
        }
      },

      replaceItems: (items) => set({ items }),

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i._id !== id) });
      },

      updateQty: (id, qty) => {
        if (qty < 1) {
          get().removeItem(id);
          return;
        }
        set({
          items: get().items.map((i) =>
            i._id === id ? { ...i, quantity: qty } : i
          ),
        });
      },

      // Patches arbitrary fields on a cart item (currently: price,
      // stock) without touching quantity — used by
      // useRevalidateCart.js to reconcile a stale add-to-cart-time
      // price snapshot against the live catalog. Distinct from
      // updateQty, which is quantity-only and user-driven.
      updateItemFields: (id, fields) => {
        set({
          items: get().items.map((i) =>
            i._id === id ? { ...i, ...fields } : i
          ),
        });
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'winners-cart',
    }
  )
);

export default useCartStore;

// ── Helper selectors (use these in components) ───────────────────
export const selectCartCount = (state) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCartTotal = (state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);