"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";

interface NavbarProps {
  cartCount: number;
  onOpenBag: () => void;
  user: any | null;
  onLogout: () => void;
}

export default function Navbar({
  cartCount,
  onOpenBag,
  user,
  onLogout,
}: NavbarProps) {
  const pathname = usePathname();
  const [notifCount, setNotifCount] = useState(0);

  // --- NOTIFICATION DOT LOGIC ---
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) {
        setNotifCount(0);
        return;
      }

      try {
        const result: any = await parseClient.Cloud.run("getNotificationCount");
        setNotifCount(result.count);
      } catch (error) {
        console.error("Failed to sync notifications:", error);
      }
    };

    fetchNotifications();

    // Poll every 5 seconds for near-real-time notification delivery
    const interval = setInterval(fetchNotifications, 5000);

    // Also re-fetch immediately when the user switches back to this tab
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user, pathname]);

  const navLinks = [
    { name: "Home", href: "/user/home" },
    { name: "Store", href: "/user/frontend" },
    { name: "Support", href: "/user/support" },
  ];

  return (
    <nav className="bg-[#1d1d1f]/90 backdrop-blur-md sticky top-0 z-50 text-white border-b border-white/10">
      <div className="max-w-5xl mx-auto px-1 flex items-center h-12">
        <div className="flex items-center gap-10 h-full">
          <span className="text-lg font-bold tracking-tighter">
            Cargo<span className="font-light text-gray-400">Goo</span>
          </span>

          {/* Navigation Links */}
          <div className="hidden md:flex flex-1 justify-center items-center gap-10 h-[30px]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-[11px] uppercase tracking-widest transition-all flex items-center h-full px-1 border-b-2 ${
                    isActive
                      ? "text-white border-white font-black"
                      : "text-gray-500 border-transparent hover:text-gray-300"
                  }`}
                  style={{ marginBottom: "-1px" }}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex-1 flex justify-end items-center gap-8">
          {/* Bag Button */}
          <button
            onClick={onOpenBag}
            className="relative text-[11px] font-bold bg-white/10 px-4 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/5 flex items-center gap-1 group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white opacity-80 group-hover:opacity-100 transition-opacity"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>

            <span className="text-white">Bag</span>

            {cartCount > 0 && (
              <span className="bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black animate-in zoom-in duration-300">
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile Section */}
          <div className="flex items-center gap-4 border-l border-white/10 pl-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Link
                    href="/user/profile"
                    onClick={() => setNotifCount(0)}
                    className={`text-[10px] uppercase font-black px-2 py-1 rounded-md transition-all ${
                      pathname === "/profile"
                        ? "bg-white text-black"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    My Profile
                  </Link>

                  {/* 🚩 THE RED NOTIFICATION DOT */}
                  {notifCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 border border-[#1d1d1f] text-[9px] font-black items-center justify-center">
                        {notifCount}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-tr from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                    {user.get("username")?.[0]}
                  </div>
                  <span className="text-[11px] font-medium text-gray-300">
                    Hi, {user.get("username")}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="text-[10px] text-gray-500 hover:text-red-400 transition-colors uppercase font-black ml-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  href="/user/login"
                  className="text-[11px] font-bold text-gray-300 hover:text-white"
                >
                  Login
                </Link>
                <Link
                  href="/user/register"
                  className="text-[11px] font-bold bg-white text-black px-4 py-1.5 rounded-full hover:bg-gray-200 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
