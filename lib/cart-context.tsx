"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

const CART_STORAGE_KEY = "cargogoo_cart";

/** Simplified cart item for localStorage (no Parse objects) */
interface StoredCartItem {
  productId: string;
  qty: number;
  allocations: { city: string; cityId: string; qty: number }[];
}

interface CartItem {
  product: any;
  qty: number;
  allocations: { city: string; cityId: string; qty: number }[];
}

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  isBagOpen: boolean;
  openBag: () => void;
  closeBag: () => void;
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  clearCart: () => void;
  setProducts: (products: any[]) => void;
  products: any[];
}

const CartContext = createContext<CartContextType>({
  cart: [],
  cartCount: 0,
  cartTotal: 0,
  isBagOpen: false,
  openBag: () => {},
  closeBag: () => {},
  setCart: () => {},
  clearCart: () => {},
  setProducts: () => {},
  products: [],
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [cartReady, setCartReady] = useState(false);
  const initialRestoreDone = useRef(false);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce(
    (sum, i) => sum + (i.product.get?.("price") || 0) * i.qty,
    0,
  );

  /** Save cart to localStorage (simplified, no Parse objects) */
  const persistCart = useCallback((cartItems: CartItem[]) => {
    try {
      const stored: StoredCartItem[] = cartItems.map((item) => ({
        productId: item.product.id,
        qty: item.qty,
        allocations: item.allocations,
      }));
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(stored));
    } catch (e) {
      console.warn("Failed to persist cart:", e);
    }
  }, []);

  /** Restore cart from localStorage by matching with fetched products */
  const restoreCart = useCallback((fetchedProducts: any[]) => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return;
      const stored: StoredCartItem[] = JSON.parse(raw);
      if (!Array.isArray(stored) || stored.length === 0) return;

      const restored: CartItem[] = [];
      for (const storedItem of stored) {
        const product = fetchedProducts.find(
          (p) => p.id === storedItem.productId,
        );
        if (product) {
          // Basic sanity: ensure qty is a positive number
          const safeQty =
            typeof storedItem.qty === "number" && storedItem.qty > 0
              ? storedItem.qty
              : 1;
          // Ensure allocations is an array
          const safeAllocations = Array.isArray(storedItem.allocations)
            ? storedItem.allocations.filter(
                (a: any) =>
                  a &&
                  typeof a.qty === "number" &&
                  a.qty > 0 &&
                  a.city &&
                  a.cityId,
              )
            : [];

          restored.push({
            product,
            qty: safeQty,
            allocations: safeAllocations,
          });
        }
      }
      if (restored.length > 0) {
        setCart(restored);
      }
    } catch (e) {
      console.warn("Failed to restore cart:", e);
      localStorage.removeItem(CART_STORAGE_KEY);
    }
  }, []);

  /** Clear cart from both state and localStorage */
  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const openBag = useCallback(() => setIsBagOpen(true), []);
  const closeBag = useCallback(() => setIsBagOpen(false), []);

  // Restore cart from localStorage once products are set
  useEffect(() => {
    if (products.length > 0 && !initialRestoreDone.current) {
      initialRestoreDone.current = true;
      restoreCart(products);
      setCartReady(true);
    }
  }, [products, restoreCart]);

  // Persist cart to localStorage whenever it changes (after initial restore)
  useEffect(() => {
    if (cartReady) {
      persistCart(cart);
    }
  }, [cart, cartReady, persistCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        isBagOpen,
        openBag,
        closeBag,
        setCart,
        clearCart,
        setProducts,
        products,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
