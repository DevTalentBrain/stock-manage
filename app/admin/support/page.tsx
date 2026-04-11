"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function AdminSupportPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  async function fetchMessages() {
    try {
      const SupportMessage = parseClient.Object.extend("SupportMessage");
      const query = new parseClient.Query(SupportMessage);

      query.include("user");
      query.descending("createdAt");

      const results = await query.find();

      // Check if any message in your history is missing a user link
      results.forEach((m) => {
        if (!m.get("user")) {
          console.warn(
            "Message ID " + m.id + " has no linked user in history.",
          );
        }
      });

      setMessages(results);
    } catch (error: any) {
      console.error("History Access Denied. Check ACLs on old rows.");
    }
  }

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedUser, messages]);

  // --- FIXED GROUPING LOGIC ---
  // This ensures we get a unique list of IDs from all messages
  const usersWithMessages = Array.from(
    new Set(messages.map((m) => m.get("user")?.id || `guest_${m.id}`)),
  ).filter(Boolean);

  const activeChat = messages
    .filter((m) => (m.get("user")?.id || `guest_${m.id}`) === selectedUser)
    .sort((a, b) => a.get("createdAt") - b.get("createdAt"));

  const handleSendDirect = async () => {
    if (!replyText.trim() || !selectedUser) return;
    setIsSending(true);
    try {
      const SupportMessage = parseClient.Object.extend("SupportMessage");
      const newReply = new SupportMessage();

      // 1. Set the reply text
      newReply.set("adminReply", replyText);

      // 2. Link it to the user so it shows up in their chat
      // We get the actual Pointer from the existing messages
      const userPointer = messages
        .find((m) => (m.get("user")?.id || `guest_${m.id}`) === selectedUser)
        ?.get("user");

      if (userPointer) {
        newReply.set("user", userPointer);
      }

      newReply.set("status", "Replied");

      // 3. Set ACL so the user can see your reply
      const acl = new parseClient.ACL();
      acl.setPublicReadAccess(true);
      acl.setPublicWriteAccess(true);
      newReply.setACL(acl);

      await newReply.save();

      setReplyText("");
      fetchMessages(); // Refresh to show the new message in the list
    } catch (error) {
      console.error("Failed to send:", error);
      alert("Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-6 md:p-12 font-sans antialiased text-[#1d1d1f]">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tight">
            Admin Messenger
          </h1>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black bg-black text-white px-8 py-3 rounded-full uppercase transition-all hover:scale-105"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
          {/* SIDEBAR */}
          <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-y-auto p-4 space-y-2">
            <h2 className="text-[10px] font-black uppercase text-gray-400 p-4 tracking-widest">
              Active Registry
            </h2>
            {usersWithMessages.map((userId) => {
              const userMsgs = messages.filter(
                (m) => (m.get("user")?.id || `guest_${m.id}`) === userId,
              );
              const isUnreplied = userMsgs.some((m) => !m.get("adminReply"));
              const latest = userMsgs[0];
              const userObj = latest.get("user");
              const username = userObj
                ? userObj.get("username") ||
                  `Locked User (${userObj.id.substring(0, 4)})`
                : "Guest User";

              return (
                <div
                  key={userId}
                  onClick={() => setSelectedUser(userId)}
                  className={`p-5 rounded-2xl cursor-pointer transition-all relative ${
                    selectedUser === userId
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  {isUnreplied && selectedUser !== userId && (
                    <span className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                  <p className="font-bold text-sm tracking-tight">{username}</p>
                  <p
                    className={`text-[10px] truncate opacity-60 ${selectedUser === userId ? "text-white" : "text-gray-500"}`}
                  >
                    {latest.get("message")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* CHAT AREA */}
          <div className="lg:col-span-3 bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            {selectedUser ? (
              <>
                <div className="p-6 border-b bg-white border-gray-100 flex justify-between items-center">
                  <span className="text-[11px] font-black uppercase text-blue-600 tracking-widest">
                    Direct Thread:{" "}
                    {messages
                      .find(
                        (m) =>
                          (m.get("user")?.id || `guest_${m.id}`) ===
                          selectedUser,
                      )
                      ?.get("user")
                      ?.get("username") || "User"}
                  </span>
                </div>
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fbfbfd]"
                >
                  {activeChat.map((msg) => (
                    <div key={msg.id} className="space-y-4">
                      {/* ONLY render User bubble if "message" exists and is not empty */}
                      {msg.get("message") && (
                        <div className="flex justify-start">
                          <div className="bg-white border border-gray-200 text-black px-6 py-4 rounded-[2rem] rounded-tl-none max-w-[70%] shadow-sm">
                            <p className="text-sm font-medium">
                              {msg.get("message")}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ONLY render Admin bubble if "adminReply" exists and is not empty */}
                      {msg.get("adminReply") && (
                        <div className="flex justify-end">
                          <div className="bg-[#1d1d1f] text-white px-6 py-4 rounded-[2rem] rounded-tr-none max-w-[70%] shadow-lg">
                            <p className="text-sm font-medium">
                              {msg.get("adminReply")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-gray-100 flex gap-4 bg-white">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendDirect()}
                    placeholder="Response..."
                    className="flex-1 bg-gray-50 border-none rounded-full px-8 py-4 text-sm font-semibold outline-none text-black placeholder:text-gray-400"
                  />
                  <button
                    onClick={handleSendDirect}
                    disabled={isSending}
                    className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-black transition-all shadow-lg active:scale-95 disabled:bg-gray-200"
                  >
                    {isSending ? "..." : "↑"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-20 opacity-20 uppercase font-black text-xs tracking-widest">
                <div className="text-5xl mb-4">💬</div>
                Select a stockholder thread
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
