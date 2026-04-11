"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Navbar from "@/app/frontent/navbar";
import BagSidebar from "@/app/frontent/bag-sidebar";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [cart, setCart] = useState<
    { product: any; qty: number; city: string }[]
  >([]);
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await fetchProducts();
        const user = parseClient.User.current();
        if (user) setCurrentUser(user);
      } catch (error) {
        console.error("Initialization error:", error);
      }
    };
    initApp();
  }, []);

  const handleLogout = async () => {
    await parseClient.User.logOut();
    setCurrentUser(null);
  };

  async function fetchProducts() {
    try {
      setLoading(true);
      const Product = parseClient.Object.extend("Product");
      const query = new parseClient.Query(Product);
      query.include("warehouse");
      query.descending("createdAt");
      const results = await query.find();
      setProducts(results);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }

  const addToBag = (product: any) => {
    const kStock = product.get("kaunas") || 0;
    const vStock = product.get("vilnius") || 0;

    // 1. Determine city based on priority (Matches your button text logic)
    let assignedCity = "";
    if (kStock > 0) {
      assignedCity = "Kaunas";
    } else if (vStock > 0) {
      assignedCity = "Vilnius";
    } else {
      return alert("Out of stock");
    }

    // 2. Add to cart with the 'city' property
    setCart((prev) => {
      const exists = prev.find(
        (item) => item.product.id === product.id && item.city === assignedCity,
      );

      if (exists) {
        return prev.map((item) =>
          item.product.id === product.id && item.city === assignedCity
            ? { ...item, qty: item.qty + 1 }
            : item,
        );
      }
      // CRITICAL: city must be included here!
      return [...prev, { product, qty: 1, city: assignedCity }];
    });
  };

  const removeFromBag = (productId: string, city: string) => {
    if (confirm("Remove this item from your bag?")) {
      setCart((prev) =>
        prev.filter(
          (item) => !(item.product.id === productId && item.city === city),
        ),
      );
    }
  };

  const decreaseQty = (productId: string, city: string) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId && item.city === city
            ? { ...item, qty: item.qty - 1 }
            : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const handleCheckout = async (cartItems: any[], total: number) => {
    try {
      if (!currentUser) return alert("Please login to checkout.");

      const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);
      const Order = parseClient.Object.extend("Order");
      const order = new Order();
      const orderCities = Array.from(
        new Set(cartItems.map((item) => item.city)),
      );

      const images = cartItems
        .map((item) => {
          const file =
            item.product.get("itemImage") || item.product.get("image");
          return file ? file.url() : null;
        })
        .filter((url) => url !== null);

      const summary = cartItems
        .map(
          (item) => `${item.product.get("name")} (${item.city}) x${item.qty}`,
        )
        .join(", ");

      order.set(
        "itemCount",
        cartItems.reduce((sum, item) => sum + item.qty, 0),
      );

      order.set("itemCount", totalQty);
      order.set("total", total || 0);
      order.set("user", currentUser);
      order.set("cities", orderCities);
      order.set("itemSummary", summary || "No summary available");
      order.set("itemImages", images.length > 0 ? images : []);
      await order.save();

      for (const item of cartItems) {
        const product = item.product;
        const cityKey = item.city.toLowerCase();
        const currentStock = product.get(cityKey) || 0;
        product.set(cityKey, Math.max(0, currentStock - item.qty));
        await product.save();
      }

      setCart([]);
      setIsBagOpen(false);
      await fetchProducts();
      return true;
    } catch (error: any) {
      console.error("Checkout Error:", error);
      alert("Error: " + error.message);
      return false;
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + (item.product.get("price") || 0) * item.qty,
    0,
  );

  //  --- SIMULATED PAYMENT PROCESSING ---
  const handleSimulatedPayment = () => {
    setIsProcessing(true);
    setTimeout(async () => {
      const success = await handleCheckout(cart, cartTotal);
      setIsProcessing(false);

      if (success) {
        setTimeout(() => {
          setIsPaying(false);
          window.location.href = "/profile";
        }, 1500);
      }
    }, 2000);
  };

  const filteredProducts = products.filter((p) => {
    const name = p.get("name").toLowerCase();
    if (activeFilter === "All") return true;
    if (activeFilter === "Phone") return name.includes("iphone");
    if (activeFilter === "Computer")
      return (
        name.includes("mac") ||
        name.includes("laptop") ||
        name.includes("computer")
      );
    return name.includes(activeFilter.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-black text-white">
        <div className="animate-pulse text-xl font-light tracking-widest text-white">
          IPHONE
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased">
      <Navbar
        cartCount={cartCount}
        onOpenBag={() => setIsBagOpen(true)}
        user={currentUser}
        onLogout={handleLogout}
      />

      {/* --- FIXED: Pass setIsPaying instead of handleCheckout directly --- */}
      <BagSidebar
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        cart={cart}
        onRemove={removeFromBag}
        onDecrease={decreaseQty}
        onIncrease={addToBag}
        total={cartTotal}
        onCheckout={() => setIsPaying(true)}
      />

      {/* Hero Section */}
      <section className="bg-black text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-white">
          Ecosystem.
        </h1>
        <p className="text-gray-400 text-lg font-light leading-relaxed">
          The tools you need to create your best work.
        </p>
      </section>

      {/* Payment Modal */}
      {isPaying && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl flex flex-col items-center overflow-hidden">
            {isProcessing ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-sm font-black uppercase tracking-widest text-gray-400">
                  Verifying Card...
                </p>
              </div>
            ) : cart.length === 0 ? (
              /* --- SUCCESS STATE: Green Checkmark --- */
              <div className="text-center py-10 animate-in zoom-in duration-500">
                <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">
                  Payment Success
                </h2>
                <p className="text-gray-400 text-sm font-medium mt-2">
                  Order registered in Audit Log.
                </p>
                <button
                  onClick={() => setIsPaying(false)}
                  className="mt-8 px-10 py-3 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
            ) : (
              /* --- INPUT STATE: Fixed CSS --- */
              <>
                <h2 className="text-2xl font-black mb-2 uppercase tracking-tight text-gray-900">
                  Payment
                </h2>
                <p className="text-blue-600 font-black mb-8 text-xl">
                  ${cartTotal.toLocaleString()}
                </p>

                <div className="w-full space-y-6">
                  {/* Card Number */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="0000 0000 0000 0000"
                      className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-bold"
                    />
                  </div>

                  {/* MM/YY & CVV - FIXED ALIGNMENT */}
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                        Expiry
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-bold placeholder:text-gray-300"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                        CVV
                      </label>
                      <input
                        type="text"
                        placeholder="123"
                        maxLength={3}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all font-bold placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSimulatedPayment}
                  className="w-full mt-10 bg-black text-white py-5 rounded-full font-black uppercase tracking-widest hover:bg-gray-800 active:scale-95 transition-all shadow-lg shadow-black/10"
                >
                  Confirm & Pay
                </button>

                <button
                  onClick={() => setIsPaying(false)}
                  className="mt-6 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors"
                >
                  Cancel Transaction
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Product Gallery... rest of your UI */}
      <div className="max-w-6xl mx-auto px-6 pt-10 flex flex-col gap-6">
        <div className="flex gap-6 border-b border-gray-200 pb-2">
          {["All", "Phone", "Computer"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`text-sm font-bold transition-all pb-2 ${activeFilter === cat ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-black"}`}
            >
              {cat}s
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {filteredProducts.map((product) => {
            const imageFile = product.get("itemImage") || product.get("image");
            const imageUrl = imageFile ? imageFile.url() : "/placeholder.png";

            // 2. Fetch Warehouse name (Requires 'query.include("warehouse")' in fetchProducts)
            const warehouseName =
              product.get("warehouse")?.get("name") || "No Warehouse";

            const kStock = product.get("kaunas") || 0;
            const vStock = product.get("vilnius") || 0;
            const totalStock = kStock + vStock;

            return (
              <div
                key={product.id}
                className="bg-white rounded-[2.5rem] p-8 flex flex-col items-center text-center shadow-sm hover:shadow-xl transition-all border border-gray-100 group"
              >
                <div className="w-full h-48 mb-6 flex items-center justify-center bg-[#fbfbfd] rounded-2xl relative">
                  {/* FIX: Use the resolved imageUrl */}
                  <img
                    src={imageUrl}
                    className="max-h-[75%] object-contain group-hover:scale-110 transition-transform duration-700"
                    alt={product.get("name") || "product"}
                  />
                </div>

                <div className="flex-1 w-full">
                  <h2 className="text-xl font-bold tracking-tight text-[#1d1d1f] mb-1">
                    {product.get("name")}
                  </h2>

                  <p className="text-blue-600 text-sm font-medium mb-6">
                    ${product.get("price")?.toLocaleString() || "0"}
                  </p>

                  {/* --- THE CITY STOCK DISPLAY --- */}
                  <div className="flex flex-col gap-2 mb-6">
                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-black uppercase text-gray-400">
                        Kaunas
                      </span>
                      <span
                        className={`text-[10px] font-bold ${kStock > 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {kStock} Left
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      <span className="text-[10px] font-black uppercase text-gray-400">
                        Vilnius
                      </span>
                      <span
                        className={`text-[10px] font-bold ${vStock > 0 ? "text-green-600" : "text-red-500"}`}
                      >
                        {vStock} Left
                      </span>
                    </div>
                  </div>
                </div>

                <div className="w-full mt-4">
                  <button
                    onClick={() => addToBag(product)}
                    disabled={totalStock <= 0}
                    className={`w-full py-3 rounded-full text-xs font-bold transition-all ${
                      totalStock > 0
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {totalStock > 0 ? `Add to Bag` : "Sold Out"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <section className="bg-white py-32 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
          <div>
            <div className="text-4xl mb-6">📸</div>
            <h3 className="font-bold text-[12px] uppercase tracking-widest mb-3">
              Pro Camera
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              48MP Main camera. Stunning detail and color.
            </p>
          </div>
          <div>
            <div className="text-4xl mb-6">⚡️</div>
            <h3 className="font-bold text-[12px] uppercase tracking-widest mb-3">
              A17 Pro Chip
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Console-level gaming performance in your hand.
            </p>
          </div>
          <div>
            <div className="text-4xl mb-6">🔋</div>
            <h3 className="font-bold text-[12px] uppercase tracking-widest mb-3">
              Battery
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Power that lasts from dawn to dusk.
            </p>
          </div>
        </div>
      </section>

      <footer className="bg-[#f5f5f7] py-12 px-6 border-t border-gray-200 text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        Copyright © 2026 iPhone Thesis Store. All rights reserved.
      </footer>
    </main>
  );
}
