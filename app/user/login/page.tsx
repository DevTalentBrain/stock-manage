"use client";
import { useState } from "react";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Start loading animation
    setError(null);

    try {
      const user = await parseClient.User.logIn(username, password);

      // SECURITY CHECK: Kick 'admin' out of the Customer Portal
      if (user.get("username") === "admin") {
        await parseClient.User.logOut(); // Clear the session
        setError("Staff detected. Please use the Admin Login page.");
        setLoading(false); // Stop loading so they can try a different account
        return;
      }

      window.location.href = "/user/frontend";
    } catch (err: any) {
      setError("Invalid credentials.");
      setLoading(false); // Stop loading so they can try again
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-6 text-[#1d1d1f]">
      <div className="max-w-[400px] w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Sign In.</h1>
          <p className="text-gray-500 text-sm mt-2">
            Manage your bag and orders.
          </p>
        </div>

        {/* --- ERROR DISPLAY BLOCK --- */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[10px] font-black text-red-600 text-center uppercase tracking-widest">
              {error}
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Grouped Input Block */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-[#0066cc]/20 transition-all">
            <input
              type="text"
              placeholder="Username"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-[#f5f5f7] transition-all text-sm font-medium"
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full p-4 bg-white outline-none focus:bg-[#f5f5f7] transition-all text-sm font-medium"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1d1d1f] text-white py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 font-medium">
            Don't have an ID?{" "}
            <Link
              href="/user/register"
              className="text-[#0066cc] hover:underline font-bold"
            >
              Create one now.
            </Link>
          </p>
        </div>
      </div>

      {/* Subtle Admin Link for testing (optional) */}
      <div className="mt-8">
        <Link
          href="/admin/login"
          className="text-[10px] text-gray-400 uppercase font-bold tracking-widest hover:text-gray-600 transition-colors"
        >
          Staff Portal Access
        </Link>
      </div>
    </div>
  );
}
