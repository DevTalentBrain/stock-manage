"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Navbar from "@/app/user/frontend/navbar";
import BagSidebar from "@/app/user/frontend/bag-sidebar";

export default function Home() {
  // --- APPLICATION STATES ---
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [cart, setCart] = useState<
    { product: any; qty: number; city: string }[]
  >([]);

  // --- 🚩 FILTER STATE ---
  const [activeCategory, setActiveCategory] = useState("All");

  // --- UI STATES ---
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: Details, 2: Payment, 3: Confirm

  // --- CARGO MANIFEST STATES ---
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  useEffect(() => {
    const initApp = async () => {
      try {
        await fetchProducts();
        const user = parseClient.User.current();
        if (user) {
          setCurrentUser(user);
          // Sync Registry data to form
          setShippingName(user.get("name") || "");
          setShippingPhone(user.get("phone") || "");
          setDeliveryAddress(user.get("address") || "");
        }
      } catch (error) {
        console.error(error);
      }
    };
    initApp();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const Product = parseClient.Object.extend("Product");
      const query = new parseClient.Query(Product)
        .include("warehouse")
        .descending("createdAt");
      const results = await query.find();
      setProducts(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // --- 🚩 THE CORRECT FILTER LOGIC ---
  const filteredProducts =
    activeCategory === "All"
      ? products
      : products.filter((p) => {
          const cat = (p.get("category") || "").toLowerCase().trim();
          return cat === activeCategory.toLowerCase();
        });

  const addToBag = (product: any) => {
    const kStock = product.get("kaunas") || 0;
    const vStock = product.get("vilnius") || 0;
    let assignedCity = kStock > 0 ? "Kaunas" : vStock > 0 ? "Vilnius" : "";
    if (!assignedCity) return alert("Stock unavailable at cargo hubs.");

    setCart((prev) => {
      const exists = prev.find(
        (i) => i.product.id === product.id && i.city === assignedCity,
      );
      if (exists)
        return prev.map((i) =>
          i.product.id === product.id && i.city === assignedCity
            ? { ...i, qty: i.qty + 1 }
            : i,
        );
      return [...prev, { product, qty: 1, city: assignedCity }];
    });
  };

  const handleCheckout = async () => {
    try {
      if (!currentUser || !currentUser.id) return alert("Session required.");
      setIsProcessing(true);

      const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
      const totalAmount = cart.reduce(
        (sum, i) => sum + (i.product.get("price") || 0) * i.qty,
        0,
      );

      // 1. GENERATE SUMMARY (Mapping from the current cart)
      const summary = cart
        .map((item) => {
          const name = item.product.get("name") || "Unknown Item";
          return `${name} x${item.qty}`;
        })
        .join(", ");

      // 2. GENERATE IMAGES
      const images = cart
        .map((i) =>
          (i.product.get("itemImage") || i.product.get("image"))?.url(),
        )
        .filter(Boolean);

      // 🚩 DEBUG LOG: Open F12 Console and check if this text appears!
      console.log("LOGISTICS PAYLOAD:", { summary, images });

      const Order = parseClient.Object.extend("Order");
      const order = new Order();

      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(true);
      acl.setWriteAccess(currentUser.id, true);
      order.setACL(acl);
      const uniqueCities = Array.from(new Set(cart.map((item) => item.city)));
      // Standard Fields
      order.set("recipientName", shippingName);
      order.set("phone", shippingPhone);
      order.set("address", deliveryAddress);
      order.set("itemCount", totalQty);
      order.set("total", totalAmount);
      order.set("status", "Pending Approval");
      order.set("user", currentUser);
      order.set("itemSummary", summary || "");
      order.set("itemImages", images || []);
      order.set("cities", uniqueCities);

      const savedOrder = await order.save();

      // 3. CREATE DELIVERY LINK
      const Deliveries = parseClient.Object.extend("Deliveries");
      const delivery = new Deliveries();
      const firstItem = cart[0]?.product;
      let detectedOrigin = "Kaunas Hub"; // Default fallback

      if (firstItem) {
        const stockInVilnius = Number(firstItem.get("vilnius") || 0);
        const stockInKaunas = Number(firstItem.get("kaunas") || 0);

        // If there is more stock in Vilnius, set it as the origin
        if (stockInVilnius > stockInKaunas) {
          detectedOrigin = "Vilnius";
        }
      }

      // Managers need write access to approve/dispatch
      const deliveryAcl = new parseClient.ACL();
      deliveryAcl.setPublicReadAccess(true);
      deliveryAcl.setPublicWriteAccess(true);
      delivery.setACL(deliveryAcl);

      delivery.set("orderId", savedOrder.id);
      delivery.set("status", "Pending Approval");
      delivery.set("destination", deliveryAddress);
      delivery.set("origin", detectedOrigin);
      delivery.set("cargoCount", totalQty);
      delivery.set("totalValue", totalAmount);
      delivery.set("recipient", shippingName);
      delivery.set("itemNames", [summary]);
      delivery.set("itemImages", images);

      await delivery.save();

      // 4. STOCK SYNC
      // ... (rest of your code above is good)

      // 4. STOCK SYNC
      for (const item of cart) {
        try {
          const product = item.product;
          const cityKey = item.city.toLowerCase(); // 'kaunas' or 'vilnius'

          const currentStock = Number(product.get(cityKey) || 0);
          product.set(cityKey, Math.max(0, currentStock - item.qty));

          // 🚩 This is where Error 101 usually happens if CLP isn't 'Public'
          await product.save();
        } catch (err) {
          console.warn(
            "Stock update failed (check Product CLP permissions):",
            err,
          );
          // We don't 'throw' here so the checkout can still finish
        }
      }

      // 🚩 MOVE THESE ABOVE THE ALERT
      // This ensures the Modal/UI closes immediately even if the alert box stays open
      setCart([]);
      setIsPaying(false);
      setStep(1);

      alert("🚛 Manifest Transmitted to Dispatch Hub.");
      await fetchProducts();
    } catch (error: any) {
      console.error("LOGISTICS ERROR:", error);
      alert("Logistics Error: " + error.message);
      setIsPaying(false);
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce(
    (sum, i) => sum + (i.product.get("price") || 0) * i.qty,
    0,
  );
  const isManifestInvalid =
    !shippingName ||
    !shippingPhone ||
    !deliveryAddress ||
    cartCount < 5 ||
    cartCount === 2 ||
    cartCount === 3;

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased pb-20">
      <Navbar
        cartCount={cartCount}
        onOpenBag={() => setIsBagOpen(true)}
        user={currentUser}
        onLogout={() => setCurrentUser(null)}
      />
      <BagSidebar
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        cart={cart}
        onRemove={() => {}}
        onDecrease={() => {}}
        onIncrease={addToBag}
        total={cartTotal}
        onCheckout={() => setIsPaying(true)}
      />

      <section className="bg-black text-white py-20 px-6 text-center">
        <h1 className="text-5xl font-black tracking-tighter mb-4 italic text-white">
          CARGO REGISTRY
        </h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em]">
          Multi-Hub Inventory Management
        </p>
      </section>

      {/* --- 🚩 CATEGORY FILTER BAR --- */}
      <div className="flex justify-center gap-4 py-10 bg-white border-b border-gray-100">
        {["All", "Phone", "Computer"].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeCategory === cat
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-50 text-gray-400 hover:bg-gray-100 border border-transparent"
            }`}
          >
            {cat}s
          </button>
        ))}
      </div>

      {/* --- PRODUCT GRID --- */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col group"
            >
              <div className="h-40 mb-6 flex items-center justify-center bg-[#fbfbfd] rounded-3xl">
                <img
                  src={(p.get("itemImage") || p.get("image"))?.url()}
                  className="max-h-[80%] group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <h3 className="font-black text-lg mb-1">{p.get("name")}</h3>
              <p className="text-indigo-600 font-bold mb-6">
                ${p.get("price").toLocaleString()}
              </p>
              <button
                onClick={() => addToBag(p)}
                className="mt-auto py-4 bg-black text-white rounded-full font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 transition-all active:scale-95"
              >
                Add to Bag
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center font-bold text-gray-300 uppercase text-[10px] tracking-[0.3em]">
            No inventory found in "{activeCategory}" category
          </div>
        )}
      </div>

      {/* --- 🚩 THE 3-STEP CARGO MODAL --- */}
      {/* --- 🚩 THE 3-STEP CARGO MODAL --- */}
      {isPaying && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200">
            {/* STEPPER UI */}
            <div className="flex justify-between items-center mb-10 px-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${step >= s ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-100 text-gray-300"}`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-12 h-[2px] mx-2 ${step > s ? "bg-indigo-600" : "bg-gray-100"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* STEP 1: MANIFEST DETAILS */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">
                    Stage 1: Manifest
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Consignee Information
                  </p>
                </div>
                <input
                  placeholder="Recipient Name"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100 focus:border-indigo-500 transition-all"
                />
                <input
                  placeholder="Phone"
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100 focus:border-indigo-500 transition-all"
                />
                <input
                  placeholder="Delivery Address"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold outline-none border border-gray-100 focus:border-indigo-500 transition-all"
                />
                <button
                  onClick={() => setStep(2)}
                  disabled={isManifestInvalid}
                  className="w-full bg-black text-white py-5 rounded-full font-black uppercase text-[10px] tracking-widest disabled:bg-gray-100 mt-4 transition-all"
                >
                  Next: Payment Gateway
                </button>
              </div>
            )}

            {/* STEP 2: RE-INTRODUCED PAYMENT DESIGN */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="mb-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight italic">
                    Stage 2: Payment
                  </h2>
                  <p className="text-indigo-600 font-black text-sm uppercase tracking-widest">
                    Total Due: ${cartTotal.toLocaleString()}
                  </p>
                </div>

                {/* Virtual Card Preview */}

                <div className="space-y-3">
                  <input
                    placeholder="Card Number"
                    className="w-full px-6 py-4 bg-gray-50 rounded-2xl font-bold border border-gray-100 outline-none"
                  />
                  <div className="flex gap-4">
                    <input
                      placeholder="MM/YY"
                      className="w-1/2 px-6 py-4 bg-gray-50 rounded-2xl font-bold border border-gray-100 outline-none"
                    />
                    <input
                      placeholder="CVC"
                      className="w-1/2 px-6 py-4 bg-gray-50 rounded-2xl font-bold border border-gray-100 outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-100 py-5 rounded-full font-black uppercase text-[9px]"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="flex-[2] bg-black text-white py-5 rounded-full font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 transition-all"
                  >
                    Apply Payment
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DISPATCH CONFIRMATION */}
            {step === 3 && (
              <div className="text-center">
                <div className="mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-tight italic mb-2">
                    Stage 3: Dispatch
                  </h2>
                  <div className="inline-block px-4 py-1 bg-green-100 text-green-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Payment Authorized
                  </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-[2.5rem] text-left text-[11px] space-y-3 border border-gray-100 mb-8 font-bold italic shadow-inner">
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-400 uppercase">
                      Destination:
                    </span>
                    <span>{deliveryAddress}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-200 pb-2">
                    <span className="text-gray-400 uppercase">Recipient:</span>
                    <span>{shippingName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 uppercase">
                      Inventory Payload:
                    </span>
                    <span>{cartCount} Units</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="w-full bg-indigo-600 text-white py-6 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-all"
                >
                  {isProcessing
                    ? "Transmitting Cargo Data..."
                    : "Finalize & Transmit"}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setIsPaying(false);
                setStep(1);
              }}
              className="w-full mt-6 text-[9px] font-black uppercase text-gray-300 hover:text-red-500 transition-colors"
            >
              Abort Transaction
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
