"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function WarehouseManagement() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarehouseData = async () => {
      try {
        const Product = parseClient.Object.extend("Product");
        const query = new parseClient.Query(Product);
        const results = await query.find();
        setProducts(results);
      } catch (error) {
        console.error("Warehouse Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouseData();
  }, []);

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

        {/* PROGRESS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Kaunas Hub Status */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Hub A: Kaunas
              </h3>
              <span className="bg-blue-50 text-blue-600 text-[8px] font-black px-3 py-1 rounded-full uppercase">
                Operational
              </span>
            </div>
            <p className="text-4xl font-black mb-2">
              {products.reduce((acc, p) => acc + (p.get("kaunas") || 0), 0)}
              <span className="text-sm font-medium text-gray-400 ml-2 uppercase">
                Units
              </span>
            </p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-blue-500 h-full w-[65%] rounded-full animate-pulse"></div>
            </div>
            <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase tracking-tighter">
              Capacity: 65% Optimized
            </p>
          </div>

          {/* Vilnius Hub Status */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Hub B: Vilnius
              </h3>
              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-3 py-1 rounded-full uppercase">
                Operational
              </span>
            </div>
            <p className="text-4xl font-black mb-2">
              {products.reduce((acc, p) => acc + (p.get("vilnius") || 0), 0)}
              <span className="text-sm font-medium text-gray-400 ml-2 uppercase">
                Units
              </span>
            </p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-emerald-500 h-full w-[42%] rounded-full"></div>
            </div>
            <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase tracking-tighter">
              Capacity: 42% Optimized
            </p>
          </div>
        </div>

        {/* INVENTORY TRANSIT PROGRESS TABLE */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-10 py-8 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-900">
              Transit & Inventory Logs
            </h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-10 py-6">Product Details</th>
                <th className="px-6 py-6">Kaunas Hub</th>
                <th className="px-6 py-6">Vilnius Hub</th>
                <th className="px-10 py-6 text-right">Supply Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-24 text-center opacity-20 font-black uppercase animate-pulse"
                  >
                    Scanning Warehouse...
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/30 transition-all">
                    <td className="px-10 py-8">
                      <p className="font-black text-sm uppercase text-gray-800">
                        {p.get("name")}
                      </p>
                      <p className="text-[9px] text-gray-300 font-mono mt-1">
                        REF: {p.id.substring(0, 8)}
                      </p>
                    </td>
                    <td className="px-6 py-8">
                      <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-lg">
                        {p.get("kaunas") || 0}
                      </span>
                    </td>
                    <td className="px-6 py-8">
                      <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg">
                        {p.get("vilnius") || 0}
                      </span>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex flex-col items-end">
                        <div className="w-24 bg-gray-100 h-1 rounded-full overflow-hidden mb-2">
                          <div
                            className="bg-black h-full"
                            style={{
                              width: `${Math.min(((p.get("kaunas") + p.get("vilnius")) / 100) * 100, 100)}%`,
                            }}
                          ></div>
                        </div>
                        <p className="text-[9px] font-black text-gray-400 uppercase">
                          Stock Healthy
                        </p>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
