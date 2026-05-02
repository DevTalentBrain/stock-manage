"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
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

  const handleApprove = async (orderId: string) => {
    if (!orderId) return;
    setIsProcessing(true);

    try {
      // 1. Fetch the Order (The link to the User)
      const OrderQuery = new parseClient.Query("Order");
      const actualOrder = await OrderQuery.get(orderId);

      // 2. Fetch or Prepare the Delivery Manifest
      const deliveryQuery = new parseClient.Query("Deliveries");
      deliveryQuery.equalTo("orderId", orderId);
      const existingDelivery = await deliveryQuery.first();

      // 🚩 THE FIX: Guarantee that 'finalDelivery' is a real object
      let finalDelivery: any;

      if (!existingDelivery) {
        const Deliveries = parseClient.Object.extend("Deliveries");
        const newDelivery = new Deliveries();

        newDelivery.set("orderId", orderId);

        const acl = new parseClient.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(true);
        newDelivery.setACL(acl);

        finalDelivery = newDelivery;
      } else {
        finalDelivery = existingDelivery;
      }

      // 🚩 3. EXECUTE UPDATES
      // Now TypeScript knows 'finalDelivery' is NOT undefined
      const trackingNo =
        "TRK-" + Math.random().toString(36).toUpperCase().slice(2, 10);

      finalDelivery.set("status", "Dispatched");
      finalDelivery.set("trackingNumber", trackingNo);

      // Save Manifest
      await finalDelivery.save();

      // Update Order Status (This triggers the Notification in User's Navbar)
      actualOrder.set("status", "Dispatched");
      await actualOrder.save();

      // 4. UI SUCCESS ACTIONS
      alert("🚛 Manifest Finalized and User notified.");
      setSelectedOrder(null); // This closes the Inspect modal
      fetchOrders(); // Refreshes the manager list
    } catch (error: any) {
      console.error("DISPATCH ERROR:", error);
      alert("Dispatch Error: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- 🚩 INVOICE GENERATOR FUNCTION ---
  const printInvoice = (order: any) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Split the itemSummary string into an array for a cleaner table look
    const rawSummary = order.get("itemSummary") || "";
    const itemsArray = rawSummary.split(",").map((item: string) => item.trim());

    printWindow.document.write(`
      <html>
        <head>
          <title>Manifest - ${order.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 60px; color: #1d1d1f; line-height: 1.4; }
            .header { border-bottom: 8px solid #000; padding-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }
            .logo-text { margin: 0; font-size: 42px; font-weight: 900; letter-spacing: -2.5px; line-height: 1; }
            .sub-logo { margin: 5px 0 0 0; font-weight: 700; font-size: 11px; color: #86868b; text-transform: uppercase; letter-spacing: 2px; }
            .meta-box { text-align: right; }
            .barcode { font-family: 'Courier', monospace; font-size: 18px; font-weight: bold; background: #000; color: #fff; padding: 5px 15px; display: inline-block; margin-bottom: 10px; }
            .content { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
            .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #86868b; border-bottom: 1px solid #f5f5f7; padding-bottom: 8px; margin-bottom: 15px; letter-spacing: 1px; }
            .address-block { font-size: 15px; font-weight: 600; }
            .address-block strong { display: block; font-size: 18px; margin-bottom: 5px; color: #000; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 50px; }
            .items-table th { text-align: left; font-size: 10px; text-transform: uppercase; padding: 15px; background: #000; color: #fff; }
            .items-table td { padding: 15px; border-bottom: 1px solid #f5f5f7; font-weight: 700; font-size: 14px; }
            .total-row { background: #f5f5f7; }
            .total-label { text-transform: uppercase; font-size: 10px; font-weight: 900; padding-right: 15px; }
            .total-amount { font-size: 22px; font-weight: 900; color: #000; }
            .footer { margin-top: 80px; padding-top: 20px; border-top: 1px solid #f5f5f7; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #86868b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="logo-text">CARGO HUB</h1>
              <p class="sub-logo">Global Logistics Registry</p>
            </div>
            <div class="meta-box">
              <div class="barcode">${order.id.toUpperCase()}</div>
              <p style="margin:0; font-size: 12px; font-weight: 700;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="content">
            <div>
              <div class="section-title">Consignee (Recipient)</div>
              <div class="address-block">
                <strong>${order.get("recipientName")}</strong>
                ${order.get("address")}<br>
                TEL: ${order.get("phone")}
              </div>
            </div>
            <div>
              <div class="section-title">Shipping Information</div>
              <div class="address-block">
                <strong>Hub Dispatch</strong>
                Status: ${order.get("status") || "Pending Approval"}<br>
                Origin: ${order.get("cities")?.join(", ") || "Main"} Logistics Hub
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Inventory Item Description</th>
                <th style="text-align: right;">Quantity Check</th>
              </tr>
            </thead>
            <tbody>
              ${
                itemsArray.length > 0 && itemsArray[0] !== ""
                  ? itemsArray
                      .map(
                        (item: any) => `
                  <tr>
                    <td>${item.split(" x")[0]}</td>
                    <td style="text-align: right;">x${item.split(" x")[1] || "1"}</td>
                  </tr>
                `,
                      )
                      .join("")
                  : `<tr><td colspan="2" style="color:#ccc; font-style:italic;">General Cargo Payload (No specific items listed)</td></tr>`
              }
              <tr class="total-row">
                <td class="total-label" style="text-align: right;">Manifest Declared Value</td>
                <td style="text-align: right;" class="total-amount">$${(order.get("total") || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <div>Auth ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
            <div>© 2026 Cargo Hub Inventory Systems</div>
            <div>Generated: ${new Date().toLocaleTimeString()}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    // Short delay to ensure styles load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
                    #{order.id.slice(-6).toUpperCase()}
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
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {order.get("status") || "Pending"}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right flex items-center justify-end gap-3">
                    {/* 🚩 PRINT INVOICE BUTTON */}
                    <button
                      onClick={() => printInvoice(order)}
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

                    {order.get("status") !== "Dispatched" ? (
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
                  Order #{selectedOrder.id.toUpperCase()}
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
              <button
                onClick={() => handleApprove(selectedOrder.id)}
                disabled={isProcessing}
                className="flex-[2] py-5 rounded-full font-black uppercase text-[10px] tracking-widest bg-black text-white hover:bg-green-600 transition-all shadow-xl"
              >
                {isProcessing ? "Transmitting..." : "Confirm & Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
