"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalValue: 0,
    yearlyTotal: 0,
    items: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [supportNotifications, setSupportNotifications] = useState(0); // Notification state

  useEffect(() => {
    async function fetchDashboardData() {
      if (typeof window === "undefined") return;

      try {
        // 1. Calculate Asset Value
        const Product = parseClient.Object.extend("Product");
        const prodResults = await new parseClient.Query(Product).find();
        let totalVal = 0;
        prodResults.forEach((p: any) => {
          const k = Number(p.get("kaunas")) || 0;
          const v = Number(p.get("vilnius")) || 0;
          const price = Number(p.get("price")) || 0;
          totalVal += (k + v) * price;
        });

        // 2. Fetch All Orders
        const Order = parseClient.Object.extend("Order");
        const orderQuery = new parseClient.Query(Order);
        const orderResults = await orderQuery.find();

        // 3. Fetch Support Notifications (New Logic)
        const SupportMessage = parseClient.Object.extend("SupportMessage");
        const supportQuery = new parseClient.Query(SupportMessage);
        supportQuery.doesNotExist("adminReply"); // Only count messages without a reply
        const unrepliedCount = await supportQuery.count();
        setSupportNotifications(unrepliedCount);

        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        const monthlyMap: any = {};
        const yearlyMap: any = {};
        let currentYearSum = 0;
        const now = new Date();
        const currentYear = now.getFullYear();

        orderResults.forEach((order: any) => {
          const amount = Number(order.get("total")) || 0;
          const date = new Date(order.get("createdAt"));
          const year = date.getFullYear();
          const month = monthNames[date.getMonth()];

          if (year === currentYear) currentYearSum += amount;
          yearlyMap[year] = (yearlyMap[year] || 0) + amount;
          if (year === currentYear) {
            monthlyMap[month] = (monthlyMap[month] || 0) + amount;
          }
        });

        // Prepare Graphs
        const mChart = [];
        for (let i = 4; i >= 0; i--) {
          const d = new Date();
          d.setMonth(now.getMonth() - i);
          const name = monthNames[d.getMonth()];
          const val = monthlyMap[name] || 0;
          const barHeight = Math.min(Math.max((val / 10000) * 100, 10), 100);
          mChart.push({ name, val, h: `${Math.round(barHeight)}%` });
        }

        const yChart = [];
        for (let i = 4; i >= 0; i--) {
          const targetYear = currentYear - i;
          const val = yearlyMap[targetYear] || 0;
          const barHeight = Math.min(Math.max((val / 50000) * 100, 10), 100);
          yChart.push({
            name: targetYear.toString(),
            val,
            h: `${Math.round(barHeight)}%`,
          });
        }

        setStats({
          totalValue: totalVal,
          yearlyTotal: currentYearSum,
          items: prodResults.length,
        });
        setMonthlyData(mChart);
        setYearlyData(yChart);
      } catch (error) {
        console.error("Dashboard error:", error);
      }
    }
    fetchDashboardData();
  }, []);

  const navButtons = [
    {
      name: "Warehouse",
      path: "/admin/warehouse",
      icon: "🏢",
      color: "bg-blue-500",
    },
    {
      name: "History",
      path: "/admin/history",
      icon: "📜",
      color: "bg-purple-500",
    },
    {
      name: "Upload",
      path: "/admin/upload",
      icon: "📤",
      color: "bg-orange-500",
    },
    {
      name: "Support",
      path: "/admin/support",
      icon: "💬",
      color: "bg-red-500",
      hasBadge: supportNotifications > 0, // Added flag for badge
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-6 md:p-12 font-sans antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-4xl font-black tracking-tight text-[#1d1d1f] uppercase">
            Inventory Management
          </h1>
          <p className="text-gray-500 font-medium">
            Kaunas & Vilnius Performance Tracking
          </p>
        </header>

        {/* NAVIGATION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {navButtons.map((btn) => (
            <Link key={btn.name} href={btn.path}>
              <div className="relative bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group text-center">
                {/* Notification Badge */}
                {btn.hasBadge && (
                  <div className="absolute top-6 right-6 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-lg ring-4 ring-white animate-bounce">
                    {supportNotifications}
                  </div>
                )}

                <div
                  className={`w-16 h-16 ${btn.color} rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg`}
                >
                  {btn.icon}
                </div>
                <span className="text-[12px] font-black uppercase tracking-widest text-gray-400 group-hover:text-black">
                  {btn.name}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Graphs and Sidebar remain unchanged */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ... Rest of your component code ... */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h2 className="text-gray-500 text-xl font-bold mb-8">
                Price Analysis (Monthly)
              </h2>
              <div className="h-48 w-full bg-gray-50 rounded-[2rem] flex items-end justify-around p-6 gap-2 border border-gray-100">
                {monthlyData.map((data, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center flex-1 group h-full justify-end"
                  >
                    <div className="text-[10px] font-bold text-blue-500 mb-2 opacity-0 group-hover:opacity-100">
                      ${data.val.toLocaleString()}
                    </div>
                    <div
                      style={{ height: data.h }}
                      className="w-full bg-blue-600 rounded-t-xl hover:bg-blue-400 transition-all cursor-pointer shadow-sm"
                    ></div>
                    <span className="text-[10px] font-black text-gray-400 mt-4 uppercase">
                      {data.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h2 className="text-gray-500 text-xl font-bold mb-8">
                Profit Analysis (Yearly)
              </h2>
              <div className="h-48 w-full bg-gray-50 rounded-[2rem] flex items-end justify-around p-6 gap-2 border border-gray-100">
                {yearlyData.map((data, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center flex-1 group h-full justify-end"
                  >
                    <div className="text-[10px] font-bold text-emerald-500 mb-2 opacity-0 group-hover:opacity-100">
                      ${data.val.toLocaleString()}
                    </div>
                    <div
                      style={{ height: data.h }}
                      className="w-full bg-emerald-500 rounded-t-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
                    ></div>
                    <span className="text-[10px] font-black text-gray-400 mt-4 uppercase">
                      {data.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[550px] bg-[#1d1d1f] p-10 py-16 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between">
            <div className="space-y-16">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                  Total Sold This Year
                </p>
                <h3 className="text-6xl font-black tracking-tighter text-white">
                  ${stats.yearlyTotal.toLocaleString()}
                </h3>
              </div>
              <div className="pt-12 border-t border-white/10">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">
                  Current Asset Value
                </p>
                <h3 className="text-4xl font-black tracking-tighter text-blue-400">
                  ${stats.totalValue.toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="mt-auto">
              <p className="text-xs text-gray-400 leading-relaxed border-l-2 border-blue-500 pl-4">
                Tracking{" "}
                <span className="text-white font-bold">{stats.items}</span>{" "}
                models in the matrix.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
