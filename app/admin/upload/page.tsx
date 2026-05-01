"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import { useCities, CityProvider } from "@/lib/city-context";

function UploadContent() {
  const {
    cities,
    loading: citiesLoading,
    refreshStock,
    getStockForProduct,
  } = useCities();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Phone");

  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);

  // Dynamic stock by city: { [cityId]: number | string }
  const [stockByCity, setStockByCity] = useState<
    Record<string, number | string>
  >({});
  const [price, setPrice] = useState<string | number>("0");
  const [searchTerm, setSearchTerm] = useState("");

  async function fetchData() {
    try {
      const Product = parseClient.Object.extend("Product");
      const pQuery = new parseClient.Query(Product);
      pQuery.descending("createdAt");
      const pResults = await pQuery.find();
      setProducts(pResults);

      const Order = parseClient.Object.extend("Order");
      const oQuery = new parseClient.Query(Order);
      const count = await oQuery.count();
      setOrderCount(count);

      await refreshStock();
    } catch (error: any) {
      console.error("Fetch error:", error);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate stats using dynamic city stock
  const totalItems = products.length;
  const totalStock = products.reduce((sum, p) => {
    const stocks = getStockForProduct(p.id);
    return sum + stocks.reduce((s, st) => s + st.stock, 0);
  }, 0);
  const totalValue = products.reduce((sum, p) => {
    const stocks = getStockForProduct(p.id);
    const total = stocks.reduce((s, st) => s + st.stock, 0);
    return sum + total * (p.get("price") || 0);
  }, 0);

  const handleSave = async () => {
    if (!name) return alert("Please provide a name!");
    setUploading(true);

    try {
      const Product = parseClient.Object.extend("Product");
      let p: any;

      if (editId) {
        const query = new parseClient.Query(Product);
        p = await query.get(editId);
      } else {
        p = new Product();
      }

      p.set("name", name);
      p.set("category", category);
      p.set("price", Math.max(0, Number(price) || 0));

      if (file) {
        const parseFile = new parseClient.File(file.name, file);
        await parseFile.save();
        p.set("image", parseFile);
      }

      await p.save();

      // Save CityStock entries for each city that has a value
      const CityStock = parseClient.Object.extend("CityStock");
      for (const cityId of Object.keys(stockByCity)) {
        const rawValue = stockByCity[cityId];
        const safeValue =
          typeof rawValue === "string" && rawValue === ""
            ? 0
            : Number(rawValue) || 0;

        const productPtr = {
          __type: "Pointer",
          className: "Product",
          objectId: p.id,
        };
        const cityPtr = {
          __type: "Pointer",
          className: "City",
          objectId: cityId,
        };

        const query = new parseClient.Query(CityStock);
        query.equalTo("product", productPtr);
        query.equalTo("city", cityPtr);
        const existing = await query.first();

        if (existing) {
          existing.set("stock", safeValue);
          await existing.save();
        } else {
          const entry = new CityStock();
          entry.set("product", productPtr);
          entry.set("city", cityPtr);
          entry.set("stock", safeValue);
          await entry.save();
        }
      }

      alert(editId ? "✅ Warehouse Updated!" : "✅ Item Deployed!");
      resetForm();
      fetchData();
    } catch (error: any) {
      alert("Error: " + (error.message || "Unauthorized"));
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setCategory("Phone");
    setStockByCity({});
    setPrice("0");
    setFile(null);
  };

  const startEdit = async (product: any) => {
    setEditId(product.id);
    setName(product.get("name") ?? "");
    setCategory(product.get("category") ?? "Phone");
    setPrice(product.get("price") ?? 0);

    // Load stock from CityStock entries
    const stocks = getStockForProduct(product.id);
    const stockMap: Record<string, number | string> = {};
    for (const s of stocks) {
      stockMap[s.cityId] = s.stock;
    }
    setStockByCity(stockMap);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStockChange = (cityId: string, value: string) => {
    setStockByCity((prev) => ({
      ...prev,
      [cityId]: value,
    }));
  };

  const getStockDisplay = (cityId: string): number | string => {
    if (stockByCity[cityId] !== undefined) return stockByCity[cityId];
    return 0;
  };

  const filteredProducts = products.filter((p) => {
    const name = (p.get("name") || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  if (citiesLoading) {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] p-4 md:p-10 antialiased font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div className="hidden md:block text-[10px] font-black bg-white px-5 py-2 rounded-full border shadow-sm text-gray-400 tracking-widest uppercase">
            LOGISTICS ADMIN:{" "}
            <span className="text-green-500 animate-pulse">● Active</span>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-white border px-6 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-all uppercase tracking-widest"
          >
            ← Dashboard
          </Link>
        </header>

        {/* STAT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: "Active Models", value: totalItems, icon: "📱" },
            { label: "Global Stock", value: `${totalStock} Units`, icon: "📦" },
            {
              label: "Total Valuation",
              value: `$${totalValue.toLocaleString()}`,
              icon: "💰",
            },
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                  {stat.label}
                </p>
                <p className="text-2xl font-black">{stat.value}</p>
              </div>
              <div className="text-3xl bg-gray-50 h-14 w-14 flex items-center justify-center rounded-2xl">
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* --- FORM COLUMN --- */}
          <div className="lg:col-span-1">
            <div className="bg-[#1d1d1f] text-white p-8 rounded-[2.5rem] shadow-2xl sticky top-10 border border-white/10">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 italic">
                {editId ? "Modify Manifest" : "New Inventory Entry"}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Product Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/5 rounded-xl p-3 outline-none focus:bg-white/10"
                  />
                </div>

                {/* CATEGORY DROPDOWN */}
                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Classification
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white/5 rounded-xl p-3 outline-none focus:bg-white/10 cursor-pointer text-white appearance-none border-none"
                  >
                    <option value="Phone" className="text-black">
                      Phone
                    </option>
                    <option value="Computer" className="text-black">
                      Computer
                    </option>
                  </select>
                </div>

                {/* Dynamic City Stock Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  {cities.map((city) => {
                    const cityColorMap: Record<string, string> = {
                      blue: "text-blue-400",
                      emerald: "text-emerald-400",
                      purple: "text-purple-400",
                      orange: "text-orange-400",
                      red: "text-red-400",
                      pink: "text-pink-400",
                      indigo: "text-indigo-400",
                      teal: "text-teal-400",
                    };
                    return (
                      <div key={city.id}>
                        <label
                          className={`text-[9px] uppercase font-black mb-2 block tracking-widest ${cityColorMap[city.color] || "text-gray-400"}`}
                        >
                          {city.name} Stock
                        </label>
                        <input
                          type="text"
                          value={getStockDisplay(city.id)}
                          onChange={(e) =>
                            handleStockChange(city.id, e.target.value)
                          }
                          className="w-full bg-white/5 rounded-xl p-3 outline-none"
                        />
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Price Point ($)
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white/5 rounded-xl p-3 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Visual Data (Image)
                  </label>
                  <input
                    type="file"
                    onChange={(e: any) => setFile(e.target.files[0])}
                    className="w-full text-[10px] text-gray-400 file:bg-blue-600 file:text-white file:border-0 file:rounded-full file:px-4 file:py-1 cursor-pointer"
                  />
                </div>

                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] mt-4 transition-all active:scale-95 shadow-lg"
                >
                  {uploading
                    ? "Syncing Database..."
                    : editId
                      ? "Save Changes"
                      : "Deploy to Hub"}
                </button>

                {editId && (
                  <button
                    onClick={resetForm}
                    className="w-full text-gray-500 text-[10px] font-black uppercase mt-4"
                  >
                    Abort Editing
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* --- TABLE COLUMN --- */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-50/50">
                <input
                  type="text"
                  placeholder="Search manifest..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-6 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                      <th className="px-8 py-5">Item</th>
                      <th className="px-6 py-5">Classification</th>
                      <th className="px-6 py-5">Hub Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map((p) => {
                      const stocks = getStockForProduct(p.id);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-gray-50/30 transition-colors"
                        >
                          <td className="px-8 py-5 flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden border">
                              {p.get("image") && (
                                <img
                                  src={p.get("image").url()}
                                  className="w-full h-full object-contain p-1"
                                />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm">
                                {p.get("name")}
                              </p>
                              <p className="text-blue-600 text-[10px] font-black">
                                ${(p.get("price") || 0).toLocaleString()}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
                              {p.get("category") || "Unset"}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              {stocks.length > 0 ? (
                                stocks.map((s) => {
                                  const cityColorMap: Record<string, string> = {
                                    blue: "text-blue-500",
                                    emerald: "text-emerald-500",
                                    purple: "text-purple-500",
                                    orange: "text-orange-500",
                                    red: "text-red-500",
                                    pink: "text-pink-500",
                                    indigo: "text-indigo-500",
                                    teal: "text-teal-500",
                                  };
                                  return (
                                    <span
                                      key={s.cityId}
                                      className={`text-[9px] font-black uppercase ${cityColorMap[s.cityColor] || "text-gray-500"}`}
                                    >
                                      {s.cityShortCode}: {s.stock}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[9px] font-black text-gray-300 uppercase">
                                  No stock data
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-4">
                              <button
                                onClick={() => startEdit(p)}
                                className="text-[10px] font-black text-gray-400 hover:text-blue-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Destroy Registry Record?")) {
                                    await p.destroy();
                                    fetchData();
                                  }
                                }}
                                className="text-[10px] font-black text-gray-300 hover:text-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <CityProvider>
      <UploadContent />
    </CityProvider>
  );
}
