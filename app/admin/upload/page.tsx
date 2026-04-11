"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);

  // --- WAREHOUSE STATES ---
  const [stockKaunas, setStockKaunas] = useState<string | number>("0");
  const [stockVilnius, setStockVilnius] = useState<string | number>("0");

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
    } catch (error: any) {
      console.error("Fetch error:", error);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const totalItems = products.length;
  const totalStock = products.reduce(
    (sum, p) => sum + (p.get("kaunas") || 0) + (p.get("vilnius") || 0),
    0,
  );
  const totalValue = products.reduce(
    (sum, p) =>
      sum +
      ((p.get("kaunas") || 0) + (p.get("vilnius") || 0)) *
        (p.get("price") || 0),
    0,
  );

  // --- LOGIC: SAVING TO DATABASE ---
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
      p.set("price", Math.max(0, Number(price) || 0));

      // --- UPDATED: SAVING THE CORRECT STATES TO PARSE ---
      p.set("kaunas", Math.max(0, Number(stockKaunas) || 0));
      p.set("vilnius", Math.max(0, Number(stockVilnius) || 0));

      if (file) {
        const parseFile = new parseClient.File(file.name, file);
        await parseFile.save();
        p.set("image", parseFile);
      }

      await p.save();
      alert(editId ? "✅ Warehouse Updated!" : "✅ iPhone Deployed!");
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert("Error: " + (error.message || "Unauthorized"));
    } finally {
      setUploading(false);
    }
  };

  // --- LOGIC: RESETTING FORM ---
  const resetForm = () => {
    setEditId(null);
    setName("");
    setStockKaunas("0"); // Fixed
    setStockVilnius("0"); // Fixed
    setPrice("0");
    setFile(null);
  };

  // --- LOGIC: LOADING DATA FOR EDIT ---
  const startEdit = (product: any) => {
    setEditId(product.id);
    setName(product.get("name") ?? "");
    setStockKaunas(product.get("kaunas") ?? 0); // Fixed
    setStockVilnius(product.get("vilnius") ?? 0); // Fixed
    setPrice(product.get("price") ?? 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredProducts = products.filter((p) => {
    // Use a fallback empty string "" if p.get("name") is missing
    const name = (p.get("name") || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] p-4 md:p-10 antialiased font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div className="hidden md:block text-[10px] font-black bg-white px-5 py-2 rounded-full border shadow-sm text-gray-400 tracking-widest uppercase">
            SYSTEM:{" "}
            <span className="text-green-500 animate-pulse">● Connected</span>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-white border px-6 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-all uppercase tracking-widest"
          >
            ← Back
          </Link>
        </header>

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
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between transition-transform hover:scale-[1.02]"
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
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#1d1d1f] to-[#0f172a] text-white p-8 rounded-[2.5rem] shadow-2xl sticky top-28 border border-white/10">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-400 rounded-full animate-pulse"></span>
                {editId ? "Update Registry" : "Deploy New iPhone"}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. iPhone 15 Pro"
                    className="w-full bg-white/10 border-none rounded-xl p-3 outline-none focus:bg-white/20 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest text-blue-400">
                      Kaunas Stock
                    </label>
                    <input
                      type="text"
                      value={stockKaunas}
                      onChange={(e) => setStockKaunas(e.target.value)}
                      className="w-full bg-white/10 border-none rounded-xl p-3 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest text-emerald-400">
                      Vilnius Stock
                    </label>
                    <input
                      type="text"
                      value={stockVilnius}
                      onChange={(e) => setStockVilnius(e.target.value)}
                      className="w-full bg-white/10 border-none rounded-xl p-3 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Unit Price ($)
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-white/10 border-none rounded-xl p-3 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Visual Asset
                  </label>
                  <input
                    type="file"
                    onChange={(e: any) => setFile(e.target.files[0])}
                    className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-600 file:text-white cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold mt-4 shadow-xl active:scale-95 transition-all"
                >
                  {uploading
                    ? "Syncing..."
                    : editId
                      ? "Update Registry"
                      : "Publish to Store"}
                </button>
                {editId && (
                  <button
                    onClick={resetForm}
                    className="w-full text-gray-500 text-[10px] font-black uppercase mt-2"
                  >
                    Discard Changes
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                <div className="relative">
                  <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Search model name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                    <tr className="text-[10px] uppercase font-black text-gray-400 tracking-[0.2em]">
                      <th className="px-8 py-5">Visual</th>
                      <th className="px-6 py-5">Model</th>
                      <th className="px-6 py-5">Kaunas</th>
                      <th className="px-6 py-5">Vilnius</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map((p) => {
                      const kStock = p.get("kaunas") || 0;
                      const vStock = p.get("vilnius") || 0;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-gray-50/50 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                              {p.get("image") && (
                                <img
                                  src={p.get("image").url()}
                                  className="w-full h-full object-contain p-1"
                                  alt="thumb"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold text-gray-800">
                              {p.get("name")}
                            </p>
                            <span className="text-blue-600 text-xs font-black tracking-tight">
                              ${(p.get("price") || 0).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                kStock < 5
                                  ? "bg-red-50 text-red-600"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {kStock} UNITS
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`text-[10px] font-black px-3 py-1 rounded-full ${
                                vStock < 5
                                  ? "bg-red-50 text-red-600"
                                  : "bg-emerald-50 text-emerald-600"
                              }`}
                            >
                              {vStock} UNITS
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex justify-end gap-5">
                              <button
                                onClick={() => startEdit(p)}
                                className="text-[10px] font-black text-gray-400 hover:text-blue-600 uppercase"
                              >
                                Edit
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("Remove model?")) {
                                    await p.destroy();
                                    fetchData();
                                  }
                                }}
                                className="text-[10px] font-black text-gray-300 hover:text-red-500 uppercase"
                              >
                                Remove
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
