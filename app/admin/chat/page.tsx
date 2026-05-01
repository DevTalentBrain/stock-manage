"use client";
import { useState, useEffect, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function AdminInternalChat() {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- 1. SESSION & DATA SYNC ---
  useEffect(() => {
    const user = parseClient.User.current();
    setCurrentUser(user);

    const fetchInternalMessages = async () => {
      try {
        const Chat = parseClient.Object.extend("InternalChat");
        const query = new parseClient.Query(Chat);
        query.ascending("createdAt");
        query.limit(100);
        const results = await query.find();

        // 🚩 Clear notifications for Admin when they view the page
        // If a message is from Management and is NOT read, mark it as read
        for (const m of results) {
          if (
            m.get("role") === "MANAGEMENT" &&
            m.get("isAdminRead") === false
          ) {
            m.set("isAdminRead", true);
            await m.save();
          }
        }

        setMessages(results);
        setLoading(false);
      } catch (error) {
        console.error("Internal Sync Error:", error);
      }
    };

    // 🚩 Track when admin last visited the chat page (for dashboard notifications)
    localStorage.setItem("adminLastChatVisit", new Date().toISOString());

    fetchInternalMessages();
    const interval = setInterval(fetchInternalMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. AUTO-SCROLL ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // --- 3. SEND LOGIC ---
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const Chat = parseClient.Object.extend("InternalChat");
      const msg = new Chat();

      msg.set("text", newMessage);
      msg.set("sender", currentUser?.get("username") || "Admin");
      msg.set("role", "ADMIN");

      // 🚩 CRITICAL: This is the trigger for the Management notification
      msg.set("isManagerRead", false);
      // Admin already read their own message
      msg.set("isAdminRead", true);

      await msg.save();
      setNewMessage("");
    } catch (error) {
      console.error("Admin Send Error:", error);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans antialiased text-[#1d1d1f]">
      <div className="max-w-4xl mx-auto h-[85vh] flex flex-col">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
              Private Staff Channel
            </h1>
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">
              Admin Control ↔ Management Sync
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[11px] font-black bg-white border-2 border-black px-8 py-3 rounded-full uppercase text-black hover:bg-black hover:text-white transition-all shadow-sm"
          >
            ← Back to Dashboard
          </Link>
        </header>

        <div className="flex-1 bg-white rounded-[3rem] shadow-xl border border-gray-100 flex flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#fbfbfd]"
          >
            {loading ? (
              <div className="h-full flex items-center justify-center opacity-20 font-black uppercase text-xs tracking-widest">
                Establishing Secure Link...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                <span className="text-4xl mb-4">🔒</span>
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Private Channel Empty
                  <br />
                  Start a conversation with Management
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.get("sender") === currentUser?.get("username");
                const role = m.get("role") || "STAFF";

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-1 rounded shadow-sm ${role === "ADMIN" ? "bg-black text-white" : "bg-indigo-600 text-white"}`}
                      >
                        {role}
                      </span>
                      <span className="text-[9px] font-black uppercase text-gray-500">
                        {m.get("sender")}
                      </span>
                    </div>
                    <div
                      className={`px-7 py-4 rounded-[2rem] text-sm font-semibold shadow-sm max-w-[80%] leading-relaxed ${isMe ? "bg-black text-white rounded-tr-none" : "bg-white border border-gray-100 text-black rounded-tl-none"}`}
                    >
                      {m.get("text")}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={sendMessage}
            className="p-8 bg-white border-t border-gray-100 flex gap-4"
          >
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-gray-50 rounded-2xl px-6 py-4 text-sm font-bold text-black outline-none focus:ring-2 ring-black transition-all border-none"
              placeholder="Type secure staff message..."
            />
            <button className="bg-black text-white px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-lg">
              Send
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
