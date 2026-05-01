"use client";
import { useState } from "react";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await parseClient.User.logOut();
      localStorage.clear();
      const user = new parseClient.User();

      // 1. DATA FIELDS
      user.set("username", username);
      user.set("email", email);
      user.set("displayEmail", email);
      user.set("password", password);
      user.set("name", name);
      user.set("surname", surname);
      user.set("phone", phone);
      user.set("address", address);
      user.set("role", "user");

      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true);
      user.setACL(acl);

      // 3. SIGN UP
      await user.signUp();

      alert("✅ Account created successfully!");
      router.push("/login");
    } catch (error: any) {
      if (error.code === 209) {
        localStorage.clear();
        alert(
          "Session refreshed. Please try clicking 'Create Account' one more time.",
        );
      } else {
        console.error("Registration Error:", error);
        alert("Error: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-6 text-[#1d1d1f]">
      <div className="max-w-[420px] w-full bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black italic uppercase italic">
            Register.
          </h1>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-2">
            Inventory System Registry
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
            <input
              type="text"
              placeholder="Username"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-gray-50 transition-all text-sm"
              onChange={(e) => setUsername(e.target.value)}
            />

            <div className="flex border-b border-gray-100">
              <input
                type="text"
                placeholder="Name"
                required
                className="w-1/2 p-4 bg-white border-r border-gray-100 outline-none focus:bg-gray-50 transition-all text-sm"
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Surname"
                required
                className="w-1/2 p-4 bg-white outline-none focus:bg-gray-50 transition-all text-sm"
                onChange={(e) => setSurname(e.target.value)}
              />
            </div>

            <input
              type="email"
              placeholder="Email"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-gray-50 transition-all text-sm"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Phone"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-gray-50 transition-all text-sm"
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              type="text"
              placeholder="Country / Address"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-gray-50 transition-all text-sm"
              onChange={(e) => setAddress(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full p-4 bg-white outline-none focus:bg-gray-50 transition-all text-sm"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1d1d1f] text-white py-5 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg disabled:opacity-50 mt-4"
          >
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link
            href="/user/login"
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
          >
            Already registered? Login here.
          </Link>
        </div>
      </div>
    </div>
  );
}
