"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  // 🚩 NEW: Category State
  const [category, setCategory] = useState("Phone");

  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [orderCount, setOrderCount] = useState(0);

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
      p.set("category", category); // 🚩 SAVING CATEGORY TO DB
      p.set("price", Math.max(0, Number(price) || 0));
      p.set("kaunas", Math.max(0, Number(stockKaunas) || 0));
      p.set("vilnius", Math.max(0, Number(stockVilnius) || 0));

      if (file) {
        const parseFile = new parseClient.File(file.name, file);
        await parseFile.save();
        p.set("image", parseFile);
      }

      await p.save();
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
    setCategory("Phone"); // Reset category
    setStockKaunas("0");
    setStockVilnius("0");
    setPrice("0");
    setFile(null);
  };

  const startEdit = (product: any) => {
    setEditId(product.id);
    setName(product.get("name") ?? "");
    setCategory(product.get("category") ?? "Phone"); // Load category for edit
    setStockKaunas(product.get("kaunas") ?? 0);
    setStockVilnius(product.get("vilnius") ?? 0);
    setPrice(product.get("price") ?? 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredProducts = products.filter((p) => {
    const name = (p.get("name") || "").toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

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
            ← Dashbaord
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

                {/* 🚩 NEW: CATEGORY DROPDOWN */}
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] uppercase font-black text-blue-400 mb-2 block tracking-widest">
                      Kaunas Stock
                    </label>
                    <input
                      type="text"
                      value={stockKaunas}
                      onChange={(e) => setStockKaunas(e.target.value)}
                      className="w-full bg-white/5 rounded-xl p-3 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black text-emerald-400 mb-2 block tracking-widest">
                      Vilnius Stock
                    </label>
                    <input
                      type="text"
                      value={stockVilnius}
                      onChange={(e) => setStockVilnius(e.target.value)}
                      className="w-full bg-white/5 rounded-xl p-3 outline-none"
                    />
                  </div>
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
                      const kStock = p.get("kaunas") || 0;
                      const vStock = p.get("vilnius") || 0;
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
                              <span className="text-[9px] font-black text-blue-500 uppercase">
                                KNS: {kStock}
                              </span>
                              <span className="text-[9px] font-black text-emerald-500 uppercase">
                                VIL: {vStock}
                              </span>
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
