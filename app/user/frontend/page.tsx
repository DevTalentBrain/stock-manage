"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import { useCities } from "@/lib/city-context";
import { useCart } from "@/lib/cart-context";

function FrontendContent() {
  // --- APPLICATION STATES ---
  const [products, setLocalProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // --- CART FROM CONTEXT ---
  const {
    cart,
    setCart,
    setProducts,
    cartCount,
    cartTotal,
    clearCart,
    isPaying,
    setIsPaying,
    step,
    setStep,
  } = useCart();

  // --- 🚩 FILTER STATE ---
  const [activeCategory, setActiveCategory] = useState("All");

  // --- UI STATES ---
  const [isProcessing, setIsProcessing] = useState(false);

  // --- CARGO MANIFEST STATES ---
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // --- PAYMENT CODE ---
  const [paymentCode] = useState(
    () =>
      "CARGO-" +
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase(),
  );

  // --- DYNAMIC CITIES & STOCK ---
  const { cities, getStockForProduct, refreshStock, productStockMap } =
    useCities();

  // --- QUANTITY SELECTOR STATE ---
  const [qtySelector, setQtySelector] = useState<{
    product: any;
    isOpen: boolean;
  }>({ product: null, isOpen: false });
  const [desiredQty, setDesiredQty] = useState(1);

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
      setLocalProducts(results);
      // Set products in cart context for cart restoration
      setProducts(results);
      // Refresh stock for all products after fetching
      await refreshStock();
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

  // --- DYNAMIC STOCK HELPERS ---

  /** Get total available stock across all cities for a product */
  const getTotalStock = (productId: string): number => {
    const stocks = getStockForProduct(productId);
    return stocks.reduce((sum, s) => sum + s.stock, 0);
  };

  /** Get stock for a specific city for a product */
  const getStockForCity = (productId: string, cityId: string): number => {
    const stocks = getStockForProduct(productId);
    const cityStock = stocks.find((s) => s.cityId === cityId);
    return cityStock?.stock || 0;
  };

  /** Get total cart quantity for a product across all cities */
  const getTotalCartQty = (productId: string): number => {
    const entry = cart.find((i) => i.product.id === productId);
    return entry ? entry.qty : 0;
  };

  /** Get remaining available stock (stock - already in cart) */
  const getRemainingStock = (productId: string): number => {
    return getTotalStock(productId) - getTotalCartQty(productId);
  };

  /**
   * Distribute a desired quantity across available cities intelligently.
   * Returns an array of { city, cityId, qty } allocations.
   */
  const distributeAcrossCities = (
    productId: string,
    desiredQty: number,
  ): { city: string; cityId: string; qty: number }[] => {
    const stocks = getStockForProduct(productId);
    const allocations: { city: string; cityId: string; qty: number }[] = [];
    let remainingToAllocate = desiredQty;

    for (const stock of stocks) {
      if (remainingToAllocate <= 0) break;
      const available = stock.stock;
      if (available <= 0) continue;
      const take = Math.min(available, remainingToAllocate);
      allocations.push({
        city: stock.cityName,
        cityId: stock.cityId,
        qty: take,
      });
      remainingToAllocate -= take;
    }

    return allocations;
  };

  /** Open the quantity selector modal for a product */
  const openQtySelector = (product: any) => {
    setDesiredQty(1);
    setQtySelector({ product, isOpen: true });
  };

  /** Confirm adding the selected quantity to bag */
  const confirmAddToBag = () => {
    const product = qtySelector.product;
    if (!product) return;

    const productId = product.id;

    if (desiredQty < 1) {
      return alert("Quantity must be at least 1.");
    }

    // Distribute the desired quantity across available cities
    const allocations = distributeAcrossCities(productId, desiredQty);

    setCart((prev: any[]) => {
      const existing = prev.find((i: any) => i.product.id === productId);
      if (existing) {
        // Merge allocations with existing
        const mergedAllocations = [...existing.allocations];
        for (const newAlloc of allocations) {
          const existingAlloc = mergedAllocations.find(
            (a: any) => a.cityId === newAlloc.cityId,
          );
          if (existingAlloc) {
            existingAlloc.qty += newAlloc.qty;
          } else {
            mergedAllocations.push({ ...newAlloc });
          }
        }
        return prev.map((i: any) =>
          i.product.id === productId
            ? { ...i, qty: i.qty + desiredQty, allocations: mergedAllocations }
            : i,
        );
      }
      return [...prev, { product, qty: desiredQty, allocations }];
    });

    setQtySelector({ product: null, isOpen: false });
  };

  /** Increase quantity in bag */
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

    // Fallback: add to first allocation
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

  const removeFromBag = (productId: string) => {
    setCart((prev: any[]) =>
      prev.filter((i: any) => i.product.id !== productId),
    );
  };

  const decreaseInBag = (productId: string) => {
    setCart((prev: any[]) => {
      const existing = prev.find((i: any) => i.product.id === productId);
      if (!existing) return prev;

      // Safety: if qty is already 0 or negative, remove the item
      if (existing.qty <= 0) {
        return prev.filter((i: any) => i.product.id !== productId);
      }

      if (existing.qty <= 1) {
        return prev.filter((i: any) => i.product.id !== productId);
      }

      // Safety: ensure allocations is a valid array
      const allocs = Array.isArray(existing.allocations)
        ? [...existing.allocations]
        : [];

      if (allocs.length === 0) {
        // No allocations but has qty > 1 — just decrement qty
        return prev.map((i: any) =>
          i.product.id === productId ? { ...i, qty: i.qty - 1 } : i,
        );
      }

      const lastAlloc = allocs[allocs.length - 1];
      if (!lastAlloc || typeof lastAlloc.qty !== "number") {
        // Malformed allocation — just decrement qty
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

  const handleCheckout = async () => {
    try {
      if (!currentUser || !currentUser.id) return alert("Session required.");
      setIsProcessing(true);

      const totalQty = cart.reduce(
        (sum: number, item: any) => sum + item.qty,
        0,
      );
      const totalAmount = cart.reduce(
        (sum: number, i: any) => sum + (i.product.get("price") || 0) * i.qty,
        0,
      );

      // 1. GENERATE SUMMARY (Mapping from the current cart)
      const summary = cart
        .map((item: any) => {
          const name = item.product.get("name") || "Unknown Item";
          return `${name} x${item.qty}`;
        })
        .join(", ");

      // 2. GENERATE IMAGES
      const images = cart
        .map((i: any) =>
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
      const uniqueCities = Array.from(
        new Set(
          cart.flatMap((item: any) => item.allocations.map((a: any) => a.city)),
        ),
      );
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
        // Use the first cart item's first allocation city as the origin
        const firstAlloc = cart[0]?.allocations[0];
        if (firstAlloc) {
          detectedOrigin = `${firstAlloc.city} Hub`;
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

      // 4. STOCK SYNC - Use CityStock class instead of flat product fields
      for (const item of cart) {
        for (const alloc of item.allocations) {
          try {
            const product = item.product;
            const cityId = alloc.cityId;

            // Find the CityStock entry for this product + city
            const CityStock = parseClient.Object.extend("CityStock");
            const ProductRef = parseClient.Object.extend("Product");
            const CityRef = parseClient.Object.extend("City");

            const productPtr = ProductRef.createWithoutData(product.id);
            const cityPtr = CityRef.createWithoutData(cityId);

            const query = new parseClient.Query(CityStock);
            query.equalTo("product", productPtr);
            query.equalTo("city", cityPtr);
            const stockEntry = await query.first();

            if (stockEntry) {
              const currentStock = stockEntry.get("stock") || 0;
              stockEntry.set("stock", Math.max(0, currentStock - alloc.qty));
              await stockEntry.save();
            }
          } catch (err) {
            console.warn(
              "Stock update failed (check CityStock CLP permissions):",
              err,
            );
          }
        }
      }

      // 🚩 MOVE THESE ABOVE THE ALERT
      // This ensures the Modal/UI closes immediately even if the alert box stays open
      clearCart();
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

  const isManifestInvalid = !shippingName || !shippingPhone || !deliveryAddress;

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-sans antialiased pb-20">
      <section className="bg-black text-white py-20 px-6 text-center">
        <h1 className="text-4xl font-black tracking-tighter mb-4 italic text-white">
          PRODUCT REGISTRY
        </h1>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.4em]">
          Inventory Management
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
            {cat}
            {cat !== "All" && `s`}
          </button>
        ))}
      </div>

      {/* --- PRODUCT GRID --- */}
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {filteredProducts.length > 0 ? (
          filteredProducts.map((p) => {
            const totalStock = getTotalStock(p.id);
            const totalInCart = getTotalCartQty(p.id);
            const remainingStock = totalStock - totalInCart;
            const isOutOfStock = remainingStock <= 0;

            return (
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
                <p className="text-indigo-600 font-bold mb-2">
                  ${p.get("price").toLocaleString()}
                </p>

                {/* --- STOCK AVAILABILITY --- */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
                    <span className="text-gray-800">Stock</span>
                    <span
                      className={
                        remainingStock <= 0
                          ? "text-red-500"
                          : "text-emerald-600"
                      }
                    >
                      {remainingStock > 0
                        ? `${remainingStock} available`
                        : "Out of stock"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openQtySelector(p)}
                  className="mt-auto py-4 rounded-full font-black uppercase text-[9px] tracking-widest transition-all active:scale-95 bg-black text-white hover:bg-indigo-600"
                >
                  Add to Bag
                </button>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center font-bold text-gray-300 uppercase text-[10px] tracking-[0.3em]">
            No inventory found in "{activeCategory}" category
          </div>
        )}
      </div>

      {/* --- QUANTITY SELECTOR MODAL --- */}
      {qtySelector.isOpen && qtySelector.product && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="text-center mb-6">
              <h3 className="text-xl font-black uppercase tracking-tight mb-1">
                Select Quantity
              </h3>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                {qtySelector.product.get("name")}
              </p>
              <p className="text-indigo-600 font-black text-lg mt-2">
                ${qtySelector.product.get("price").toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={() => setDesiredQty((q) => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-full bg-gray-100 font-black text-lg hover:bg-gray-200 transition-all active:scale-90"
              >
                -
              </button>
              <span className="text-4xl font-black w-16 text-center">
                {desiredQty}
              </span>
              <button
                onClick={() => setDesiredQty((q) => q + 1)}
                className="w-12 h-12 rounded-full bg-gray-100 font-black text-lg hover:bg-gray-200 transition-all active:scale-90"
              >
                +
              </button>
            </div>

            <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              {getRemainingStock(qtySelector.product.id)} available in stock
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setQtySelector({ product: null, isOpen: false })}
                className="flex-1 py-4 bg-gray-100 rounded-full font-black uppercase text-[9px] tracking-widest hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddToBag}
                className="flex-[2] py-4 bg-black text-white rounded-full font-black uppercase text-[9px] tracking-widest hover:bg-indigo-600 transition-all active:scale-95"
              >
                Add {desiredQty > 1 ? `${desiredQty} Items` : "to Bag"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🚩 THE 3-STEP CARGO MODAL --- */}
      {isPaying && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl relative overflow-hidden animate-in zoom-in duration-200">
            {/* STEPPER UI */}
            <div className="flex items-center mb-10 px-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center flex-1">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all z-10 shrink-0 ${step >= s ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-100 text-gray-300"}`}
                  >
                    {s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`flex-1 h-[2px] mx-2 ${step > s ? "bg-indigo-600" : "bg-gray-100"}`}
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

            {/* STEP 2: PAYMENT INFO */}
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

                {/* Payment Code */}
                <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 text-center">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">
                    Your Payment Code
                  </p>
                  <p className="text-2xl font-black tracking-wider text-indigo-600 select-all">
                    {paymentCode}
                  </p>
                </div>

                {/* Bank / PayPal Details from City */}
                {(() => {
                  const activeCity = cities.find((c) => c.isActive);
                  return (
                    <div className="bg-gray-50 rounded-[2.5rem] p-8 border border-gray-100 space-y-4 text-[11px] font-bold">
                      {activeCity?.bankDetails ? (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            Bank Transfer
                          </p>
                          {activeCity.bankDetails.split("\n").map((line, i) => (
                            <p key={i}>{line}</p>
                          ))}
                        </div>
                      ) : (
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            Bank Transfer
                          </p>
                          <p className="text-gray-300 italic">
                            No bank details set
                          </p>
                        </div>
                      )}
                      {activeCity?.paypalLink && (
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                            PayPal
                          </p>
                          <p>{activeCity.paypalLink}</p>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-4 text-gray-400 italic">
                        <p>
                          Use your Payment Code as reference when transferring.
                        </p>
                        <p>Payment will be confirmed by management.</p>
                      </div>
                    </div>
                  );
                })()}

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
                    Continue to Dispatch
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

export default function Home() {
  return <FrontendContent />;
}
