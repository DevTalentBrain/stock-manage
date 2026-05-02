/**
 * Shared invoice printing utility.
 * Opens a new window with a styled printable invoice for the given order.
 *
 * @param order - The Parse Order object
 * @param trackingNumber - Optional tracking number from Deliveries table
 */
export function printInvoice(order: any, trackingNumber?: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const rawSummary = order.get("itemSummary") || "";
  const itemsArray = rawSummary.split(",").map((item: string) => item.trim());

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${order.id}</title>
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
            <div class="barcode">${order.get("orderNumber") || order.id.toUpperCase()}</div>
            <p style="margin:0; font-size: 12px; font-weight: 700;">Order: ${order.get("orderNumber") || order.id.toUpperCase()}</p>
            <p style="margin:0; font-size: 12px; font-weight: 700; margin-top: 4px;">Date: ${new Date().toLocaleDateString()}</p>
            ${
              trackingNumber
                ? `<p style="margin:0; font-size: 12px; font-weight: 700; margin-top: 4px; color: #2563eb;">Tracking: ${trackingNumber}</p>`
                : ""
            }
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
  setTimeout(() => {
    printWindow.print();
  }, 500);
}
