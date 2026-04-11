"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function HistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  async function fetchOrders() {
    try {
      const Order = parseClient.Object.extend("Order");
      const query = new parseClient.Query(Order);
      query.include("user");
      query.descending("createdAt");
      const results = await query.find();
      setOrders(results);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  const getCityBadge = (summary: string) => {
    if (!summary) return "Pending";

    const text = summary.toLowerCase();

    const hasKaunas = text.includes("kaunas");
    const hasVilnius = text.includes("vilnius");

    if (hasKaunas && hasVilnius) return "Multi-City";
    if (hasKaunas) return "Kaunas";
    if (hasVilnius) return "Vilnius";

    return "Global";
  };

  const filteredOrders = orders.filter((order) => {
    const username = order.get("user")?.get("username")?.toLowerCase() || "";
    const email = order.get("user")?.get("email")?.toLowerCase() || "";
    const summary = order.get("itemSummary")?.toLowerCase() || "";
    return (
      username.includes(searchTerm.toLowerCase()) ||
      email.includes(searchTerm.toLowerCase()) ||
      summary.includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 text-[#1d1d1f] font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase">
              Order Audit
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Reviewing stockholder acquisition and warehouse source data.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-white border px-6 py-2 rounded-full shadow-sm hover:bg-gray-50 transition-all uppercase tracking-widest"
          >
            ← Back
          </Link>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[600px]">
          <div className="p-6 border-b border-gray-100 bg-gray-50/30 flex-shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search stockholder, city, or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-hide">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                  <th className="px-8 py-5">Registry Date</th>
                  <th className="px-6 py-5">Visual</th>
                  <th className="px-6 py-5">Warehouse</th>
                  <th className="px-6 py-5">Stockholder</th>
                  <th className="px-6 py-5">Items</th>
                  <th className="px-6 py-5">Total</th>
                  <th className="px-6 py-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => {
                  const rawSummary = order.get("itemSummary") || "";
                  const lowerSummary = rawSummary.toLowerCase();

                  let cityLabel = "Global";
                  if (lowerSummary.includes("kaunas")) cityLabel = "Kaunas";
                  if (lowerSummary.includes("vilnius")) cityLabel = "Vilnius";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/30 transition-colors group"
                    >
                      {/* 1. Date & Time */}
                      <td className="px-8 py-5">
                        <p className="text-xs font-bold text-gray-800">
                          {order.createdAt?.toLocaleDateString()}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {order.createdAt?.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>

                      {/* 2. Visuals */}
                      <td className="px-6 py-5">
                        <div className="flex -space-x-5 group-hover:space-x-1 transition-all duration-500 ease-in-out">
                          {order
                            .get("itemImages")
                            ?.map((url: string, i: number) => (
                              <div key={i} className="relative group/img">
                                <img
                                  src={url}
                                  className="h-14 w-14 min-w-[3.5rem] rounded-[1.2rem] ring-4 ring-white bg-white object-contain p-1.5 border border-gray-100 shadow-sm hover:scale-110 hover:z-10 transition-transform duration-300 cursor-pointer"
                                  alt="ordered product"
                                />
                              </div>
                            ))}
                        </div>
                      </td>

                      {/* NEW: WAREHOUSE CITY COLUMN */}
                      <td className="px-6 py-5">
                        <span
                          className={`text-[9px] font-black px-3 py-1 rounded-md border uppercase w-fit ${
                            cityLabel === "Kaunas"
                              ? "bg-blue-50 text-blue-600 border-blue-100"
                              : cityLabel === "Vilnius"
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-red-50 text-red-600 border-red-100"
                          }`}
                        >
                          {cityLabel}
                        </span>
                      </td>

                      {/* 3. Stockholder */}
                      <td className="px-6 py-5">
                        <p className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                          {order.get("user")?.get("username") || "Guest"}
                        </p>
                        <p className="text-[10px] text-blue-500 font-medium">
                          {order.get("user")?.get("email")}
                        </p>
                      </td>

                      {/* 4. Items Summary */}
                      <td className="px-6 py-5 text-xs text-gray-600 font-medium leading-relaxed max-w-[200px]">
                        {order.get("itemSummary")}
                      </td>

                      {/* 5. Total */}
                      <td className="px-6 py-5 font-black text-blue-600 text-lg">
                        ${(order.get("total") || 0).toLocaleString()}
                      </td>

                      {/* 6. Status */}
                      <td className="px-6 py-5 text-right">
                        <span className="bg-green-50 text-green-500 text-[10px] font-black px-4 py-1.5 rounded-full border border-green-100 uppercase tracking-tighter">
                          Verified
                        </span>
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
  );
}
