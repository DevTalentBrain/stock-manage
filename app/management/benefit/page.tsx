"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface OwnerStats {
  realRevenue: number;
  realProfit: number;
  assetValue: number;
  orders: any[];
  loading: boolean;
}

export default function PerfectOwnerPage() {
  const [stats, setStats] = useState<OwnerStats>({
    realRevenue: 0,
    realProfit: 0,
    assetValue: 0,
    orders: [],
    loading: true,
  });

  const router = useRouter();
  const REVENUE_GOAL = 50000; // Your Sales Target

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        console.log("🚀 Audit Started: Syncing Financial Hubs...");

        const currentUser = parseClient.User.current();
        if (!currentUser) {
          router.push("/management/login");
          return;
        }

        // A. Fetch Revenue from Orders
        const Order = parseClient.Object.extend("Order");
        const orderQuery = new parseClient.Query(Order);
        orderQuery.descending("createdAt");
        const allOrders = await orderQuery.find();

        let totalSales = 0;
        allOrders.forEach((o) => {
          // 🚩 Fixed: Using "total" from your database screenshot
          totalSales += Number(o.get("total") || 0);
        });

        // Calculate 40% Estimated Profit Margin
        const estimatedProfit = totalSales * 0.4;

        // B. Fetch Warehouse Asset Value
        const Product = parseClient.Object.extend("Product");
        const pQuery = new parseClient.Query(Product);
        const pResults = await pQuery.find();

        let totalAssets = 0;
        pResults.forEach((p) => {
          const stock =
            Number(p.get("kaunas") || 0) + Number(p.get("vilnius") || 0);
          const unitPrice = Number(p.get("price") || 0);
          totalAssets += stock * unitPrice;
        });

        // C. Update State
        setStats({
          realRevenue: totalSales,
          realProfit: estimatedProfit,
          assetValue: totalAssets,
          orders: allOrders.slice(0, 5),
          loading: false,
        });
      } catch (err: any) {
        console.error("❌ Sync Error:", err);
        if (err.code === 209) {
          await parseClient.User.logOut();
          localStorage.clear();
          router.push("/management/login");
        }
      }
    };

    fetchMasterData();
  }, [router]);

  // Logic: Progress is based on Revenue vs Revenue Goal
  const goalPercentage =
    stats.realRevenue > 0
      ? Math.min((stats.realRevenue / REVENUE_GOAL) * 100, 100)
      : 0;

  return (
    <main className="min-h-screen bg-[#fbfbfd] p-8 md:p-16 font-sans text-[#1d1d1f] antialiased">
      <div className="max-w-6xl mx-auto">
        {/* --- HEADER --- */}
        <header className="mb-16 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2">
              Master Audit
            </h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
                Unified Fiscal Intelligence
              </p>
            </div>
          </div>
          <Link
            href="/management/dashboard"
            className="bg-white border border-gray-200 px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-black hover:text-white transition-all"
          >
            ← Dashboard
          </Link>
        </header>

        {/* --- KPI SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* TOTAL SALES */}
          <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-4">
              Total Realized Sales (Revenue)
            </p>
            <h2 className="text-7xl font-black tracking-tighter mb-4">
              €{stats.loading ? "---" : stats.realRevenue.toLocaleString()}
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Live Aggregate from Order class
            </p>
          </div>

          {/* ASSETS */}
          <div className="bg-black p-12 rounded-[3.5rem] shadow-2xl text-white flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">
                Total Inventory Value
              </p>
              <h2 className="text-4xl font-black">
                €{stats.loading ? "0" : stats.assetValue.toLocaleString()}
              </h2>
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-6 tracking-tighter">
              Warehouse Hub Assets
            </p>
          </div>
        </div>

        {/* --- SALES & PROFIT GOAL --- */}
        <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">
                Sales Target Progress
              </h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">
                Net Profit: €{stats.realProfit.toLocaleString()}
              </p>
            </div>
            <span className="text-3xl font-black text-indigo-600">
              {Math.round(goalPercentage)}%
            </span>
          </div>

          <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-1000 ease-out"
              style={{ width: `${goalPercentage}%` }}
            ></div>
          </div>

          <div className="flex justify-between mt-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Current Sales: €{stats.realRevenue.toLocaleString()}
            </p>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Target: €{REVENUE_GOAL.toLocaleString()}
            </p>
          </div>
        </div>

        {/* --- RECENT SALES LOG --- */}
        <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
          <h3 className="text-[11px] font-black uppercase tracking-widest mb-8 text-gray-400">
            Internal Transaction Log (Last {stats.orders.length})
          </h3>
          <div className="space-y-3">
            {stats.loading ? (
              <div className="py-10 text-center text-[10px] font-black uppercase animate-pulse">
                Scanning...
              </div>
            ) : (
              stats.orders.map((o) => {
                const orderVal = Number(o.get("total") || 0); // Safe Math
                return (
                  <div
                    key={o.id}
                    className="flex justify-between items-center p-6 bg-[#f9f9fb] rounded-3xl border border-gray-50 hover:border-emerald-100 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-xs">
                        📦
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-tight text-gray-800">
                          Order Key: {o.id}
                        </p>
                        <p className="text-[8px] text-gray-400 font-bold uppercase mt-1">
                          Verified{" "}
                          {o.get("createdAt")
                            ? new Date(o.get("createdAt")).toLocaleDateString()
                            : "Recent"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-emerald-600">
                      +€{orderVal.toLocaleString()}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <footer className="mt-16 text-center">
          <p className="text-[9px] font-black uppercase text-gray-300 tracking-[0.4em]">
            Official Audit Record • Secure Management Session
          </p>
        </footer>
      </div>
    </main>
  );
}
