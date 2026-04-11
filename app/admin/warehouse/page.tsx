"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function WarehousePage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function fetchInventory() {
    try {
      const Product = parseClient.Object.extend("Product");
      const query = new parseClient.Query(Product);
      query.ascending("model");
      const results = await query.find();
      setInventory(results);
    } catch (error) {
      console.error("Warehouse fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Handle local state changes when typing
  const handleInputChange = (itemId: string, field: string, value: string) => {
    const numericValue = parseInt(value) || 0;
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          item.set(field, numericValue);
          return item;
        }
        return item;
      }),
    );
  };

  // Save the specific item to Parse
  const handleSave = async (item: any) => {
    setSavingId(item.id);
    try {
      await item.save();
      alert(`Updated ${item.get("model") || "Item"} successfully.`);
    } catch (error: any) {
      alert("Error saving: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-[#1d1d1f]">
              Inventory Matrix
            </h1>
            <p className="text-gray-500 text-sm font-medium">
              Global Stock: Kaunas & Vilnius Distribution
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-white border border-[#1d1d1f] text-[#1d1d1f] px-6 py-2 rounded-full hover:bg-gray-50 transition-all"
          >
            ← Back
          </Link>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-10 py-6">Model / Item</th>
                <th className="px-6 py-6 text-center">Price</th>
                <th className="px-6 py-6 text-center bg-blue-50/30 text-blue-500">
                  Kaunas Hub
                </th>
                <th className="px-6 py-6 text-center bg-emerald-50/30 text-emerald-500">
                  Vilnius Hub
                </th>
                <th className="px-10 py-6 text-right">Edit Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventory.map((item) => {
                const k = item.get("kaunas") || 0;
                const v = item.get("vilnius") || 0;
                const itemName =
                  item.get("model") || item.get("name") || "Unnamed Item";

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/30 transition-colors group"
                  >
                    <td className="px-10 py-6">
                      <p className="font-bold text-sm text-[#1d1d1f]">
                        {itemName}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">
                        SKU: {item.id.substring(0, 8)}
                      </p>
                    </td>
                    <td className="px-6 py-6 text-center font-medium text-gray-500">
                      ${(item.get("price") || 0).toLocaleString()}
                    </td>

                    {/* EDITABLE KAUNAS */}
                    <td className="px-6 py-6 text-center bg-blue-50/10">
                      <input
                        type="number"
                        value={k}
                        onChange={(e) =>
                          handleInputChange(item.id, "kaunas", e.target.value)
                        }
                        className="w-16 bg-transparent text-center font-black text-blue-600 outline-none focus:ring-2 ring-blue-500 rounded-md"
                      />
                    </td>

                    {/* EDITABLE VILNIUS */}
                    <td className="px-6 py-6 text-center bg-emerald-50/10">
                      <input
                        type="number"
                        value={v}
                        onChange={(e) =>
                          handleInputChange(item.id, "vilnius", e.target.value)
                        }
                        className="w-16 bg-transparent text-center font-black text-emerald-600 outline-none focus:ring-2 ring-emerald-500 rounded-md"
                      />
                    </td>

                    {/* SAVE BUTTON */}
                    <td className="px-10 py-6 text-right">
                      <button
                        onClick={() => handleSave(item)}
                        disabled={savingId === item.id}
                        className="bg-black text-white text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest disabled:bg-gray-400 transition-all shadow-sm"
                      >
                        {savingId === item.id ? "Saving..." : "Save Changes"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {inventory.length === 0 && !loading && (
            <div className="p-20 text-center">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                No Inventory Detected
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
