"use client";
import { useEffect, useState } from "react";
import { CartProvider, useCart } from "@/lib/cart-context";
import { CityProvider, useCities } from "@/lib/city-context";
import Navbar from "@/app/user/frontend/navbar";
import BagSidebar from "@/app/user/frontend/bag-sidebar";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";

function UserLayoutContent({ children }: { children: React.ReactNode }) {
  const { cart, cartCount, cartTotal, isBagOpen, openBag, closeBag, setCart } =
    useCart();
  const { cities, getStockForProduct, refreshStock } = useCities();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = parseClient.User.current();
    setCurrentUser(user);
  }, []);

  // Refresh stock data on mount so bag sidebar works from any page
  useEffect(() => {
    refreshStock();
  }, [refreshStock]);

  const handleLogout = () => {
    parseClient.User.logOut();
    router.push("/");
  };

  const removeFromBag = (productId: string) => {
    setCart((prev: any[]) =>
      prev.filter((i: any) => i.product.id !== productId),
    );
  };

  const decreaseInBag = (productId: string) => {
    setCart((prev: any[]) => {
      const existing = prev.find((i: any) => i.product.id === productId);
      if (!existing) return prev;

      if (existing.qty <= 0) {
        return prev.filter((i: any) => i.product.id !== productId);
      }

      if (existing.qty <= 1) {
        return prev.filter((i: any) => i.product.id !== productId);
      }

      const allocs = Array.isArray(existing.allocations)
        ? [...existing.allocations]
        : [];

      if (allocs.length === 0) {
        return prev.map((i: any) =>
          i.product.id === productId ? { ...i, qty: i.qty - 1 } : i,
        );
      }

      const lastAlloc = allocs[allocs.length - 1];
      if (!lastAlloc || typeof lastAlloc.qty !== "number") {
        return prev.map((i: any) =>
          i.product.id === productId ? { ...i, qty: i.qty - 1 } : i,
        );
      }

      if (lastAlloc.qty <= 1) {
        allocs.pop();
      } else {
        lastAlloc.qty -= 1;
      }
      return prev.map((i: any) =>
        i.product.id === productId
          ? { ...i, qty: i.qty - 1, allocations: allocs }
          : i,
      );
    });
  };

  const increaseInBag = (product: any, city: string) => {
    const productId = product.id;

    // Try to allocate to the same city first
    const cityEntry = cities.find((c) => c.name === city);
    if (cityEntry) {
      setCart((prev: any[]) =>
        prev.map((i: any) => {
          if (i.product.id !== productId) return i;
          const allocs = i.allocations.map((a: any) =>
            a.cityId === cityEntry.id ? { ...a, qty: a.qty + 1 } : a,
          );
          return { ...i, qty: i.qty + 1, allocations: allocs };
        }),
      );
      return;
    }

    // Fallback: add to first allocation or create one
    setCart((prev: any[]) =>
      prev.map((i: any) => {
        if (i.product.id !== productId) return i;
        const allocs = [...i.allocations];
        if (allocs.length > 0) {
          allocs[0] = { ...allocs[0], qty: allocs[0].qty + 1 };
        }
        return { ...i, qty: i.qty + 1, allocations: allocs };
      }),
    );
  };

  return (
    <>
      <Navbar
        cartCount={cartCount}
        onOpenBag={openBag}
        user={currentUser}
        onLogout={handleLogout}
      />
      <BagSidebar
        isOpen={isBagOpen}
        onClose={closeBag}
        cart={cart}
        onRemove={removeFromBag}
        onDecrease={decreaseInBag}
        onIncrease={increaseInBag}
        total={cartTotal}
        onCheckout={() => router.push("/user/frontend")}
      />
      {children}
    </>
  );
}

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <CityProvider>
        <UserLayoutContent>{children}</UserLayoutContent>
      </CityProvider>
    </CartProvider>
  );
}
