"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import Navbar from "@/app/frontent/navbar";

export default function ProfilePage() {
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile Update States
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchMyHistory = async () => {
      try {
        const currentUser = parseClient.User.current();
        if (!currentUser) {
          setLoading(false);
          return;
        }
        setUser(currentUser);
        setEmail(currentUser.get("email") || "");
        setPhone(currentUser.get("phone") || "");

        const Order = parseClient.Object.extend("Order");
        const query = new parseClient.Query(Order);
        query.equalTo("user", currentUser);
        query.descending("createdAt");

        const results = await query.find();
        setMyOrders(results);
      } catch (error: any) {
        if (error.code === 209) {
          handleLogout();
        }
        console.error("Error fetching personal history:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyHistory();
  }, []);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      // 1. Update the User Object
      user.set("email", email);
      user.set("phone", phone);
      await user.save();

      // 2. Sync with Support Registry (To fix Admin "Unknown User" issue)
      const SupportProfile = parseClient.Object.extend("SupportProfile");
      const profileQuery = new parseClient.Query(SupportProfile);
      profileQuery.equalTo("user", user);
      let profile = await profileQuery.first();

      if (!profile) {
        profile = new SupportProfile();
        profile.set("user", user);
      }

      profile.set("username", user.get("username"));
      profile.set("email", email);
      profile.set("phone", phone);

      // Set Public Read so Admin Messenger can see the name
      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true);
      acl.setWriteAccess(user.id, true);
      profile.setACL(acl);

      await profile.save();

      alert("Registry updated successfully.");
    } catch (error: any) {
      if (error.code === 209) {
        alert("Session expired. Please log in again.");
        handleLogout();
      } else {
        alert("Error: " + error.message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await parseClient.User.logOut();
    window.location.href = "/";
  };

  const totalSpent = myOrders.reduce(
    (sum, order) => sum + (order.get("total") || 0),
    0,
  );
  const totalItemsCount = myOrders.length;

  if (!user && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5f7]">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">
          Unauthorized Access
        </p>
        <Link
          href="/"
          className="bg-black text-white px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest"
        >
          Return to Store
        </Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f5f7] antialiased">
      <Navbar
        cartCount={0}
        user={user}
        onOpenBag={() => {}}
        onLogout={handleLogout}
      />

      <div className="max-w-5xl mx-auto p-6 md:p-12">
        <header className="flex justify-between items-center mb-10 pl-2">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900">
              Registry
            </h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
              Account: {user?.get("username")}
            </p>
          </div>
          <Link
            href="frontent"
            className="text-[10px] font-black bg-white text-black border border-gray-200 px-6 py-3 rounded-full shadow-sm hover:border-black transition-all uppercase tracking-widest active:scale-95"
          >
            ← Back to Store
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-8">
                Stockholder Details
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-2">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <button
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  className="w-full bg-black text-white py-4 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors disabled:bg-gray-200"
                >
                  {isUpdating ? "Syncing..." : "Update Registry"}
                </button>
              </div>
            </div>

            <div className="bg-[#1d1d1f] rounded-[2.5rem] p-8 text-white shadow-xl">
              <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">
                Portfolio Value
              </p>
              <p className="text-4xl font-bold tracking-tighter">
                ${totalSpent.toLocaleString()}
              </p>
              <div className="mt-8 pt-8 border-t border-white/10">
                <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">
                  Total Acquisitions
                </p>
                <p className="text-xl font-bold">{totalItemsCount} Orders</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 pl-4">
              Transaction History
            </h2>

            {loading ? (
              <div className="py-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest animate-pulse">
                Accessing Ledger...
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.length > 0 ? (
                  myOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-[2rem] p-6 border border-gray-100 flex items-center justify-between group hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <div className="flex -space-x-6 group-hover:-space-x-2 transition-all duration-500">
                          {order
                            .get("itemImages")
                            ?.slice(0, 3)
                            .map((url: string, i: number) => (
                              <img
                                key={i}
                                src={url}
                                className="h-14 w-14 object-contain bg-white rounded-xl border border-gray-100 p-1 ring-4 ring-white shadow-sm"
                                alt="stock"
                              />
                            ))}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-1">
                            {new Date(order.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-xs font-bold text-gray-500 italic truncate max-w-[180px]">
                            {order.get("itemSummary")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-gray-900 tracking-tighter">
                          ${(order.get("total") || 0).toLocaleString()}
                        </p>
                        <span className="text-[8px] font-black uppercase text-green-500 tracking-[0.2em] bg-green-50 px-2 py-0.5 rounded">
                          Verified
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-[3rem] p-20 text-center border border-dashed border-gray-200">
                    <p className="text-[10px] font-black uppercase text-gray-300 tracking-widest">
                      Ledger is empty.
                    </p>
                    <Link
                      href="/"
                      className="text-blue-600 font-black uppercase text-[10px] mt-4 inline-block tracking-widest"
                    >
                      Start Acquisition →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
