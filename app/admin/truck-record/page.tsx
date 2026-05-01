"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function CargoHistoryPage() {
  const [transferLogs, setTransferLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransferLogs = async () => {
    try {
      const Delivery = parseClient.Object.extend("Deliveries");
      const query = new parseClient.Query(Delivery);
      query.equalTo("status", "Delivered");
      query.descending("updatedAt");
      const results = await query.find();
      setTransferLogs(results);
    } catch (error) {
      console.error("History Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransferLogs();
  }, []);

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans text-black antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Cargo Transfer Logs
            </h1>
            <p className="text-gray-400 text-sm italic font-medium">
              Verified Logistics Archive
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-white border border-black px-8 py-3 rounded-full hover:bg-black hover:text-white transition-all uppercase tracking-widest shadow-sm"
          >
            ← Back to Dashboard
          </Link>
        </header>

        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b">
              <tr>
                <th className="px-10 py-6">Logistics Route</th>
                <th className="px-6 py-6">Manifest & Unit Stock</th>
                <th className="px-6 py-6 text-center text-blue-500">
                  Total Load
                </th>
                <th className="px-10 py-6 text-right">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="py-20 text-center opacity-20 animate-pulse font-black uppercase"
                  >
                    Loading Logs...
                  </td>
                </tr>
              ) : (
                transferLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50/30 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <p className="font-black text-sm uppercase tracking-tight flex items-center gap-2">
                        <span className="text-xl">🚛</span>
                        {log.get("origin")}{" "}
                        <span className="text-blue-500">➔</span>{" "}
                        {log.get("destination")}
                      </p>
                      <p className="text-[9px] font-mono text-gray-300 mt-1 uppercase">
                        REF: {log.id}
                      </p>
                    </td>

                    <td className="px-6 py-8">
                      <div className="flex items-center gap-4">
                        {/* --- IMAGE STACK --- */}
                        <div className="flex -space-x-3 flex-shrink-0">
                          {log
                            .get("itemImages")
                            ?.map((url: string, i: number) => (
                              <img
                                key={i}
                                src={url}
                                className="w-10 h-10 rounded-full border-2 border-white object-cover bg-gray-50 shadow-sm"
                              />
                            ))}
                        </div>

                        {/* --- ITEM NAMES + STOCK QUANTITY --- */}
                        <div className="flex flex-wrap gap-2 max-w-[300px]">
                          {log
                            .get("itemNames")
                            ?.map((name: string, i: number) => (
                              <div
                                key={i}
                                className="flex items-center gap-1 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg"
                              >
                                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                                  {name}
                                </span>
                                {/* 🚩 UNIT STOCK BADGE */}
                                <span className="text-[7px] font-black bg-black text-white px-1.5 py-0.5 rounded ml-1">
                                  5 UNITS
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-8 text-center">
                      <div className="inline-block bg-blue-50 px-4 py-1.5 rounded-full">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                          {log.get("cargoCount") * 5} Total Units
                        </p>
                        <p className="text-[7px] font-bold text-blue-300 uppercase text-center mt-0.5">
                          {log.get("cargoCount")} Items
                        </p>
                      </div>
                    </td>

                    <td className="px-10 py-8 text-right font-bold text-gray-400">
                      <p className="text-gray-800 text-xs">
                        {new Date(log.get("updatedAt")).toLocaleDateString()}
                      </p>
                      <p className="text-[9px] font-medium opacity-50 uppercase">
                        {new Date(log.get("updatedAt")).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
