"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function WarehousePage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const Product = parseClient.Object.extend("Product");
      const query = new parseClient.Query(Product);
      query.ascending("name");
      const results = await query.find();

      // 🚩 FIX: Clear selection to prevent "Object Not Found" on old IDs
      setSelectedItems([]);
      setInventory(results);
    } catch (error) {
      console.error("Warehouse fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const handleInputChange = (itemId: string, field: string, value: string) => {
    const numericValue = parseInt(value);
    if (numericValue < 0) {
      alert("Inventory Error: Stock cannot be negative.");
      updateLocalState(itemId, field, 0);
      return;
    }
    updateLocalState(itemId, field, isNaN(numericValue) ? 0 : numericValue);
  };

  const updateLocalState = (itemId: string, field: string, value: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          item.set(field, value);
          return item;
        }
        return item;
      }),
    );
  };

  const handleSave = async (item: any) => {
    setSavingId(item.id);
    try {
      await item.save();
      alert(`✅ Updated ${item.get("name")} successfully.`);
      fetchInventory();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDispatchMixedTruck = async (from: "kaunas" | "vilnius") => {
    if (selectedItems.length === 0)
      return alert("Please select items to load into the truck!");

    const destination = from === "kaunas" ? "Vilnius" : "Kaunas";
    const amount = 5;

    // 1. Local Validation Check
    for (const id of selectedItems) {
      const item = inventory.find((p) => p.id === id);
      if (item) {
        const currentStock =
          from === "kaunas"
            ? item.get("kaunas") || 0
            : item.get("vilnius") || 0;
        if (currentStock < amount) {
          return alert(
            `🚨 STOCK ERROR: Not enough units for "${item.get("name")}".`,
          );
        }
      }
    }

    if (!confirm(`Dispatch ${selectedItems.length} items to ${destination}?`))
      return;

    setSavingId("bulk-dispatch");

    try {
      const Product = parseClient.Object.extend("Product");

      // 2. Map manifest data
      const manifestData = selectedItems.map((id) => {
        const item = inventory.find((p) => p.id === id);
        const imgFile = item?.get("image");
        return {
          name: item?.get("name") || "Unnamed Item",
          image: imgFile ? imgFile.url() : "",
        };
      });

      // 3. Update Product Records
      const promises = selectedItems.map(async (id) => {
        const query = new parseClient.Query(Product);
        const freshItem = await query.get(id);

        const k = Number(freshItem.get("kaunas") || 0);
        const v = Number(freshItem.get("vilnius") || 0);

        // Move stock
        if (from === "kaunas") {
          freshItem.set("kaunas", Math.max(0, k - amount));
          freshItem.set("vilnius", v + amount);
        } else {
          freshItem.set("vilnius", Math.max(0, v - amount));
          freshItem.set("kaunas", k + amount);
        }

        // Sync total stock column
        const total = freshItem.get("kaunas") + freshItem.get("vilnius");
        freshItem.set("stock", total);

        // 🚩 THE FIX: Explicitly set transit data to remove (undefined)
        freshItem.set("transitStatus", `In Transit to ${destination}`);

        const eta = new Date();
        eta.setHours(eta.getHours() + 2);

        // Formatting the date string clearly
        const timeString = eta.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        freshItem.set("deliveryDate", `ETA: ${timeString}`);

        return freshItem.save();
      });

      await Promise.all(promises);

      // 4. Create the Logistics Record (The Truck)
      const Delivery = parseClient.Object.extend("Deliveries");
      const truck = new Delivery();

      // Ensure all Delivery fields have values to prevent (undefined) there too
      truck.set("origin", from === "kaunas" ? "Kaunas Hub" : "Vilnius Hub");
      truck.set("destination", destination + " Warehouse");
      truck.set("status", "In Transit");
      truck.set("cargoCount", selectedItems.length);
      truck.set(
        "itemNames",
        manifestData.map((d) => d.name),
      );
      truck.set(
        "itemImages",
        manifestData.map((d) => d.image),
      );
      truck.set("eta", "45 mins");

      await truck.save();

      alert(`🚚 SUCCESS: Truck dispatched from ${from} to ${destination}!`);
      setSelectedItems([]);
      fetchInventory();
    } catch (error: any) {
      console.error("Logistics Error:", error);
      alert("Logistics Sync Error: " + (error.message || "Object not found"));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans text-black antialiased">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Warehouse Management
            </h1>
            <p className="text-gray-400 text-sm italic">
              Inventory Identification & Logistics
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black border border-black px-6 py-2 rounded-full uppercase"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="flex gap-4 mb-8 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm items-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-4">
            Fleet Controls:
          </p>
          <button
            onClick={() => handleDispatchMixedTruck("kaunas")}
            disabled={
              selectedItems.length === 0 || savingId === "bulk-dispatch"
            }
            className="bg-blue-600 text-white text-[10px] font-black px-8 py-3 rounded-full uppercase shadow-lg disabled:bg-gray-200"
          >
            {savingId === "bulk-dispatch"
              ? "Dispatching..."
              : `🚚 Move from Kaunas to Vilnius (${selectedItems.length})`}
          </button>
          <button
            onClick={() => handleDispatchMixedTruck("vilnius")}
            disabled={
              selectedItems.length === 0 || savingId === "bulk-dispatch"
            }
            className="bg-emerald-600 text-white text-[10px] font-black px-8 py-3 rounded-full uppercase shadow-lg disabled:bg-gray-200"
          >
            {savingId === "bulk-dispatch"
              ? "Dispatching..."
              : `🚚 Move from Vilnius to Kaunas (${selectedItems.length})`}
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 border-b">
              <tr>
                <th className="px-10 py-6 w-10">Select</th>
                <th className="px-6 py-6">Product Image & Name</th>
                <th className="px-6 py-6 text-center text-blue-500">Kaunas</th>
                <th className="px-6 py-6 text-center text-emerald-500">
                  Vilnius
                </th>
                <th className="px-10 py-6 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventory.map((item) => {
                const k = item.get("kaunas") || 0;
                const v = item.get("vilnius") || 0;
                const transit = item.get("transitStatus");
                const imageUrl = item.get("image")
                  ? item.get("image").url()
                  : null;

                return (
                  <tr
                    key={item.id}
                    className={`${selectedItems.includes(item.id) ? "bg-blue-50/40" : "hover:bg-gray-50/20"}`}
                  >
                    <td className="px-10 py-6">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="w-5 h-5 accent-blue-600 rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
                        {/* 🚩 IMAGE BEFORE TEXT */}
                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 shadow-sm">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={item.get("name")}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">
                              📦
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-sm text-[#1d1d1f] uppercase tracking-tight">
                            {item.get("name")}
                          </p>
                          {transit && (
                            <p className="text-[8px] text-orange-600 font-black uppercase mt-1 animate-pulse tracking-widest">
                              🚚 {transit}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <input
                        type="number"
                        value={k}
                        onChange={(e) =>
                          handleInputChange(item.id, "kaunas", e.target.value)
                        }
                        className="w-16 bg-transparent border-b text-center font-black text-blue-600 outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-6 py-6 text-center">
                      <input
                        type="number"
                        value={v}
                        onChange={(e) =>
                          handleInputChange(item.id, "vilnius", e.target.value)
                        }
                        className="w-16 bg-transparent border-b text-center font-black text-emerald-600 outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button
                        onClick={() => handleSave(item)}
                        disabled={savingId === item.id}
                        className="bg-black text-white text-[9px] font-black px-6 py-2.5 rounded-full uppercase shadow-sm active:scale-95 transition-all"
                      >
                        {savingId === item.id ? "Syncing..." : "Update"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
