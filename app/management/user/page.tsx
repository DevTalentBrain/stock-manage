"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function ManagerUserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const query = new parseClient.Query(parseClient.User);
        query.equalTo("role", "user");
        query.descending("createdAt");
        const results = await query.find();
        setUsers(results);
      } catch (error: any) {
        console.error("Database fetch error:", error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const fullName =
      `${u.get("name") || ""} ${u.get("surname") || ""}`.toLowerCase();
    const email = (u.get("email") || u.get("username") || "").toLowerCase();
    const phone = (u.get("phone") || "").toLowerCase();
    const search = searchQuery.toLowerCase();

    return (
      fullName.includes(search) ||
      email.includes(search) ||
      phone.includes(search)
    );
  });

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans text-[#1d1d1f] antialiased">
      <div className="max-w-6xl mx-auto">
        {/* --- HEADER --- */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.3em] mb-2">
              Corporate Directory
            </p>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              User Management
            </h1>
            <p className="text-gray-500 font-medium italic">
              Verified Customer Records
            </p>
          </div>

          <Link
            href="/management/dashboard"
            className="text-[10px] font-black bg-white border border-gray-200 text-[#1d1d1f] px-6 py-2.5 rounded-full shadow-sm hover:bg-black hover:text-white transition-all uppercase tracking-widest"
          >
            ← Dashboard
          </Link>
        </header>

        {/* --- SEARCH --- */}
        <div className="mb-8 flex justify-between items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search customers..."
              className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-6 text-xs font-medium outline-none focus:ring-2 ring-indigo-500/20 shadow-sm transition-all"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 text-[10px] uppercase font-black text-gray-400 tracking-widest border-b border-gray-100">
              <tr>
                <th className="px-10 py-8">Customer Name</th>
                <th className="px-6 py-8">Contact & Phone</th>
                <th className="px-10 py-8 text-right">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-24 text-center opacity-20 animate-pulse font-black uppercase tracking-[0.5em]"
                  >
                    Syncing Records
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="py-24 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest"
                  >
                    No customers found in registry
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-indigo-50/20 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <p className="font-black text-sm uppercase tracking-tight text-gray-800">
                        {u.get("surname")
                          ? `${u.get("name")} ${u.get("surname") || ""}`
                          : u.get("username") || "Anonymous User"}
                      </p>
                      <p className="text-[9px] font-mono text-gray-300 mt-1 uppercase tracking-tighter">
                        System ID: {u.id}
                      </p>
                    </td>
                    <td className="px-6 py-8">
                      <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-black text-black tracking-widest">
                          {u.get("phone") || "CONTACT MISSING"}
                        </p>
                        <div className="inline-flex items-center gap-2 bg-indigo-50/50 px-3 py-1 rounded-full border border-indigo-100/50 w-fit">
                          <p className="text-[10px] font-bold text-indigo-600 tracking-tight">
                            {u.get("displayEmail") || "Registry Incomplete"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <p className="text-[10px] font-bold text-gray-500 uppercase leading-relaxed max-w-[250px] ml-auto">
                        {u.get("address") || "Registry Incomplete"}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="mt-12 text-center">
          <p className="text-[9px] font-black uppercase text-gray-300 tracking-[0.3em]">
            Authorized Personnel Only • Secure Session Active
          </p>
        </footer>
      </div>
    </main>
  );
}
