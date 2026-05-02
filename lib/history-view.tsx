"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

type TabType = "orders" | "cargo" | "deliveries";

interface HistoryViewProps {
  dashboardHref: string;
}

export default function HistoryView({ dashboardHref }: HistoryViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [orders, setOrders] = useState<any[]>([]);
  const [cargoRecords, setCargoRecords] = useState<any[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<any[]>([]);
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
    }
  }

  async function fetchCargoRecords() {
    try {
      const Cargo = parseClient.Object.extend("Cargo");
      const query = new parseClient.Query(Cargo);
      query.equalTo("status", "Delivered");
      query.descending("updatedAt");
      const results = await query.find();
      setCargoRecords(results);
    } catch (error) {
      console.error("Error fetching cargo history:", error);
    }
  }

  async function fetchDeliveryRecords() {
    try {
      const Delivery = parseClient.Object.extend("Deliveries");
      const query = new parseClient.Query(Delivery);
      query.equalTo("status", "Delivered");
      query.descending("updatedAt");
      const results = await query.find();
      setDeliveryRecords(results);
    } catch (error) {
      console.error("Error fetching delivery history:", error);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([
        fetchOrders(),
        fetchCargoRecords(),
        fetchDeliveryRecords(),
      ]);
      setLoading(false);
    }
    load();
  }, []);

  // --- SMART CITY BADGE LOGIC (for orders) ---
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

  // --- FILTERING ---
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

  const filteredCargo = cargoRecords.filter((d) => {
    const search = searchTerm.toLowerCase();
    const items = (d.get("itemNames") || []).join(" ").toLowerCase();
    return items.includes(search);
  });

  const filteredDeliveries = deliveryRecords.filter((d) => {
    const search = searchTerm.toLowerCase();
    const items = (d.get("itemNames") || []).join(" ").toLowerCase();
    return items.includes(search);
  });

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case "orders":
        return "Search by Stockholder, email, or city...";
      case "cargo":
        return "Search by route or item name...";
      case "deliveries":
        return "Search by item name...";
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 text-[#1d1d1f] font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-black">
              History
            </h1>
            <p className="text-gray-500 text-sm mt-1 font-medium italic">
              Customer orders & cargo fleet archive.
            </p>
          </div>
          <Link
            href={dashboardHref}
            className="text-[10px] font-black bg-white border border-gray-200 text-[#1d1d1f] px-6 py-2.5 rounded-full shadow-sm hover:bg-black hover:text-white transition-all uppercase tracking-widest"
          >
            ← Dashboard
          </Link>
        </header>

        {/* --- TABS --- */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "orders"
                ? "bg-black text-white shadow-lg"
                : "bg-white text-gray-400 border border-gray-200 hover:border-gray-400"
            }`}
          >
            📦 Customer Orders
          </button>
          <button
            onClick={() => setActiveTab("cargo")}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "cargo"
                ? "bg-black text-white shadow-lg"
                : "bg-white text-gray-400 border border-gray-200 hover:border-gray-400"
            }`}
          >
            🚛 Cargo Fleet
          </button>
          <button
            onClick={() => setActiveTab("deliveries")}
            className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === "deliveries"
                ? "bg-black text-white shadow-lg"
                : "bg-white text-gray-400 border border-gray-200 hover:border-gray-400"
            }`}
          >
            📬 Deliveries History
          </button>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
          <div className="p-8 border-b border-gray-100 bg-gray-50/30 flex-shrink-0">
            <div className="relative max-w-xl">
              <span className="absolute inset-y-0 left-5 flex items-center text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-200 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : activeTab === "orders" ? (
              /* ========== CUSTOMER ORDERS TABLE ========== */
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
                  <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                    <th className="px-10 py-6">Date / Registry</th>
                    <th className="px-6 py-6">Products & Quantities</th>
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

                        {/* 2. PRODUCTS & QUANTITIES */}
                        <td className="px-6 py-6">
                          <div className="flex flex-wrap gap-2 max-w-[280px]">
                            {(() => {
                              const summary = order.get("itemSummary") || "";
                              const parts = summary.split(", ").filter(Boolean);
                              return parts.map((part: string, idx: number) => {
                                const match = part.match(/^(.+?)\s*x(\d+)$/);
                                const name = match
                                  ? match[1].trim()
                                  : part.trim();
                                const qty = match ? parseInt(match[2], 10) : 1;
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg"
                                  >
                                    <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                                      {name}
                                    </span>
                                    <span className="text-[7px] font-black bg-black text-white px-1.5 py-0.5 rounded ml-1">
                                      x{qty}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
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
            ) : activeTab === "cargo" ? (
              /* ========== CARGO FLEET TABLE ========== */
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
                  <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                    <th className="px-10 py-6">Date / Route</th>
                    <th className="px-6 py-6">Manifest</th>
                    <th className="px-6 py-6 text-center">Total Units</th>
                    <th className="px-10 py-6 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCargo.map((d) => {
                    const itemNames = d.get("itemNames") || [];
                    const itemImages = d.get("itemImages") || [];
                    const itemQtys = d.get("itemQtys") || [];
                    const totalUnits =
                      itemQtys.reduce((a: number, b: number) => a + b, 0) ||
                      itemNames.length * 5;

                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-10 py-6">
                          <p className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                            <span className="text-xl">🚛</span>
                            {d.get("fromCity") || "?"}{" "}
                            <span className="text-blue-500">➔</span>{" "}
                            {d.get("toCity") || "?"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">
                            {d.updatedAt?.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            {d.updatedAt?.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>

                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-3 flex-shrink-0">
                              {itemImages
                                .slice(0, 4)
                                .map((url: string, i: number) => (
                                  <img
                                    key={i}
                                    src={url}
                                    className="w-10 h-10 rounded-full border-2 border-white object-cover bg-gray-50 shadow-sm"
                                    alt="product"
                                  />
                                ))}
                              {itemImages.length > 4 && (
                                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-[8px] text-white font-black border-2 border-white">
                                  +{itemImages.length - 4}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 max-w-[300px]">
                              {itemNames.map((name: string, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg"
                                >
                                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                                    {name}
                                  </span>
                                  <span className="text-[7px] font-black bg-black text-white px-1.5 py-0.5 rounded ml-1">
                                    {itemQtys[i] || 5} UNITS
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-6 text-center">
                          <div className="inline-block bg-blue-50 px-4 py-1.5 rounded-full">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                              {totalUnits} Total Units
                            </p>
                            <p className="text-[7px] font-bold text-blue-300 uppercase text-center mt-0.5">
                              {itemNames.length} Items
                            </p>
                          </div>
                        </td>

                        <td className="px-10 py-6 text-right">
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                            Delivered
                          </span>
                          <p className="text-[9px] text-gray-400 font-bold mt-1">
                            {d.get("arrivedAt")
                              ? new Date(
                                  d.get("arrivedAt"),
                                ).toLocaleDateString()
                              : d.updatedAt?.toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ========== DELIVERIES HISTORY TABLE ========== */
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-20">
                  <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                    <th className="px-10 py-6">Date / Registry</th>
                    <th className="px-6 py-6">Products</th>
                    <th className="px-6 py-6">Recipient</th>
                    <th className="px-6 py-6 text-center">Total Value</th>
                    <th className="px-10 py-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDeliveries.map((d) => {
                    const itemNames = d.get("itemNames") || [];
                    const itemImages = d.get("itemImages") || [];
                    const itemQtys = d.get("itemQtys") || [];

                    return (
                      <tr
                        key={d.id}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="px-10 py-6">
                          <p className="font-black text-sm text-black">
                            {d.updatedAt?.toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">
                            {d.updatedAt?.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </td>

                        <td className="px-6 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex -space-x-3 flex-shrink-0">
                              {itemImages
                                .slice(0, 4)
                                .map((url: string, i: number) => (
                                  <img
                                    key={i}
                                    src={url}
                                    className="w-10 h-10 rounded-full border-2 border-white object-cover bg-gray-50 shadow-sm"
                                    alt="product"
                                  />
                                ))}
                              {itemImages.length > 4 && (
                                <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-[8px] text-white font-black border-2 border-white">
                                  +{itemImages.length - 4}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 max-w-[300px]">
                              {itemNames.map((name: string, i: number) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg"
                                >
                                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                                    {name}
                                  </span>
                                  <span className="text-[7px] font-black bg-black text-white px-1.5 py-0.5 rounded ml-1">
                                    {itemQtys[i] || 1} UNITS
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-6">
                          <p className="font-black text-sm text-black">
                            {d.get("recipient") || "N/A"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">
                            {d.get("trackingNumber") || "No tracking"}
                          </p>
                        </td>

                        <td className="px-6 py-6 text-center">
                          <p className="font-black text-blue-600">
                            ${(d.get("totalValue") || 0).toLocaleString()}
                          </p>
                        </td>

                        <td className="px-10 py-6 text-right">
                          <span className="bg-emerald-500 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                            Delivered
                          </span>
                          <p className="text-[9px] text-gray-400 font-bold mt-1">
                            {d.get("arrivedAt")
                              ? new Date(
                                  d.get("arrivedAt"),
                                ).toLocaleDateString()
                              : d.updatedAt?.toLocaleDateString()}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* EMPTY STATE */}
            {!loading && (
              <>
                {activeTab === "orders" && filteredOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest">
                      No matching records found
                    </p>
                  </div>
                )}
                {activeTab === "cargo" && filteredCargo.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <p className="text-gray-400 font-black uppercase text-xs tracking-widest">
                      No cargo history found
                    </p>
                  </div>
                )}
                {activeTab === "deliveries" &&
                  filteredDeliveries.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="text-gray-400 font-black uppercase text-xs tracking-widest">
                        No delivery history found
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
