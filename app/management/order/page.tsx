"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import { printInvoice } from "@/lib/invoice";
import Link from "next/link";

export default function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null); // For Pick List Modal
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchOrders = async () => {
    try {
      const Order = parseClient.Object.extend("Order");
      const query = new parseClient.Query(Order);
      query.descending("createdAt");
      const results = await query.find();
      setOrders(results);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleConfirmPayment = async (orderId: string) => {
    if (!orderId) return;
    setIsProcessing(true);

    try {
      const OrderQuery = new parseClient.Query("Order");
      const actualOrder = await OrderQuery.get(orderId);
      actualOrder.set("status", "Approved");
      await actualOrder.save();

      alert("✅ Payment confirmed. Order is now Approved.");
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error("PAYMENT CONFIRM ERROR:", error);
      alert("Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDispatch = async (orderId: string) => {
    if (!orderId) return;
    setIsProcessing(true);

    try {
      // 1. Fetch the Order
      const OrderQuery = new parseClient.Query("Order");
      const actualOrder = await OrderQuery.get(orderId);

      // 2. Deduct stock from CityStock using stored allocations
      const stockAllocations = actualOrder.get("stockAllocations");
      if (Array.isArray(stockAllocations) && stockAllocations.length > 0) {
        const CityStock = parseClient.Object.extend("CityStock");
        const ProductRef = parseClient.Object.extend("Product");
        const CityRef = parseClient.Object.extend("City");

        for (const alloc of stockAllocations) {
          try {
            const productPtr = ProductRef.createWithoutData(alloc.productId);
            const cityPtr = CityRef.createWithoutData(alloc.cityId);

            const query = new parseClient.Query(CityStock);
            query.equalTo("product", productPtr);
            query.equalTo("city", cityPtr);
            const stockEntry = await query.first();

            if (stockEntry) {
              const currentStock = stockEntry.get("stock") || 0;
              stockEntry.set("stock", Math.max(0, currentStock - alloc.qty));
              await stockEntry.save();
            }
          } catch (err) {
            console.warn("Stock deduction failed for allocation:", alloc, err);
          }
        }
      }

      // 3. Fetch or Prepare the Delivery Manifest
      const deliveryQuery = new parseClient.Query("Deliveries");
      deliveryQuery.equalTo("order", actualOrder);
      const existingDelivery = await deliveryQuery.first();

      let finalDelivery: any;

      if (!existingDelivery) {
        const Deliveries = parseClient.Object.extend("Deliveries");
        const newDelivery = new Deliveries();
        newDelivery.set("order", actualOrder);

        const acl = new parseClient.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(true);
        newDelivery.setACL(acl);

        finalDelivery = newDelivery;
      } else {
        finalDelivery = existingDelivery;
      }

      const trackingNo =
        "TRK-" + Math.random().toString(36).toUpperCase().slice(2, 10);

      finalDelivery.set("status", "Dispatched");
      finalDelivery.set("trackingNumber", trackingNo);
      await finalDelivery.save();

      // Update Order Status
      actualOrder.set("status", "Dispatched");
      await actualOrder.save();

      alert("🚛 Manifest Finalized and User notified.");
      setSelectedOrder(null);
      fetchOrders();
    } catch (error: any) {
      console.error("DISPATCH ERROR:", error);
      alert("Dispatch Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 🚩 INVOICE HANDLER (fetches tracking, then uses shared utility) ---
  const handlePrintInvoice = async (order: any) => {
    let trackingNumber = "";
    try {
      const deliveryQuery = new parseClient.Query("Deliveries");
      deliveryQuery.equalTo("order", order);
      const delivery = await deliveryQuery.first();
      if (delivery) {
        trackingNumber = delivery.get("trackingNumber") || "";
      }
    } catch (e) {
      console.error("Could not fetch tracking info:", e);
    }
    printInvoice(order, trackingNumber);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-12 text-black antialiased font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">
              Dispatch Control
            </h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
              Warehouse Management System
            </p>
          </div>
          <Link
            href="/management/dashboard"
            className="text-[10px] font-black bg-white border border-gray-200 px-6 py-2 rounded-full uppercase tracking-widest hover:bg-gray-50 transition-all"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-[10px] uppercase font-black text-gray-400 tracking-widest">
                <th className="px-8 py-5">Order ID</th>
                <th className="px-6 py-5">Recipient</th>
                <th className="px-6 py-5">Total Value</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-8 py-5 text-right">Fulfillment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50/30 transition-all group"
                >
                  <td className="px-8 py-5 font-bold text-blue-600 text-sm">
                    {order.get("orderNumber")
                      ? `#${order.get("orderNumber")}`
                      : `#${order.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold">
                      {order.get("recipientName")}
                    </p>
                    <p className="text-[10px] text-gray-400 italic truncate max-w-[150px]">
                      {order.get("address")}
                    </p>
                  </td>
                  <td className="px-6 py-5 font-black text-sm">
                    ${(order.get("total") || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        order.get("status") === "Dispatched"
                          ? "bg-green-100 text-green-600"
                          : order.get("status") === "Complete"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {order.get("status") === "Pending Approval"
                        ? "Pending Confirmation"
                        : order.get("status") === "Approved"
                          ? "Payment Complete"
                          : order.get("status") || "Pending"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                    {/* 🚩 PRINT INVOICE BUTTON */}
                    <button
                      onClick={() => handlePrintInvoice(order)}
                      className="p-2 text-gray-300 hover:text-black transition-colors"
                      title="Print Invoice"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                        />
                      </svg>
                    </button>

                    {order.get("status") === "Complete" ? (
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        Complete{" "}
                        <svg
                          className="w-3 h-3 text-emerald-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    ) : order.get("status") !== "Dispatched" ? (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-black text-white px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-lg shadow-black/5"
                      >
                        Inspect
                      </button>
                    ) : (
                      <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
                        Dispatched{" "}
                        <svg
                          className="w-3 h-3 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PICK LIST MODAL --- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                  Cargo Manifest
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                  {selectedOrder.get("orderNumber")
                    ? `Order #${selectedOrder.get("orderNumber")}`
                    : `Order #${selectedOrder.id.toUpperCase()}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-300 hover:text-black font-black text-xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[9px] font-black uppercase text-gray-400 mb-2">
                  Ship To:
                </p>
                <p className="font-bold text-sm leading-relaxed">
                  {selectedOrder.get("recipientName")}
                  <br />
                  {selectedOrder.get("address")}
                  <br />
                  {selectedOrder.get("phone")}
                </p>
              </div>
              <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-[9px] font-black uppercase text-gray-400 mb-2">
                  Inventory Summary:
                </p>
                <p className="font-bold text-sm italic">
                  {selectedOrder.get("itemSummary") || "No summary available"}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-gray-100"
              >
                Cancel
              </button>
              {selectedOrder.get("status") === "Complete" ? (
                <div className="flex-[2] py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  ✅ Complete
                </div>
              ) : selectedOrder.get("status") === "Pending Approval" ? (
                <button
                  onClick={() => handleConfirmPayment(selectedOrder.id)}
                  disabled={isProcessing}
                  className="flex-[2] py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-black text-white hover:bg-blue-600 transition-all shadow-xl"
                >
                  {isProcessing ? "Processing..." : "Confirm Payment"}
                </button>
              ) : (
                <button
                  onClick={() => handleDispatch(selectedOrder.id)}
                  disabled={isProcessing}
                  className="flex-[2] py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-black text-white hover:bg-green-600 transition-all shadow-xl"
                >
                  {isProcessing ? "Transmitting..." : "Confirm & Dispatch"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
