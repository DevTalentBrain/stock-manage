"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import { useCities, CityProvider } from "@/lib/city-context";

function WarehouseContent() {
  const {
    cities,
    loading: citiesLoading,
    refreshStock,
    getStockForProduct,
    productStockMap,
  } = useCities();
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [sourceCityId, setSourceCityId] = useState<string>("");
  const [destCityId, setDestCityId] = useState<string>("");
  // Per-item transfer quantities: { [productId]: string }
  const [transferQtys, setTransferQtys] = useState<Record<string, string>>({});
  // Set of product names that have active "In Transit" cargo
  const [pendingDeliveryNames, setPendingDeliveryNames] = useState<Set<string>>(
    new Set(),
  );

  // Local stock edits: { [productId]: { [cityId]: number } }
  const [localStockEdits, setLocalStockEdits] = useState<
    Record<string, Record<string, number>>
  >({});

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchPendingDeliveries() {
    try {
      const Cargo = parseClient.Object.extend("Cargo");
      const query = new parseClient.Query(Cargo);
      query.equalTo("status", "In Transit");
      const results = await query.find();
      const names = new Set<string>();
      results.forEach((cargo) => {
        const itemNames = cargo.get("itemNames") || [];
        itemNames.forEach((name: string) => names.add(name));
      });
      setPendingDeliveryNames(names);
    } catch (error) {
      console.error("Pending deliveries fetch error:", error);
    }
  }

  async function fetchInventory() {
    try {
      const Product = parseClient.Object.extend("Product");
      const query = new parseClient.Query(Product);
      query.ascending("name");
      const results = await query.find();
      setSelectedItems([]);
      setInventory(results);
      setLocalStockEdits({});
      setTransferQtys({});
      // Refresh stock for all products
      await refreshStock();
      // Fetch pending deliveries
      await fetchPendingDeliveries();
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

  // Only updates local state, does NOT save to DB
  const handleLocalStockChange = (
    productId: string,
    cityId: string,
    value: string,
  ) => {
    // Allow empty string so user can clear and retype
    if (value === "") {
      setLocalStockEdits((prev) => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          [cityId]: "" as any,
        },
      }));
      return;
    }

    const numericValue = parseInt(value);
    if (isNaN(numericValue)) return;
    if (numericValue < 0) return;

    setLocalStockEdits((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        [cityId]: numericValue,
      },
    }));
  };

  // Gets the display value for a stock input - either local edit or DB value
  const getStockValue = (
    productId: string,
    cityId: string,
  ): number | string => {
    if (
      localStockEdits[productId] &&
      localStockEdits[productId][cityId] !== undefined
    ) {
      return localStockEdits[productId][cityId];
    }
    const stocks = getStockForProduct(productId);
    const stock = stocks.find((s) => s.cityId === cityId);
    return stock?.stock || 0;
  };

  // Saves ALL city stock values for a product to the DB
  const handleSaveStock = async (item: any) => {
    const productId = item.id;
    const edits = localStockEdits[productId];
    if (!edits) {
      alert("No changes to save.");
      return;
    }

    setSavingId(productId);

    try {
      const CityStock = parseClient.Object.extend("CityStock");
      const ProductRef = parseClient.Object.extend("Product");
      const CityRef = parseClient.Object.extend("City");

      for (const cityId of Object.keys(edits)) {
        const rawValue = edits[cityId];
        const safeValue =
          typeof rawValue === "string" && rawValue === "" ? 0 : rawValue;
        const productPtr = ProductRef.createWithoutData(productId);
        const cityPtr = CityRef.createWithoutData(cityId);

        const query = new parseClient.Query(CityStock);
        query.equalTo("product", productPtr);
        query.equalTo("city", cityPtr);
        const existingEntry = await query.first();

        if (existingEntry) {
          existingEntry.set("stock", safeValue);
          await existingEntry.save();
        } else {
          const newEntry = new CityStock();
          newEntry.set("product", productPtr);
          newEntry.set("city", cityPtr);
          newEntry.set("stock", safeValue);
          await newEntry.save();
        }
      }

      // Clear local edits for this product after saving
      setLocalStockEdits((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });

      await refreshStock(productId);
      alert(`✅ Stock updated for ${item.get("name")} successfully.`);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDispatchMixedTruck = async () => {
    if (selectedItems.length === 0)
      return alert("Please select items to load into the truck!");

    if (!sourceCityId || !destCityId)
      return alert("Please select both source and destination cities.");

    if (sourceCityId === destCityId)
      return alert("Source and destination cities must be different!");

    const fromCity = cities.find((c) => c.id === sourceCityId);
    const toCity = cities.find((c) => c.id === destCityId);
    if (!fromCity || !toCity) return alert("City not found!");

    // Validate per-item quantities
    const qtyMap: Record<string, number> = {};
    for (const id of selectedItems) {
      const raw = transferQtys[id];
      const qty = parseInt(raw || "");
      if (isNaN(qty) || qty <= 0) {
        const item = inventory.find((p) => p.id === id);
        return alert(
          `Please enter a valid transfer quantity for "${item?.get("name") || id}".`,
        );
      }
      qtyMap[id] = qty;
    }

    // 1. Local Validation Check
    for (const id of selectedItems) {
      const item = inventory.find((p) => p.id === id);
      if (item) {
        const stocks = getStockForProduct(id);
        const fromStock = stocks.find((s) => s.cityId === sourceCityId);
        const currentStock = fromStock?.stock || 0;
        const qty = qtyMap[id];
        if (currentStock < qty) {
          return alert(
            `🚨 STOCK ERROR: Not enough units for "${item.get("name")}" in ${fromCity.name}. Have ${currentStock}, need ${qty}.`,
          );
        }
      }
    }

    const totalUnits = Object.values(qtyMap).reduce((a, b) => a + b, 0);
    if (
      !confirm(
        `Dispatch ${selectedItems.length} items (${totalUnits} total units) from ${fromCity.name} to ${toCity.name}?`,
      )
    )
      return;

    setSavingId("bulk-dispatch");

    try {
      // 2. Map manifest data
      const manifestData = selectedItems.map((id) => {
        const item = inventory.find((p) => p.id === id);
        const imgFile = item?.get("image");
        return {
          name: item?.get("name") || "Unnamed Item",
          image: imgFile ? imgFile.url() : "",
        };
      });

      // 3. Call Cloud Function (handles all DB operations with master key server-side)
      await parseClient.Cloud.run("dispatchStock", {
        items: selectedItems.map((id) => ({
          productId: id,
          qty: qtyMap[id],
        })),
        sourceCityId,
        destCityId: toCity.id,
        manifestData,
        fromCityName: fromCity.name,
        toCityName: toCity.name,
      });

      alert(
        `🚚 SUCCESS: Truck dispatched from ${fromCity.name} to ${toCity.name}!`,
      );
      setSelectedItems([]);
      setTransferQtys({});
      fetchInventory();
    } catch (error: any) {
      console.error("Logistics Error:", error);
      alert("Logistics Sync Error: " + (error.message || "Object not found"));
    } finally {
      setSavingId(null);
    }
  };

  const getTotalStock = (productId: string) => {
    const stocks = getStockForProduct(productId);
    return stocks.reduce((sum, s) => sum + s.stock, 0);
  };

  if (loading || citiesLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

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

        <div className="flex gap-4 mb-8 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm items-center flex-wrap">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-4">
            Fleet Controls:
          </p>
          <div className="flex items-center gap-3">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              From:
            </label>
            <select
              value={sourceCityId}
              onChange={(e) => setSourceCityId(e.target.value)}
              className="text-[10px] font-black bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
            >
              <option value="">Select source...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
              To:
            </label>
            <select
              value={destCityId}
              onChange={(e) => setDestCityId(e.target.value)}
              className="text-[10px] font-black bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
            >
              <option value="">Select destination...</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleDispatchMixedTruck}
            disabled={
              selectedItems.length === 0 ||
              !sourceCityId ||
              !destCityId ||
              savingId === "bulk-dispatch"
            }
            className="bg-black text-white text-[10px] font-black px-8 py-3 rounded-full uppercase shadow-lg disabled:bg-gray-200 disabled:text-gray-400 hover:bg-gray-800 transition-all"
          >
            {savingId === "bulk-dispatch"
              ? "Dispatching..."
              : `🚚 Dispatch (${selectedItems.length} items)`}
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 border-b">
              <tr>
                <th className="px-10 py-6 w-10">Select</th>
                <th className="px-6 py-6">Product Image & Name</th>
                {cities.map((city) => (
                  <th
                    key={city.id}
                    className="px-6 py-6 text-center"
                    style={{
                      color:
                        city.color === "emerald"
                          ? "#059669"
                          : city.color === "blue"
                            ? "#2563eb"
                            : "#6366f1",
                    }}
                  >
                    {city.name}
                  </th>
                ))}
                <th className="px-6 py-6 text-center">Transfer Qty</th>
                <th className="px-10 py-6 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inventory.map((item) => {
                const imageUrl = item.get("image")
                  ? item.get("image").url()
                  : null;
                const isSelected = selectedItems.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    className={`${isSelected ? "bg-blue-50/40" : "hover:bg-gray-50/20"}`}
                  >
                    <td className="px-10 py-6">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelection(item.id)}
                        className="w-5 h-5 accent-blue-600 rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-4">
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
                          {pendingDeliveryNames.has(item.get("name")) && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              🚚 Pending Delivery
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {cities.map((city) => {
                      const val = getStockValue(item.id, city.id);
                      return (
                        <td key={city.id} className="px-6 py-6 text-center">
                          <input
                            type="number"
                            value={val}
                            onChange={(e) =>
                              handleLocalStockChange(
                                item.id,
                                city.id,
                                e.target.value,
                              )
                            }
                            className="w-16 bg-transparent border-b text-center font-black outline-none focus:border-blue-500"
                            style={{
                              color:
                                city.color === "emerald"
                                  ? "#059669"
                                  : city.color === "blue"
                                    ? "#2563eb"
                                    : "#6366f1",
                            }}
                          />
                        </td>
                      );
                    })}
                    <td className="px-6 py-6 text-center">
                      <input
                        type="number"
                        value={transferQtys[item.id] || ""}
                        onChange={(e) =>
                          setTransferQtys((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        placeholder="Qty"
                        min="1"
                        className="w-16 bg-gray-50 border border-gray-200 rounded-xl text-center font-black text-[10px] outline-none focus:border-blue-500 px-2 py-2"
                      />
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button
                        onClick={() => handleSaveStock(item)}
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

export default function WarehousePage() {
  return (
    <CityProvider>
      <WarehouseContent />
    </CityProvider>
  );
}
