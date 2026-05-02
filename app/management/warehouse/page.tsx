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
  } = useCities();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  async function fetchWarehouseData() {
    try {
      const Product = parseClient.Object.extend("Product");
      const query = new parseClient.Query(Product);
      query.ascending("name");
      const results = await query.find();
      setProducts(results);
      await refreshStock();
    } catch (error) {
      console.error("Warehouse Sync Error:", error);
    } finally {
      setLoading(false);
    }
  }

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
    <main className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans text-[#1d1d1f] antialiased">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase text-blue-600 tracking-[0.3em] mb-2">
              Logistics Control
            </p>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Warehouse Overview
            </h1>
            <p className="text-gray-500 font-medium italic">
              Real-time Stock & Transit Progress
            </p>
          </div>
          <Link
            href="/management/dashboard"
            className="bg-white border border-gray-100 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-black hover:text-white transition-all"
          >
            ← Dashboard
          </Link>
        </header>

        {/* DYNAMIC HUB CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {cities.map((city, idx) => {
            const totalUnits = products.reduce(
              (acc, p) => acc + getTotalStock(p.id),
              0,
            );
            const cityUnits = products.reduce((acc, p) => {
              const stocks = getStockForProduct(p.id);
              const cityStock = stocks.find((s) => s.cityId === city.id);
              return acc + (cityStock?.stock || 0);
            }, 0);
            const pct = totalUnits > 0 ? (cityUnits / totalUnits) * 100 : 0;

            const colorMap: Record<string, string> = {
              emerald: "bg-emerald-500",
              blue: "bg-blue-500",
              indigo: "bg-indigo-500",
            };
            const badgeColorMap: Record<string, string> = {
              emerald: "bg-emerald-50 text-emerald-600",
              blue: "bg-blue-50 text-blue-600",
              indigo: "bg-indigo-50 text-indigo-600",
            };
            const barColor = colorMap[city.color] || "bg-gray-500";
            const badgeColor =
              badgeColorMap[city.color] || "bg-gray-50 text-gray-600";

            return (
              <div
                key={city.id}
                className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {city.name}
                  </h3>
                  <span
                    className={`${badgeColor} text-[8px] font-black px-3 py-1 rounded-full uppercase`}
                  >
                    Operational
                  </span>
                </div>
                <p className="text-4xl font-black mb-2">
                  {cityUnits}
                  <span className="text-sm font-medium text-gray-400 ml-2 uppercase">
                    Units
                  </span>
                </p>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
                  <div
                    className={`${barColor} h-full rounded-full animate-pulse`}
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  ></div>
                </div>
                <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase tracking-tighter">
                  Capacity: {Math.round(pct)}% Optimized
                </p>
              </div>
            );
          })}
        </div>

        {/* INVENTORY TRANSIT PROGRESS TABLE */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-900">
              Transit & Inventory Logs
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
                <tr>
                  <th className="px-10 py-6">Product Details</th>
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
                  <th className="px-10 py-6 text-right">Supply Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => {
                  const totalStock = getTotalStock(p.id);
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/30 transition-all"
                    >
                      <td className="px-10 py-8">
                        <p className="font-black text-sm uppercase text-gray-800">
                          {p.get("name")}
                        </p>
                        <p className="text-[9px] text-gray-300 font-mono mt-1">
                          REF: {p.id.substring(0, 8)}
                        </p>
                      </td>
                      {cities.map((city) => {
                        const stocks = getStockForProduct(p.id);
                        const cityStock = stocks.find(
                          (s) => s.cityId === city.id,
                        );
                        return (
                          <td key={city.id} className="px-6 py-8 text-center">
                            <span
                              className="text-xs font-bold px-3 py-1 rounded-lg"
                              style={{
                                color:
                                  city.color === "emerald"
                                    ? "#059669"
                                    : city.color === "blue"
                                      ? "#2563eb"
                                      : "#6366f1",
                                backgroundColor:
                                  city.color === "emerald"
                                    ? "#ecfdf5"
                                    : city.color === "blue"
                                      ? "#eff6ff"
                                      : "#eef2ff",
                              }}
                            >
                              {cityStock?.stock || 0}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-10 py-8 text-right">
                        <div className="flex flex-col items-end">
                          <div className="w-24 bg-gray-100 h-1 rounded-full overflow-hidden mb-2">
                            <div
                              className="bg-black h-full"
                              style={{
                                width: `${Math.min((totalStock / 100) * 100, 100)}%`,
                              }}
                            ></div>
                          </div>
                          <p className="text-[9px] font-black text-gray-400 uppercase">
                            {totalStock > 0 ? "Stock Healthy" : "No Stock"}
                          </p>
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
    </main>
  );
}

export default function WarehousePage() {
  return (
    <CityProvider>
      <WarehouseContent />
    </CityProvider>
  );
}
