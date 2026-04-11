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
    setLoading(true);
    setError(null);

    try {
      await parseClient.User.logIn(username, password);

      // FORCE a hard reload to the home page
      window.location.href = "frontent";
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p- text-[#1d1d1f]">
      <div className=" max-w-[400px] bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Sign In.</h1>
          <p className="text-gray-500 text-sm mt-2">
            Manage your bag and orders.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Grouped Input Block */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <input
              type="text"
              placeholder="Username"
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-[#f5f5f7] transition-all"
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-4 bg-white outline-none focus:bg-[#f5f5f7] transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="w-full bg-[#1d1d1f] text-white py-4 rounded-full font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg">
            Continue
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Don't have an Apple ID?{" "}
            <Link
              href="/register"
              className="text-[#0066cc] hover:underline font-semibold"
            >
              Create one now.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
