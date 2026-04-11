"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
import Navbar from "@/app/frontent/navbar";

export default function UserSupport() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showChat, setShowChat] = useState(true);
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const prevHistoryRef = useRef<number>(0);

  useEffect(() => {
    const user = parseClient.User.current();
    if (user) {
      setCurrentUser(user);
      fetchChatHistory(user);

      const interval = setInterval(() => fetchChatHistory(user), 5000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
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

      const originalTitle = document.title;
      document.title = "📩 New Message from Support";
      setTimeout(() => {
        document.title = originalTitle;
      }, 4000);
    }

    prevHistoryRef.current = currentReplies;

    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const playNotifySound = () => {
    const audio = new Audio(
      "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3",
    );
    audio.play().catch(() => console.log("Interaction required for sound"));
  };

  async function fetchChatHistory(user: any) {
    try {
      // Verify session is valid before querying
      const session = await parseClient.Session.current().catch(() => null);

      const SupportMessage = parseClient.Object.extend("SupportMessage");
      const query = new parseClient.Query(SupportMessage);

      // Ensure we only query messages belonging to THIS user
      query.equalTo("user", user);
      query.ascending("createdAt");

      const results = await query.find();
      setChatHistory(results);
    } catch (error: any) {
      console.error("Fetch error code:", error.code);

      // 209 = Invalid Session, 119 = Permission Denied
      if (error.code === 209 || error.code === 119) {
        console.warn("Session expired or permission denied. Logging out...");
        parseClient.User.logOut();
        window.location.href = "/login";
      }
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser) return;
    setIsSending(true);
    try {
      const SupportMessage = parseClient.Object.extend("SupportMessage");
      const msg = new SupportMessage();
      msg.set("message", message);
      msg.set("user", currentUser);

      // --- CRITICAL SECURITY CHANGE ---
      // This allows the Admin to see the message in the sidebar
      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true); // ANYONE (including Admin) can read
      acl.setPublicWriteAccess(true); // ANYONE (including Admin) can reply
      msg.setACL(acl);
      // -------------------------------

      await msg.save();
      setChatHistory([...chatHistory, msg]);
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] font-sans antialiased text-[#1d1d1f]">
      {showNotification && (
        <div className="fixed top-24 right-6 z-[100] animate-in slide-in-from-right fade-in duration-500">
          <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 max-w-xs">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg">
              📩
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">
                New Message
              </p>
              <p className="text-xs font-bold text-gray-800">
                Support has replied to your inquiry.
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
        <header className="mb-12">
          <h1 className="text-4xl font-black tracking-tight uppercase">
            Support & Info
          </h1>
          <p className="text-gray-500 font-medium">
            Kaunas Hub & Vilnius Hub Logistics
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-6">
                Service Status
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Kaunas Warehouse</span>
                  <span className="flex items-center gap-2 text-[9px] font-black text-green-500 uppercase">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>{" "}
                    Operational
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Vilnius Warehouse</span>
                  <span className="flex items-center gap-2 text-[9px] font-black text-green-500 uppercase">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>{" "}
                    Operational
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">
                Logistics Policy
              </h3>
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase mb-1">
                    Local Pickup
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Available at Savanorių pr. (Kaunas) and Konstitucijos pr.
                    (Vilnius).
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase mb-1">
                    Warranty
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    24-month limited warranty serviced at either hub.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#1d1d1f] p-8 rounded-[2.5rem] text-white shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">
                Direct Contact
              </h3>
              <div className="space-y-4 text-xs font-bold">
                <p>HQ: +370 600 00000</p>
                <p>Email: hub@iphonestore.lt</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[650px]">
              <div className="p-6 border-b flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl">
                    🎧
                  </div>
                  <div>
                    <span className="block text-[11px] font-black uppercase tracking-widest">
                      Live Messenger
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">
                        System Connected
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fbfbfd]"
              >
                {chatHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <span className="text-4xl mb-4">💬</span>
                    <p className="text-[10px] font-black uppercase tracking-widest">
                      No Active Conversations
                    </p>
                  </div>
                ) : (
                  chatHistory.map((msg) => (
                    <div key={msg.id} className="space-y-4">
                      <div className="flex justify-end">
                        <div className="bg-[#1d1d1f] text-white px-6 py-4 rounded-[2rem] rounded-tr-none max-w-[80%] shadow-lg shadow-black/5">
                          <p className="text-sm font-medium leading-relaxed">
                            {msg.get("message")}
                          </p>
                        </div>
                      </div>

                      {msg.get("adminReply") && (
                        <div className="flex justify-start animate-in slide-in-from-left duration-500">
                          <div className="bg-white text-black border border-gray-200 px-6 py-4 rounded-[2rem] rounded-tl-none max-w-[80%] shadow-sm">
                            <p className="text-sm font-bold leading-relaxed">
                              {msg.get("adminReply")}
                            </p>
                            <p className="text-[9px] font-black uppercase text-blue-500 mt-2 tracking-widest">
                              Official Support
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex gap-4 items-center">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask a hub manager..."
                  className="flex-1 bg-gray-50 border-none rounded-full px-8 py-4 text-sm font-semibold text-black placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isSending}
                  className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-black transition-all shadow-lg active:scale-90 disabled:bg-gray-200"
                >
                  {isSending ? "..." : "↑"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
