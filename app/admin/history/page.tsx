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

  // --- SMART CITY BADGE LOGIC ---
  const getCityInfo = (summary: string) => {
    if (!summary)
      return {
        label: "Pending",
        style: "bg-gray-50 text-gray-400 border-gray-100",
      };
    const text = summary.toLowerCase();

    const hasKaunas = text.includes("kaunas");
    const hasVilnius = text.includes("vilnius");

    if (hasKaunas && hasVilnius)
      return {
        label: "Multi-Hub",
        style: "bg-purple-50 text-purple-600 border-purple-100",
      };
    if (hasKaunas)
      return {
        label: "Kaunas Hub",
        style: "bg-blue-50 text-blue-600 border-blue-100",
      };
    if (hasVilnius)
      return {
        label: "Vilnius Hub",
        style: "bg-emerald-50 text-emerald-600 border-emerald-100",
      };

    return {
      label: "Global",
      style: "bg-gray-100 text-gray-600 border-gray-200",
    };
  };

  const filteredOrders = orders.filter((order) => {
    const username = order.get("user")?.get("username")?.toLowerCase() || "";
    const email = order.get("user")?.get("email")?.toLowerCase() || "";
    const summary = order.get("itemSummary")?.toLowerCase() || "";
    const search = searchTerm.toLowerCase();
    return (
      username.includes(search) ||
      email.includes(search) ||
      summary.includes(search)
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 text-[#1d1d1f] font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-black">
              Order Audit
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium italic">
              Tracking warehouse distribution and order flow history.
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-white border border-gray-200 text-[#1d1d1f] px-6 py-2.5 rounded-full shadow-sm hover:bg-black hover:text-white transition-all uppercase tracking-widest"
          >
            ← Dashboard
          </Link>
        </header>

        {/* --- SEARCH BAR --- */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
          <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex-shrink-0">
            <div className="relative max-w-xl">
              <span className="absolute inset-y-0 left-5 flex items-center text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by Stockholder, email, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
                <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                  <th className="px-10 py-6">Date / Registry</th>
                  <th className="px-6 py-6">Products</th>
                  <th className="px-6 py-6">Warehouse Source</th>
                  <th className="px-6 py-6">User</th>
                  <th className="px-6 py-6 text-right">Total Amount</th>
                  <th className="px-10 py-6 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order) => {
                  const city = getCityInfo(order.get("itemSummary"));
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/50 transition-colors group"
                    >
                      {/* 1. DATE */}
                      <td className="px-10 py-6">
                        <p className="text-sm font-black text-black">
                          {order.createdAt?.toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">
                          {order.createdAt?.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </td>

                      {/* 2. PRODUCT VISUALS */}
                      <td className="px-6 py-6">
                        <div className="flex -space-x-6 group-hover:space-x-1 transition-all duration-500 ease-in-out">
                          {order
                            .get("itemImages")
                            ?.slice(0, 4)
                            .map((url: string, i: number) => (
                              <img
                                key={i}
                                src={url}
                                className="h-14 w-14 rounded-2xl ring-4 ring-white bg-white object-contain p-1.5 border border-gray-100 shadow-sm hover:scale-110 hover:z-30 transition-all cursor-pointer"
                                alt="product"
                              />
                            ))}
                          {order.get("itemImages")?.length > 4 && (
                            <div className="h-14 w-14 rounded-2xl bg-gray-900 flex items-center justify-center text-[10px] text-white font-black ring-4 ring-white">
                              +{order.get("itemImages").length - 4}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. WAREHOUSE SOURCE BADGE */}
                      <td className="px-6 py-6">
                        <span
                          className={`text-[9px] font-black px-4 py-1.5 rounded-lg border uppercase tracking-wider ${city.style}`}
                        >
                          {city.label}
                        </span>
                      </td>

                      {/* 4. STOCKHOLDER */}
                      <td className="px-6 py-6">
                        <p className="font-black text-sm text-black group-hover:text-blue-600 transition-colors">
                          {order.get("user")?.get("username") ||
                            "Guest Account"}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold truncate max-w-[150px]">
                          {order.get("user")?.get("email") ||
                            "no-email@system.lt"}
                        </p>
                      </td>

                      {/* 5. TOTAL */}
                      <td className="px-6 py-6 text-right">
                        <p className="font-black text-blue-600 text-lg">
                          ${(order.get("total") || 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">
                          Paid via Stripe
                        </p>
                      </td>

                      {/* 6. STATUS */}
                      <td className="px-10 py-6 text-right">
                        <span className="bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                          Complete
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredOrders.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-gray-400 font-black uppercase text-xs tracking-widest">
                  No matching records found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
