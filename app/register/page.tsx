"use client";
import { useState } from "react";
import parseClient from "@/lib/parse-client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = new parseClient.User();
      user.set("username", username);
      user.set("email", email);
      user.set("password", password);

      // --- AUTOMATIC PERMISSION FIX ---
      // This sets the rule BEFORE the user is even created
      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true);
      user.setACL(acl);
      // --------------------------------

      await user.signUp();

      // This part ensures the user can still edit their own profile later
      const currentUser = parseClient.User.current();
      if (currentUser) {
        const secureAcl = new parseClient.ACL(currentUser);
        secureAcl.setPublicReadAccess(true); // Admin can read
        secureAcl.setWriteAccess(currentUser.id!, true); // User can write
        currentUser.setACL(secureAcl);
        await currentUser.save();
      }

      alert("✅ Account created successfully!");
      window.location.href = "/";
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center items-center p-6 text-[#1d1d1f]">
      <div className="max-w-[400px] bg-white p-10 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Create Account.</h1>
          <p className="text-gray-500 text-sm mt-2">
            Join the iPhone Store community.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <input
              type="text"
              placeholder="Username"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-[#f5f5f7] transition-all"
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              className="w-full p-4 bg-white border-b border-gray-100 outline-none focus:bg-[#f5f5f7] transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full p-4 bg-white outline-none focus:bg-[#f5f5f7] transition-all"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1d1d1f] text-white py-4 rounded-full font-bold hover:opacity-90 transition-all active:scale-95 shadow-lg disabled:opacity-50"
          >
            {loading ? "Creating..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#0066cc] hover:underline font-semibold"
            >
              Login now.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
