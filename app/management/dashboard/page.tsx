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
  const [uploading, setUploading] = useState(false);

  const router = useRouter();

  const fetchNotificationData = async () => {
    try {
      const Order = parseClient.Object.extend("Order");
      const query = new parseClient.Query(Order);
      query.equalTo("status", "Pending Approval");
      const count = await query.count();
      setPendingOrders(count);
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

  // --- 3. DATA LOADING (Products + Logistics) ---
  useEffect(() => {
    async function fetchData() {
      try {
        const Product = parseClient.Object.extend("Product");
        const prodResults = await new parseClient.Query(Product).find();
        setProducts(prodResults);

        const Delivery = parseClient.Object.extend("Deliveries");
        const deliveryQuery = new parseClient.Query(Delivery);
        deliveryQuery.equalTo("status", "In Transit");
        deliveryQuery.descending("createdAt");
        const truckResults = await deliveryQuery.find();
        setActiveTrucks(truckResults);
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
      const Delivery = parseClient.Object.extend("Deliveries");
      const query = new parseClient.Query(Delivery);
      query.equalTo("status", "In Transit");
      query.descending("createdAt");
      const results = await query.find();
      setActiveTrucks(results);
    } catch (e) {
      console.error("Logistics fetch error:", e);
    }
  };

  // --- 5. ARRIVAL HANDLER (same cloud function as admin) ---
  const handleBulkConfirmArrival = async (items: any[]) => {
    if (items.length === 0) return;
    setUploading(true);

    try {
      const firstItemStatus = items[0]?.get("transitStatus") || "";
      const destCityName = firstItemStatus.replace("In Transit to ", "").trim();
      const destinationHub = `${destCityName} Warehouse`;

      const result = await parseClient.Cloud.run("confirmArrival", {
        productIds: items.map((item) => item.id),
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

          {/* 5. CHAT */}
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
            {/* Logic: Group items by their transit status string */}
            {(
              Object.entries(
                products.reduce(
                  (acc, p) => {
                    const status = p.get("transitStatus");
                    if (status) {
                      if (!acc[status]) acc[status] = [];
                      acc[status].push(p);
                    }
                    return acc;
                  },
                  {} as Record<string, any[]>,
                ),
              ) as [string, any[]][]
            ).map(([status, items], i) => {
              // Find matching truck record to get origin/destination info
              const truck = activeTrucks.find((t) => {
                const dest = t.get("destination") || "";
                return (
                  status
                    .toLowerCase()
                    .includes(dest.toLowerCase().replace(" warehouse", "")) ||
                  status.includes(t.get("toCityName") || "")
                );
              });
              const origin =
                truck?.get("origin")?.replace(" Hub", "") ||
                status.replace("In Transit to ", "");
              const destination =
                truck?.get("destination")?.replace(" Warehouse", "") ||
                status.replace("In Transit to ", "");
              const originCode = origin.substring(0, 3).toUpperCase();
              const destCode = destination.substring(0, 3).toUpperCase();

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
                        {origin} ➔ {destination}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {items.map((item: any, idx: number) => {
                          // Look up actual quantity from truck record's itemQtys array
                          const itemNames = truck?.get("itemNames") || [];
                          const itemQtys = truck?.get("itemQtys") || [];
                          const nameIdx = itemNames.indexOf(item.get("name"));
                          const qty = nameIdx >= 0 ? itemQtys[nameIdx] : "?";
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm"
                            >
                              <span className="text-[10px] font-black text-[#1d1d1f]">
                                {item.get("name")}
                              </span>
                              <span className="text-[8px] font-black bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                                x{qty}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 2. PROGRESS BAR & ACTION */}
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <span className="text-[9px] font-black text-blue-500">
                      {originCode}
                    </span>
                    <div className="w-32 h-1 bg-gray-200 rounded-full relative overflow-hidden">
                      <div className="absolute top-0 bottom-0 bg-blue-500 transition-all duration-1000 left-1/2 right-0"></div>
                    </div>
                    <span className="text-[9px] font-black text-emerald-500">
                      {destCode}
                    </span>
                  </div>

                  <button
                    onClick={() => handleBulkConfirmArrival(items)}
                    disabled={uploading}
                    className="bg-[#1d1d1f] text-white text-[10px] font-black px-8 py-4 rounded-2xl uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading
                      ? "Confirming..."
                      : `Confirm Arrival (${items.length})`}
                  </button>
                </div>
              );
            })}

            {/* Empty State */}
            {products.filter((p) => p.get("transitStatus")).length === 0 && (
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
      </div>
    </main>
  );
}
