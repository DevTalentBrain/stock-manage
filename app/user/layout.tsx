"use client";
import { useEffect, useState } from "react";
import { CartProvider, useCart } from "@/lib/cart-context";
import Navbar from "@/app/user/frontend/navbar";
import BagSidebar from "@/app/user/frontend/bag-sidebar";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";

function UserLayoutContent({ children }: { children: React.ReactNode }) {
  const { cart, cartCount, cartTotal, isBagOpen, openBag, closeBag, setCart } =
    useCart();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = parseClient.User.current();
    setCurrentUser(user);
  }, []);

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
      if (existing.qty <= 1) {
        return prev.filter((i: any) => i.product.id !== productId);
      }
      const allocs = [...existing.allocations];
      const lastAlloc = allocs[allocs.length - 1];
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
    // This is a simplified version - the full logic with stock validation
    // is in the frontend page. For other pages, just increment by 1.
    setCart((prev: any[]) =>
      prev.map((i: any) => {
        if (i.product.id !== product.id) return i;
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
      <UserLayoutContent>{children}</UserLayoutContent>
    </CartProvider>
  );
}
