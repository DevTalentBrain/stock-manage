"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ManagementDashboard() {
  const [managerName, setManagerName] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTrucks, setActiveTrucks] = useState<any[]>([]);
  const [unconfirmedDeliveries, setUnconfirmedDeliveries] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();

  const fetchNotificationData = async () => {
    try {
      const result: any = await parseClient.Cloud.run("getPendingOrderCount");
      setPendingOrders(result.count);
    } catch (error) {
      console.error("Notification Error:", error);
    }
  };

  useEffect(() => {
    fetchNotificationData();
    const interval = setInterval(fetchNotificationData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // --- 1. SESSION CHECK ---
  useEffect(() => {
    const user = parseClient.User.current();
    if (
      !user ||
      (user.get("role") !== "manager" && user.get("username") !== "manager")
    ) {
      router.push("/management/login");
    } else {
      setManagerName(user.get("name") || "Owner");
    }
  }, [router]);

  // --- 2. NOTIFICATION FETCHING ---
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        // 1. Count User support messages created after management's last chat visit
        const lastVisit = localStorage.getItem("managementLastChatVisit");
        const userQuery = new parseClient.Query("SupportMessage");
        userQuery.equalTo("status", "Pending");
        if (lastVisit) {
          userQuery.greaterThan("createdAt", new Date(lastVisit));
        }

        // 2. Count Admin private messages (from InternalChat)
        const adminQuery = new parseClient.Query("InternalChat");
        adminQuery.equalTo("role", "ADMIN");
        adminQuery.equalTo("isManagerRead", false);

        const [userResults, adminResults] = await Promise.all([
          userQuery.count(),
          adminQuery.count(),
        ]);
        setUnreadCount(userResults + adminResults);
      } catch (error) {
        console.error("Dashboard Notify Error:", error);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- 3. DATA LOADING (Products + Logistics + Unconfirmed Deliveries) ---
  useEffect(() => {
    async function fetchData() {
      try {
        const Product = parseClient.Object.extend("Product");
        const prodResults = await new parseClient.Query(Product).find();
        setProducts(prodResults);

        const Cargo = parseClient.Object.extend("Cargo");
        const cargoQuery = new parseClient.Query(Cargo);
        cargoQuery.equalTo("status", "In Transit");
        cargoQuery.descending("createdAt");
        cargoQuery.include("fromCity");
        cargoQuery.include("toCity");
        const truckResults = await cargoQuery.find();
        setActiveTrucks(truckResults);

        // Fetch dispatched orders awaiting customer confirmation
        const Order = parseClient.Object.extend("Order");
        const orderQuery = new parseClient.Query(Order);
        orderQuery.equalTo("status", "Dispatched");
        orderQuery.descending("createdAt");
        const dispatchedOrders = await orderQuery.find();
        setUnconfirmedDeliveries(dispatchedOrders);
      } catch (error) {
        console.error("Management data fetch error:", error);
      }
    }
    fetchData();
  }, []);

  // --- 4. REFRESH FUNCTIONS ---
  const refreshProducts = async () => {
    try {
      const Product = parseClient.Object.extend("Product");
      const results = await new parseClient.Query(Product).find();
      setProducts(results);
    } catch (error) {
      console.error("Product refresh error:", error);
    }
  };

  const fetchLogistics = async () => {
    try {
      const Cargo = parseClient.Object.extend("Cargo");
      const query = new parseClient.Query(Cargo);
      query.equalTo("status", "In Transit");
      query.descending("createdAt");
      const results = await query.find();
      setActiveTrucks(results);
    } catch (e) {
      console.error("Logistics fetch error:", e);
    }
  };

  // --- 5. ARRIVAL HANDLER (same cloud function as admin) ---
  const handleBulkConfirmArrival = async (cargo: any) => {
    if (!cargo) return;
    setUploading(true);

    try {
      const destCityName = cargo.get("toCity") || "";
      const destinationHub = `${destCityName} Warehouse`;

      const itemNames = cargo.get("itemNames") || [];
      const matchingProducts = products.filter((p) =>
        itemNames.includes(p.get("name")),
      );
      const productIds = matchingProducts.map((p) => p.id);

      const result = await parseClient.Cloud.run("confirmArrival", {
        productIds,
        destinationHub,
        destCityName,
      });

      console.log(`Arrival confirmed: ${result.updatedCount} products updated`);

      alert(
        `✅ SUCCESS: Arrival confirmed at ${destinationHub}. Inventory flags cleared.`,
      );

      await refreshProducts();
      await fetchLogistics();
    } catch (error: any) {
      console.error("Arrival Sync Error:", error);
      alert("Arrival Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans text-black antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] mb-2">
              Executive Control
            </p>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Management Dashboard
            </h1>
            <p className="text-gray-500 font-medium italic">
              Strategic Overview & Progress
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-lg">
              MD
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">
                System Manager
              </p>
              <button
                onClick={async () => {
                  await parseClient.User.logOut();
                  window.location.href = "/management/login";
                }}
                className="text-[9px] text-red-500 font-bold uppercase hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. USER LIST */}
          <Link href="/management/user" className="group">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full">
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl mb-6 group-hover:bg-black group-hover:text-white transition-all">
                👥
              </div>
              <h2 className="text-sm font-black uppercase mb-2">User List</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                Customer Records
              </p>
              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Open Terminal →
              </div>
            </div>
          </Link>

          {/* 2. LOGISTICS */}
          <Link href="/management/warehouse" className="group">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full border-b-4 border-b-blue-500">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-xl mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
                📈
              </div>
              <h2 className="text-sm font-black uppercase mb-2">Logistics</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                Real-time Hub Status
              </p>
              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Open Terminal →
              </div>
            </div>
          </Link>

          {/* --- ORDER MANAGER CARD WITH RED BADGE --- */}
          <Link href="/management/order" className="group relative">
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-black group-hover:text-white transition-colors">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>

                  {/* 🚩 RED NOTIFICATION BADGE */}
                  {pendingOrders > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                      <span className="text-red-600 font-black text-[10px] uppercase tracking-widest">
                        {pendingOrders} New Requests
                      </span>
                    </div>
                  )}
                </div>

                <h2 className="text-sm font-black uppercase mb-2">
                  Order Manager
                </h2>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                  Approval Queue
                </p>
              </div>

              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Open Terminal →
              </div>
            </div>
          </Link>

          {/* 4. BENEFITS */}
          <Link href="/management/benefit" className="group">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full border-b-4 border-b-emerald-500">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-xl mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                💎
              </div>
              <h2 className="text-sm font-black uppercase mb-2">Benefits</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                Efficiency & Value
              </p>
              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Open Terminal →
              </div>
            </div>
          </Link>

          {/* 5. HISTORY */}
          <Link href="/management/history" className="group">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full border-b-4 border-b-purple-500">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-xl mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
                📜
              </div>
              <h2 className="text-sm font-black uppercase mb-2">History</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                Orders & Cargo Archive
              </p>
              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Open Terminal →
              </div>
            </div>
          </Link>

          {/* 7. CHAT */}
          <Link href="/management/chat" className="group relative">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all h-full">
              {unreadCount > 0 && (
                <div className="absolute top-6 right-6 h-6 w-6 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] font-black animate-bounce shadow-lg ring-4 ring-white">
                  {unreadCount}
                </div>
              )}
              <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-xl mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                💬
              </div>
              <h2 className="text-sm font-black uppercase mb-2">Ops Chat</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">
                Internal Sync
              </p>
              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Open Terminal →
              </div>
            </div>
          </Link>
        </div>

        {/* --- ACTIVE FLEET MANIFEST SECTION --- */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 mt-10 overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-orange-500 h-2 w-2 rounded-full animate-pulse"></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1d1d1f]">
                Active Fleet Manifest
              </h3>
            </div>
          </div>

          <div className="space-y-6">
            {/* Logic: Show cargo records that are In Transit */}
            {activeTrucks.length > 0 ? (
              activeTrucks.map((cargo: any, i: number) => {
                const itemNames = cargo.get("itemNames") || [];
                const itemQtys = cargo.get("itemQtys") || [];
                const fromCity = cargo.get("fromCity") || "";
                const toCity = cargo.get("toCity") || "";

                return (
                  <div
                    key={i}
                    className="bg-[#fbfbfd] rounded-[2.5rem] p-7 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center gap-8 transition-all hover:border-blue-200 mb-4"
                  >
                    {/* 1. THE TRUCK & ITEM LIST */}
                    <div className="flex items-center gap-6 flex-1">
                      <div className="bg-white p-5 rounded-3xl shadow-sm text-4xl border border-gray-100">
                        🚚
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          🚛 {fromCity} <span className="text-blue-500">➔</span>{" "}
                          {toCity}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {itemNames.map((name: string, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm"
                            >
                              <span className="text-[10px] font-black text-[#1d1d1f]">
                                {name}
                              </span>
                              <span className="text-[7px] font-black bg-black text-white px-1.5 py-0.5 rounded ml-1">
                                {itemQtys[idx] || 0} UNITS
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBulkConfirmArrival(cargo)}
                      disabled={uploading}
                      className="bg-[#1d1d1f] text-white text-[10px] font-black px-8 py-4 rounded-2xl uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? "Confirming..." : "Confirm Arrival"}
                    </button>
                  </div>
                );
              })
            ) : (
              /* Empty State */
              <div className="text-center py-16 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.4em] mb-4">
                  No Cargo in Transit
                </p>
                <Link
                  href="/management/warehouse"
                  className="text-[9px] font-black text-blue-500 hover:underline uppercase tracking-widest"
                >
                  Go to Logistics →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* --- PENDING CUSTOMER CONFIRMATION SECTION --- */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 mt-6 overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500 h-2 w-2 rounded-full animate-pulse"></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#1d1d1f]">
                Pending Customer Confirmation
              </h3>
              <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                {unconfirmedDeliveries.length} Active
              </span>
            </div>
            <button
              onClick={async () => {
                const Order = parseClient.Object.extend("Order");
                const orderQuery = new parseClient.Query(Order);
                orderQuery.equalTo("status", "Dispatched");
                orderQuery.descending("createdAt");
                const results = await orderQuery.find();
                setUnconfirmedDeliveries(results);
              }}
              className="text-[9px] font-black text-gray-400 hover:text-black uppercase tracking-widest transition-colors"
            >
              ↻ Refresh
            </button>
          </div>

          <div className="space-y-4">
            {unconfirmedDeliveries.length > 0 ? (
              unconfirmedDeliveries.map((order: any) => {
                const dispatchedAt =
                  order.get("updatedAt") || order.get("createdAt");
                const minutesAgo = Math.floor(
                  (Date.now() - new Date(dispatchedAt).getTime()) / 60000,
                );
                const timeAgo =
                  minutesAgo < 60
                    ? `${minutesAgo}m ago`
                    : `${Math.floor(minutesAgo / 60)}h ${minutesAgo % 60}m ago`;

                return (
                  <div
                    key={order.id}
                    className="bg-[#fbfbfd] rounded-[2.5rem] p-6 border border-gray-100 shadow-sm flex items-center justify-between transition-all hover:border-amber-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="bg-amber-50 p-4 rounded-2xl text-2xl">
                        📦
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">
                          {order.get("orderNumber")
                            ? `Order #${order.get("orderNumber")}`
                            : `Order #${order.id.slice(-5).toUpperCase()}`}
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {order.get("recipientName")}
                        </p>
                        <p className="text-[10px] text-gray-400 italic truncate max-w-[250px]">
                          {order.get("itemSummary")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-lg font-black text-gray-900 tracking-tighter">
                          ${(order.get("total") || 0).toLocaleString()}
                        </p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                          Dispatched {timeAgo}
                        </p>
                      </div>
                      <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-4 py-2 rounded-full uppercase tracking-widest whitespace-nowrap">
                        Awaiting Confirmation
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.4em]">
                  All deliveries confirmed ✓
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
