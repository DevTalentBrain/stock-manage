"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import { printInvoice } from "@/lib/invoice";
import Link from "next/link";

export default function ProfilePage() {
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Registry States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // UI States
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingInfo, setTrackingInfo] = useState<any>(null); // 🚩 NEW STATE

  useEffect(() => {
    fetchMyHistory();
  }, []);

  const fetchMyHistory = async () => {
    try {
      const currentUser = parseClient.User.current();
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setUser(currentUser);

      setFullName(currentUser.get("name") || "");
      setEmail(currentUser.get("email") || "");
      setPhone(currentUser.get("phone") || "");
      setAddress(currentUser.get("address") || "");

      const Order = parseClient.Object.extend("Order");
      const query = new parseClient.Query(Order);
      query.equalTo("user", currentUser);
      query.descending("createdAt");

      const results = await query.find();
      setMyOrders(results);
    } catch (error: any) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🚩 NEW FUNCTION: Fetch the Tracking Info from Deliveries table
  const viewOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setTrackingInfo(null); // Reset

    try {
      const DeliveryQuery = new parseClient.Query("Deliveries");
      DeliveryQuery.equalTo("order", order);
      const delivery = await DeliveryQuery.first();
      if (delivery) {
        setTrackingInfo(delivery);
      }
    } catch (error) {
      console.error("Tracking Error:", error);
    }
  };

  // 🚩 NEW: Customer confirms receipt
  const handleConfirmReceived = async () => {
    if (!selectedOrder) return;
    try {
      await parseClient.Cloud.run("confirmReceived", {
        orderId: selectedOrder.id,
      });
      alert("✅ Order marked as Complete. Thank you!");
      setSelectedOrder(null);
      fetchMyHistory(); // Refresh the list
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    try {
      user.set("name", fullName);
      user.set("email", email);
      user.set("phone", phone);
      user.set("address", address);

      const acl = new parseClient.ACL(user);
      acl.setPublicReadAccess(true);
      user.setACL(acl);

      await user.save();
      setIsEditing(false);
      alert("✅ Registry updated.");
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // 🚩 PRINT INVOICE HANDLER (uses shared utility)
  const handlePrintInvoice = () => {
    const trackingNumber = trackingInfo?.get("trackingNumber") || "";
    printInvoice(selectedOrder, trackingNumber);
  };

  const totalSpent = myOrders.reduce(
    (sum, order) => sum + (order.get("total") || 0),
    0,
  );

  useEffect(() => {
    const markNotificationsAsRead = async () => {
      if (!user) return;
      try {
        await parseClient.Cloud.run("clearNotifications");
      } catch (error) {
        console.error("Could not clear notifications:", error);
      }
    };

    markNotificationsAsRead();
  }, [user]);

  return (
    <main className="min-h-screen bg-[#f5f5f7] antialiased">
      <div className="max-w-5xl mx-auto p-6 md:p-12 text-black">
        <header className="flex justify-between items-center mb-10 pl-2">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900">
              Registry
            </h1>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
              Account: {user?.get("username")}
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SIDEBAR */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                  Cargo Manifest
                </h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-[9px] font-black uppercase text-gray-400 hover:text-black"
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              <div className="space-y-5">
                <Input
                  label="Full Name"
                  value={fullName}
                  onChange={setFullName}
                  edit={isEditing}
                />
                <Input
                  label="Phone"
                  value={phone}
                  onChange={setPhone}
                  edit={isEditing}
                />
                <div>
                  <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-2">
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none outline-none ring-1 ring-gray-100"
                    />
                  ) : (
                    <p className="text-sm font-bold px-1">
                      {address || "No address saved"}
                    </p>
                  )}
                </div>
                {isEditing && (
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isUpdating}
                    className="w-full bg-black text-white py-4 rounded-full text-[10px] font-black uppercase tracking-widest"
                  >
                    {isUpdating ? "Saving..." : "Save Registry"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#1d1d1f] rounded-[2.5rem] p-8 text-white shadow-xl">
              <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-1">
                Portfolio Value
              </p>
              <p className="text-4xl font-bold tracking-tighter">
                ${totalSpent.toLocaleString()}
              </p>
            </div>
          </div>

          {/* ORDER HISTORY */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 pl-4">
              Transaction History
            </h2>
            {myOrders.map((order) => {
              const status = order.get("status");
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:border-blue-600 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-6">
                      <span className="text-2xl">
                        {status === "Complete"
                          ? "✅"
                          : status === "Dispatched"
                            ? "📦"
                            : "🚛"}
                      </span>
                      <div>
                        <p className="text-[10px] font-black uppercase text-blue-600 mb-1">
                          {order.get("orderNumber")
                            ? `Order #${order.get("orderNumber")}`
                            : `Order #${order.id.slice(-5).toUpperCase()}`}
                        </p>
                        <p className="text-xs font-bold text-gray-500 italic truncate max-w-[200px]">
                          {order.get("itemSummary")}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-black text-gray-900 tracking-tighter">
                      ${(order.get("total") || 0).toLocaleString()}
                    </p>
                  </div>

                  {/* --- ACTION BUTTONS --- */}
                  <div className="flex gap-3 mt-2">
                    {/* CONFIRM DELIVERY — big green button for Dispatched orders */}
                    {status === "Dispatched" && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await parseClient.Cloud.run("confirmReceived", {
                              orderId: order.id,
                            });
                            alert("✅ Delivery confirmed! Thank you.");
                            fetchMyHistory();
                          } catch (err: any) {
                            alert("❌ Error: " + err.message);
                          }
                        }}
                        className="flex-1 bg-emerald-500 text-white py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/30 active:scale-95 border-2 border-emerald-400"
                      >
                        ✅ Confirm Delivery
                      </button>
                    )}

                    {/* PRINT RECEIPT — for Approved, Dispatched, or Complete orders */}
                    {status !== "Pending Approval" && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const DeliveryQuery = new parseClient.Query(
                              "Deliveries",
                            );
                            DeliveryQuery.equalTo("order", order);
                            const delivery = await DeliveryQuery.first();
                            const trackingNumber =
                              delivery?.get("trackingNumber") || "";
                            const { printInvoice } =
                              await import("@/lib/invoice");
                            printInvoice(order, trackingNumber);
                          } catch (err) {
                            console.error("Print error:", err);
                          }
                        }}
                        className="bg-blue-600 text-white py-4 px-6 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                      >
                        🖨️ Receipt
                      </button>
                    )}

                    {/* VIEW DETAILS */}
                    <button
                      onClick={() => viewOrderDetails(order)}
                      className="bg-gray-100 text-gray-800 py-4 px-6 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                    >
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* --- CARGO MODAL (UPDATED WITH TRACKING) --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-[#1c1c1e] w-full max-w-lg rounded-[3rem] p-12 shadow-2xl text-white border border-white/5 animate-in zoom-in duration-200">
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
              Order Details
            </h2>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-8">
              {selectedOrder.get("orderNumber")
                ? `#${selectedOrder.get("orderNumber")}`
                : `#${selectedOrder.id.slice(-5).toUpperCase()}`}
            </p>

            <div className="space-y-4">
              {/* Tracking ID Section (If dispatched) */}
              {trackingInfo?.get("trackingNumber") && (
                <div className="bg-blue-600 p-6 rounded-[2rem] shadow-lg shadow-blue-600/20">
                  <p className="text-[9px] font-black text-blue-100 uppercase mb-1 tracking-widest">
                    Active Tracking ID
                  </p>
                  <p className="text-lg font-black tracking-widest">
                    {trackingInfo.get("trackingNumber")}
                  </p>
                  <p className="text-[9px] font-bold text-blue-200 mt-2 italic">
                    ETA: 45 MINS FROM HUB DISPATCH
                  </p>
                </div>
              )}

              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
                <p className="text-[9px] font-black text-gray-500 uppercase mb-2 tracking-widest">
                  Inventory List
                </p>
                <p className="text-sm font-bold">
                  {selectedOrder.get("itemSummary")}
                </p>
              </div>

              <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 flex justify-between items-center">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                  Current Status
                </p>
                <p
                  className={`text-[10px] font-black uppercase px-4 py-1 rounded-full border ${
                    selectedOrder.get("status") === "Complete"
                      ? "border-emerald-500 text-emerald-500 bg-emerald-500/10"
                      : selectedOrder.get("status") === "Dispatched"
                        ? "border-green-500 text-green-500 bg-green-500/10"
                        : "border-blue-500 text-blue-500 bg-blue-500/10"
                  }`}
                >
                  {selectedOrder.get("status") === "Pending Approval"
                    ? "Pending Confirmation"
                    : selectedOrder.get("status") === "Approved"
                      ? "Payment Complete"
                      : selectedOrder.get("status") || "PENDING"}
                </p>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              {/* 🚩 CONFIRM RECEIVED BUTTON — only when Dispatched */}
              {selectedOrder.get("status") === "Dispatched" && (
                <button
                  onClick={handleConfirmReceived}
                  className="flex-1 bg-emerald-500 text-white py-6 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 active:scale-95 border-2 border-emerald-400"
                >
                  ✅ Confirm Received
                </button>
              )}

              {selectedOrder.get("status") !== "Pending Approval" &&
                selectedOrder.get("status") !== "Complete" && (
                  <button
                    onClick={handlePrintInvoice}
                    className="flex-1 bg-blue-600 text-white py-6 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl active:scale-95"
                  >
                    Print Invoice
                  </button>
                )}
              <button
                onClick={() => setSelectedOrder(null)}
                className={`${selectedOrder.get("status") !== "Pending Approval" ? "flex-1" : "w-full"} bg-white text-black py-6 rounded-full font-black uppercase text-[11px] tracking-[0.3em] hover:bg-blue-600 hover:text-white transition-all shadow-xl active:scale-95`}
              >
                Close Manifest
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Helper Sub-component
function Input({ label, value, onChange, edit }: any) {
  return (
    <div>
      <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest block mb-2">
        {label}
      </label>
      {edit ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold outline-none ring-1 ring-gray-100"
        />
      ) : (
        <p className="text-sm font-bold px-1">{value || "—"}</p>
      )}
    </div>
  );
}
