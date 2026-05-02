"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCities, CityProvider } from "@/lib/city-context";

function DashboardContent() {
  const {
    cities,
    loading: citiesLoading,
    getStockForProduct,
    refreshStock,
    productStockMap,
  } = useCities();
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeHub, setActiveHub] = useState("all");
  const [activeTrucks, setActiveTrucks] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");

  const [stats, setStats] = useState({
    totalValue: 0,
    yearlyTotal: 0,
    items: 0,
    phoneUnits: 0,
    computerUnits: 0,
    lowStockCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [yearlyData, setYearlyData] = useState<any[]>([]);
  const [supportNotifications, setSupportNotifications] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isFilterSectionVisible, setIsFilterSectionVisible] = useState(false);

  const router = useRouter();
  const prevTotalMessagesRef = useRef(0);

  // --- 1. ADMIN LOGIN SECURITY GUARD ---
  useEffect(() => {
    const checkAuth = async () => {
      const user = parseClient.User.current();
      if (!user) {
        window.location.href = "/admin/login";
        return;
      }
      try {
        await user.fetch();
        if (user.get("username") !== "admin") {
          window.location.href = "/admin/login";
        } else {
          setIsAdmin(true);
        }
      } catch (e) {
        window.location.href = "/admin/login";
      }
    };
    checkAuth();
  }, []);

  // --- 2. NOTIFICATION POLLING (FOR ADMIN DASHBOARD) ---
  useEffect(() => {
    if (!isAdmin) return;

    const fetchNotifications = async () => {
      // 1. Count User questions created after admin's last chat visit
      const lastVisit = localStorage.getItem("adminLastChatVisit");
      const userQuery = new parseClient.Query("SupportMessage");
      userQuery.equalTo("status", "Pending");
      if (lastVisit) {
        userQuery.greaterThan("createdAt", new Date(lastVisit));
      }
      const userCount = await userQuery.count();

      // 2. Count Management private messages (from InternalChat)
      const managerQuery = new parseClient.Query("InternalChat");
      managerQuery.equalTo("role", "MANAGEMENT");
      managerQuery.equalTo("isAdminRead", false);
      const managerCount = await managerQuery.count();

      setSupportNotifications(userCount + managerCount);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  // --- 3. DATA LOADING ---
  useEffect(() => {
    if (!isAdmin) return;
    async function fetchDashboardData() {
      try {
        const Product = parseClient.Object.extend("Product");
        const prodResults = await new parseClient.Query(Product).find();
        setProducts(prodResults);

        // Refresh stock data for all products and use the returned map directly
        // (avoids stale React state issue where setState hasn't taken effect yet)
        const stockMap = await refreshStock();

        let totalVal = 0,
          pSum = 0,
          cSum = 0,
          lowStock = 0;

        prodResults.forEach((p: any) => {
          const stocks = stockMap[p.id] || [];
          const totalStock = stocks.reduce((sum, s) => sum + s.stock, 0);
          const price = Number(p.get("price") || 0);
          const name = String(p.get("name") || "").toLowerCase();

          totalVal += totalStock * price;
          if (name.includes("iphone") || name.includes("phone"))
            pSum += totalStock;
          else if (
            name.includes("mac") ||
            name.includes("laptop") ||
            name.includes("computer")
          )
            cSum += totalStock;
          if (totalStock < 10) lowStock++;
        });

        const Order = parseClient.Object.extend("Order");
        const orderResults = await new parseClient.Query(Order).find();
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
        const currentYear = new Date().getFullYear();

        orderResults.forEach((order: any) => {
          const amount = Number(order.get("total")) || 0;
          const date = new Date(order.get("createdAt"));
          if (date.getFullYear() === currentYear) {
            monthlyMap[monthNames[date.getMonth()]] =
              (monthlyMap[monthNames[date.getMonth()]] || 0) + amount;
          }
          yearlyMap[date.getFullYear()] =
            (yearlyMap[date.getFullYear()] || 0) + amount;
        });

        const mChart = [];
        for (let i = 4; i >= 0; i--) {
          const name = monthNames[(new Date().getMonth() - i + 12) % 12];
          const val = monthlyMap[name] || 0;
          mChart.push({
            name,
            val,
            h: `${Math.min(Math.max((val / 10000) * 100, 10), 100)}%`,
          });
        }

        const yChart = [];
        for (let i = 4; i >= 0; i--) {
          const label = (currentYear - i).toString();
          const val = yearlyMap[label] || 0;
          yChart.push({
            name: label,
            val,
            h: `${Math.min(Math.max((val / 50000) * 100, 10), 100)}%`,
          });
        }

        // Sum all months in the current year for Total Revenue
        const yearlyRevenue = (Object.values(monthlyMap) as number[]).reduce(
          (sum, v) => sum + v,
          0,
        );

        setStats({
          totalValue: totalVal,
          yearlyTotal: yearlyRevenue,
          items: prodResults.length,
          phoneUnits: pSum,
          computerUnits: cSum,
          lowStockCount: lowStock,
        });
        setMonthlyData(mChart);
        setYearlyData(yChart);

        // Also fetch logistics data
        await fetchLogistics();
      } catch (error) {
        console.error(error);
      }
    }
    fetchDashboardData();
  }, [isAdmin]);

  // --- SMART FILTER LOGIC ---
  const filteredProducts = products.filter((p) => {
    const name = String(p.get("name") || "").toLowerCase();
    const stocks = getStockForProduct(p.id);

    const nameMatch = name.includes(searchTerm.toLowerCase());

    let itemCat = "other";
    if (name.includes("iphone") || name.includes("phone")) itemCat = "phone";
    else if (name.includes("mac") || name.includes("laptop"))
      itemCat = "computer";

    const catMatch = activeCategory === "all" || itemCat === activeCategory;

    let hubMatch = true;
    if (activeHub !== "all") {
      const city = cities.find((c) => c.id === activeHub);
      if (city) {
        const cityStock = stocks.find((s) => s.cityId === activeHub);
        hubMatch = (cityStock?.stock || 0) > 0;
      }
    }

    return nameMatch && catMatch && hubMatch;
  });

  // 2. Define a function to refresh products (for UI updates after arrival)
  const refreshProducts = async () => {
    try {
      const Product = parseClient.Object.extend("Product");
      const results = await new parseClient.Query(Product).find();
      setProducts(results);
    } catch (error) {
      console.error("Product refresh error:", error);
    }
  };

  // --- 3. LOGISTICS FETCHING (defined before arrival handler so it's available) ---
  const fetchLogistics = async () => {
    try {
      const Delivery = parseClient.Object.extend("Deliveries");
      const query = new parseClient.Query(Delivery);

      // We only want to see trucks that are currently on the road
      query.equalTo("status", "In Transit");
      query.descending("createdAt");

      const results = await query.find();
      setActiveTrucks(results); // This updates the state so the UI shows the trucks
    } catch (e) {
      console.error("Logistics fetch error:", e);
    }
  };

  // 4. Define the Arrival Handler
  const handleBulkConfirmArrival = async (items: any[]) => {
    if (items.length === 0) return;
    setUploading(true);

    try {
      // 1. Identify the destination from the items BEFORE we clear them
      const firstItemStatus = items[0]?.get("transitStatus") || "";
      // Extract destination city name from transit status (e.g. "In Transit to Kaunas")
      const destCityName = firstItemStatus.replace("In Transit to ", "").trim();
      const destinationHub = `${destCityName} Warehouse`;

      // 🚩 2. MARK PRODUCTS AS DELIVERED & CLOSE TRUCK RECORD (via cloud function with master key)
      const result = await parseClient.Cloud.run("confirmArrival", {
        productIds: items.map((item) => item.id),
        destinationHub,
        destCityName,
      });

      console.log(`Arrival confirmed: ${result.updatedCount} products updated`);

      alert(
        `✅ SUCCESS: Arrival confirmed at ${destinationHub}. Inventory flags cleared.`,
      );

      // 5. REFRESH UI — re-fetch products & deliveries to remove delivered items from listings
      await refreshProducts();
      await fetchLogistics();
    } catch (error: any) {
      console.error("Arrival Sync Error:", error);
      alert("Arrival Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const navButtons = [
    {
      name: "Warehouse",
      path: "/admin/warehouse",
      icon: "🏢",
      color: "bg-blue-500",
    },
    {
      name: "Cities",
      path: "/admin/cities",
      icon: "🏙️",
      color: "bg-teal-500",
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
      path: "/admin/chat",
      icon: "💬",
      color: "bg-red-500",
      hasBadge: supportNotifications > 0,
    },
  ];

  if (!isAdmin)
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-6 md:p-12 font-sans antialiased text-[#1d1d1f]">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Inventory Management
            </h1>
            <p className="text-gray-500 font-medium italic">Dashboard System</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 pr-6 rounded-full shadow-sm border border-gray-100">
            <div className="w-10 h-10 bg-[#1d1d1f] rounded-full flex items-center justify-center text-white text-[10px] font-black">
              AD
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-black uppercase tracking-widest">
                Administrator
              </p>
              <button
                onClick={() => {
                  parseClient.User.logOut();
                  window.location.href = "/admin/login";
                }}
                className="text-[9px] text-red-500 font-bold uppercase hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>
        {/* NAVIGATION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {navButtons.map((btn) => (
            <Link key={btn.name} href={btn.path}>
              <div className="relative bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all text-center group">
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
        {/* --- COLLAPSIBLE FILTER SECTION --- */}
        <div className="mb-8">
          {/* THE MAIN TOGGLE BUTTON */}
          <button
            onClick={() => setIsFilterSectionVisible(!isFilterSectionVisible)}
            className="w-full flex items-center justify-between bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-lg">
                🔍
              </div>
              <div className="text-left">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#1d1d1f]">
                  Inventory Search & Filters
                </h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase">
                  {isFilterSectionVisible
                    ? "Click to hide tools"
                    : "Click to expand search tools"}
                </p>
              </div>
            </div>
            <span
              className={`text-gray-300 transition-transform duration-500 ${isFilterSectionVisible ? "rotate-180" : ""}`}
            >
              ▼
            </span>
          </button>

          {/* THE COLLAPSIBLE CONTENT */}
          {isFilterSectionVisible && (
            <div className="mt-4 bg-white p-8 rounded-[2.5rem] shadow-inner border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. HUB DROPDOWN */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">
                    Select Hub
                  </label>
                  <select
                    value={activeHub}
                    onChange={(e) => setActiveHub(e.target.value)}
                    className="w-full bg-[#f5f5f7] border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none cursor-pointer hover:bg-gray-100 transition-all appearance-none"
                  >
                    <option value="all">🌍 Global (All Hubs)</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name} Hub
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. CATEGORY DROPDOWN */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">
                    Category
                  </label>
                  <select
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value)}
                    className="w-full bg-[#f5f5f7] border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none cursor-pointer hover:bg-gray-100 transition-all appearance-none"
                  >
                    <option value="all">📦 All Items</option>
                    <option value="phone">📱 iPhones</option>
                    <option value="computer">💻 MacBooks</option>
                  </select>
                </div>

                {/* 3. SEARCH INPUT */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest ml-1">
                    Quick Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search model..."
                    className="w-full bg-[#f5f5f7] border-none rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 ring-emerald-500 transition-all"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              {/* TABLE WITH INTERNAL SCROLL */}
              <div className="overflow-x-auto max-h-[350px] no-scrollbar">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50">
                      <th className="pb-4">Asset Name</th>
                      {cities.map((city) => (
                        <th key={city.id} className="pb-4">
                          {city.name}
                        </th>
                      ))}
                      <th className="pb-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProducts.map((p) => {
                      const stocks = getStockForProduct(p.id);
                      const totalStock = stocks.reduce(
                        (sum, s) => sum + s.stock,
                        0,
                      );
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 font-bold text-sm text-black">
                            {p.get("name")}
                          </td>
                          {cities.map((city) => {
                            const cityStock = stocks.find(
                              (s) => s.cityId === city.id,
                            );
                            return (
                              <td
                                key={city.id}
                                className="py-4 text-sm font-bold"
                                style={{
                                  color:
                                    city.color === "emerald"
                                      ? "#059669"
                                      : city.color === "blue"
                                        ? "#2563eb"
                                        : "#6366f1",
                                }}
                              >
                                {cityStock?.stock || 0}
                              </td>
                            );
                          })}
                          <td className="py-4 text-right font-black text-black">
                            {totalStock}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        {/* LOGISTICS MONITORING SECTION */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 mb-10 overflow-hidden">
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
              const originCode =
                cities.find((c) =>
                  origin.toLowerCase().includes(c.name.toLowerCase()),
                )?.shortCode || origin.substring(0, 3).toUpperCase();
              const destCode =
                cities.find((c) =>
                  destination.toLowerCase().includes(c.name.toLowerCase()),
                )?.shortCode || destination.substring(0, 3).toUpperCase();

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
                    className="bg-[#1d1d1f] text-white text-[10px] font-black px-8 py-4 rounded-2xl uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl active:scale-95"
                  >
                    Confirm Arrival ({items.length})
                  </button>
                </div>
              );
            })}

            {/* Empty State with History Shortcut */}
            {products.filter((p) => p.get("transitStatus")).length === 0 && (
              <div className="text-center py-16 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
                <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.4em] mb-4">
                  No Cargo in Transit
                </p>
                <Link
                  href="/admin/truck-record"
                  className="text-[9px] font-black text-blue-500 hover:underline uppercase tracking-widest"
                >
                  Check Past Delivery Records →
                </Link>
              </div>
            )}
          </div>
        </div>
        {/* BOTTOM SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h2 className="text-black text-xl font-black uppercase tracking-tight mb-8">
                Monthly Amount
              </h2>
              <div className="h-64 w-full bg-[#f5f5f7] rounded-[2.5rem] flex items-end justify-around p-8 gap-3 border border-gray-50 relative overflow-hidden">
                {monthlyData.map((data, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center flex-1 group h-full justify-end relative z-10"
                  >
                    <div className="absolute -top-2 bg-[#1d1d1f] text-white text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-2">
                      ${data.val.toLocaleString()}
                    </div>
                    <div
                      style={{ height: data.h }}
                      className="w-full max-w-[40px] bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-xl hover:to-blue-400 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
                    ></div>
                    <span className="text-[10px] font-black text-gray-400 mt-4 uppercase tracking-tighter">
                      {data.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
              <h2 className="text-black text-xl font-black uppercase tracking-tight mb-8">
                Yearly Amount
              </h2>
              <div className="h-64 w-full bg-[#f5f5f7] rounded-[2.5rem] flex items-end justify-around p-8 gap-3 border border-gray-50 relative overflow-hidden">
                {yearlyData.map((data, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center flex-1 group h-full justify-end relative z-10"
                  >
                    <div className="absolute -top-2 bg-[#1d1d1f] text-white text-[9px] font-black px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-2">
                      ${data.val.toLocaleString()}
                    </div>
                    <div
                      style={{ height: data.h }}
                      className="w-full max-w-[40px] bg-emerald-500 rounded-t-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-sm"
                    ></div>
                    <span className="text-[10px] font-black text-gray-400 mt-4 uppercase">
                      {data.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Sidebar */}
          <div className="h-[500px] bg-[#1d1d1f] p-10 py-16 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between">
            <div className="space-y-16">
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4">
                  Total Revenue
                </p>

                <h3 className="text-6xl font-black tracking-tighter">
                  ${stats.yearlyTotal.toLocaleString()}
                </h3>
              </div>

              <div className="pt-12 border-t border-white/10">
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-4">
                  Stock Asset Value
                </p>

                <h3 className="text-4xl font-black tracking-tighter text-blue-400">
                  ${stats.totalValue.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="mt-auto">
              <p className="text-xs text-gray-400 border-l-2 border-blue-500 pl-4">
                Managing{" "}
                <span className="text-white font-bold">{stats.items}</span> SKU
                units.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AdminDashboard() {
  return (
    <CityProvider>
      <DashboardContent />
    </CityProvider>
  );
}
