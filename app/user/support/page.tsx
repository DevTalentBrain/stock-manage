"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import Navbar from "@/app/user/frontend/navbar";

export default function UserSupport() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevHistoryRef = useRef<number>(0);

  // --- 1. ENHANCED SESSION & SYNC ---
  useEffect(() => {
    const user = parseClient.User.current();
    if (user) {
      setCurrentUser(user);
      fetchChatHistory(user);

      // Live Polling every 4 seconds
      const interval = setInterval(() => fetchChatHistory(user), 4000);
      return () => clearInterval(interval);
    }
  }, []);

  // --- 2. AUTO-SCROLL & NOTIFICATION LOGIC ---
  useEffect(() => {
    // Detect new replies from Management
    const currentReplies = chatHistory.filter((m) =>
      m.get("adminReply"),
    ).length;

    if (
      currentReplies > prevHistoryRef.current &&
      prevHistoryRef.current !== 0
    ) {
      playNotifySound();
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    }
    prevHistoryRef.current = currentReplies;

    // Smooth scroll to latest message
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [chatHistory]);

  const playNotifySound = () => {
    const audio = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
    );
    audio.play().catch(() => console.warn("Sound blocked by browser"));
  };

  // --- 3. DATA FETCHING ---
  async function fetchChatHistory(user: any) {
    const SupportMessage = parseClient.Object.extend("SupportMessage");
    const query = new parseClient.Query(SupportMessage);

    query.equalTo("user", user);
    // 🚩 ONLY show messages intended for the customer
    query.notEqualTo("status", "INTERNAL");

    query.ascending("createdAt");
    const results = await query.find();
    setChatHistory(results);
  }

  // --- 4. OPTIMIZED MESSAGE SENDING ---
  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;

    const user = parseClient.User.current();
    if (!user) {
      alert("Session expired. Please log out and log back in.");
      return;
    }

    setIsSending(true);

    try {
      const SupportMessage = parseClient.Object.extend("SupportMessage");
      const msg = new SupportMessage();

      // 🚩 Ensure we are sending a clean string
      msg.set("message", String(message).trim());
      msg.set("status", "Pending");
      msg.set("user", user);
      msg.set("isManagerRead", false);

      // 🚩 Explicitly set the ACL to allow the Manager to reply
      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(true);
      msg.setACL(acl);

      await msg.save();

      setMessage(""); // Clear input
      fetchChatHistory(user); // Refresh list
    } catch (error: any) {
      console.error("User Send Error:", error);
      // If you see "Permission Denied" here, it's a Session issue
      alert(`Error: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };
  const formatTime = (date: any) => {
    if (!date) return "Sending...";
    return new Date(date).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-sans antialiased text-black">
      {/* Toast Notification */}
      {showNotification && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right fade-in duration-500">
          <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg">
              📩
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-indigo-600">
                Update
              </p>
              <p className="text-xs font-bold text-gray-800">
                Management has replied.
              </p>
            </div>
          </div>
        </div>
      )}

      <Navbar
        cartCount={0}
        onOpenBag={() => {}}
        user={currentUser}
        onLogout={() => {}}
      />

      <div className="max-w-6xl mx-auto p-6 md:p-12">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">
              Support Hub
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2 italic">
              Direct Logistics Assistance
            </p>
          </div>
          <div className="hidden md:flex gap-4">
            <div className="text-right">
              <p className="text-[9px] font-black text-gray-400 uppercase">
                System Status
              </p>
              <p className="text-[10px] font-bold text-green-500 uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>{" "}
                Encrypted & Active
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Status Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
              <h3 className="text-[10px] font-black uppercase text-indigo-600 mb-6 tracking-[0.2em]">
                Regional Hubs
              </h3>
              <div className="space-y-4">
                {["Kaunas Warehouse", "Vilnius Warehouse"].map((hub) => (
                  <div
                    key={hub}
                    className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-3 last:border-0"
                  >
                    <span className="text-gray-600">{hub}</span>
                    <span className="text-green-500 text-[9px] font-black uppercase">
                      Online
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black p-8 rounded-[2.5rem] text-white shadow-2xl">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-4">
                Urgent Inquiries
              </p>
              <p className="text-xs font-bold">+370 600 00000</p>
              <p className="text-xs font-bold mt-1 text-gray-400">
                hub-support@iphonestore.lt
              </p>
            </div>
          </div>

          {/* Main Chat Window */}
          <div className="lg:col-span-2 bg-white rounded-[3.5rem] shadow-2xl border border-gray-100 overflow-hidden h-[650px] flex flex-col">
            {currentUser ? (
              <>
                <div
                  className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#fbfbfd]"
                  ref={scrollRef}
                >
                  {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                      <span className="text-5xl mb-4">💬</span>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                        No Active Thread
                      </p>
                    </div>
                  ) : (
                    chatHistory.map((msg) => (
                      <div key={msg.id} className="space-y-4">
                        {/* USER MESSAGE (RIGHT) */}
                        {msg.get("message") && (
                          <div className="flex flex-col items-end">
                            <div className="bg-[#1d1d1f] text-white px-7 py-4 rounded-[2.2rem] rounded-tr-none max-w-[85%] shadow-lg">
                              <p className="text-sm font-medium leading-relaxed">
                                {msg.get("message")}
                              </p>
                            </div>
                            <span className="text-[8px] font-bold text-gray-400 mt-2 px-2 uppercase tracking-tighter">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                        )}

                        {/* ADMIN REPLY (LEFT) */}
                        {msg.get("adminReply") && (
                          <div className="flex flex-col items-start animate-in slide-in-from-left duration-500">
                            <div className="bg-white border border-gray-200 text-black px-7 py-4 rounded-[2.2rem] rounded-tl-none max-w-[85%] shadow-sm">
                              <p className="text-sm font-bold leading-relaxed">
                                {msg.get("adminReply")}
                              </p>
                              <p className="text-[8px] font-black text-indigo-600 uppercase mt-3 tracking-widest flex items-center gap-2">
                                <span className="w-1 h-1 bg-indigo-600 rounded-full"></span>{" "}
                                Official Hub Manager
                              </p>
                            </div>
                            <span className="text-[8px] font-bold text-gray-400 mt-2 px-2 uppercase tracking-tighter">
                              {formatTime(msg.updatedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* INPUT AREA */}
                <div className="p-8 bg-white border-t border-gray-50 flex gap-4 items-center">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Describe your inquiry..."
                    className="flex-1 bg-gray-50 border-none rounded-2xl px-8 py-5 text-sm font-bold !text-black outline-none focus:ring-2 ring-indigo-100 transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending}
                    className="bg-indigo-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-xl hover:bg-black transition-all active:scale-90 disabled:bg-gray-100"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <span className="text-xl font-black">↑</span>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center bg-[#fbfbfd]">
                <div className="w-24 h-24 bg-gray-50 rounded-[2.5rem] flex items-center justify-center text-4xl mb-8 shadow-inner">
                  🔒
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tighter text-black">
                  Restricted Access
                </h3>
                <p className="text-gray-400 text-xs font-bold uppercase mt-3 mb-10 tracking-widest max-w-xs leading-relaxed">
                  Please authenticate to view your secure logistics inquiries.
                </p>
                <Link
                  href="/user/login"
                  className="bg-black text-white px-14 py-5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-2xl"
                >
                  Sign In to Hub
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
