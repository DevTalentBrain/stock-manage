"use client";
import { useState } from "react";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ManagementLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleManagementLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await parseClient.User.logIn(username, password);

      if (
        user.get("username") === "manager" ||
        user.get("role") === "manager"
      ) {
        // 🚩 THE FIX: Wait 500ms for the session to "stick" in LocalStorage
        setTimeout(() => {
          window.location.href = "/management/dashboard";
        }, 500);
      } else {
        await parseClient.User.logOut();
        setError("Access Denied.");
        setLoading(false);
      }
    } catch (err) {
      setError("Invalid credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col justify-center items-center p-6 text-white font-sans antialiased">
      <div className="max-w-[400px] w-full bg-[#1c1c1e] p-10 rounded-[2.5rem] shadow-2xl border border-white/5">
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
            <span className="text-xl">💼</span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter">
            Management Portal
          </h1>
          <p className="text-gray-500 text-[10px] uppercase font-bold mt-2 tracking-widest">
            Corporate Logistics Control
          </p>
        </div>

        {/* Error Message Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
            <p className="text-[10px] font-black text-red-400 text-center uppercase tracking-widest">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleManagementLogin} className="space-y-4">
          <div className="bg-[#2c2c2e] rounded-2xl overflow-hidden border border-white/5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
            <input
              type="text"
              placeholder="Manager Username"
              required
              className="w-full p-4 bg-transparent outline-none text-sm border-b border-white/5 focus:bg-white/5 transition-all text-white placeholder-gray-500"
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Access Key"
              required
              className="w-full p-4 bg-transparent outline-none text-sm focus:bg-white/5 transition-all text-white placeholder-gray-500"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Enter Management System"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="text-[9px] text-gray-500 hover:text-white transition-colors uppercase font-black tracking-widest"
          >
            ← Return to Hub
          </Link>
        </div>
      </div>

      <p className="mt-8 text-[9px] text-gray-800 uppercase font-bold tracking-[0.2em]">
        Corporate Tier Security Active
      </p>
    </div>
  );
}
