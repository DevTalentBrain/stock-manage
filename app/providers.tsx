"use client";
import { useEffect, useState } from "react";
import { CartProvider, useCart } from "@/lib/cart-context";
import { CityProvider, useCities } from "@/lib/city-context";
import Navbar from "@/app/_components/navbar";
import BagSidebar from "@/app/_components/bag-sidebar";
import parseClient from "@/lib/parse-client";
import { useRouter, usePathname } from "next/navigation";

function AppContent({ children }: { children: React.ReactNode }) {
  const {
    cart,
    cartCount,
    cartTotal,
    isBagOpen,
    openBag,
    closeBag,
    setCart,
    setIsPaying,
    setStep,
  } = useCart();
  const { cities, getStockForProduct, refreshStock } = useCities();
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Only show the client navbar/bag on client-zone routes (not admin or management)
  const isClientZone =
    !pathname.startsWith("/admin") && !pathname.startsWith("/management");

  useEffect(() => {
    const user = parseClient.User.current();
    setCurrentUser(user);
  }, []);

  // Refresh stock data on mount so bag sidebar works from any page
  useEffect(() => {
    refreshStock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await parseClient.User.logOut();
    setCurrentUser(null);
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
      {isClientZone && (
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
            onCheckout={() => {
              closeBag();
              setStep(1);
              setIsPaying(true);
            }}
          />
        </>
      )}
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <CityProvider>
        <AppContent>{children}</AppContent>
      </CityProvider>
    </CartProvider>
  );
}
