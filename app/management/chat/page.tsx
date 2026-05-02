"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";

export default function ManagementMasterChat() {
  const [activeTab, setActiveTab] = useState<"internal" | "support">(
    "internal",
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState(0);
  const [supportNotifications, setSupportNotifications] = useState(0);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showNewConv, setShowNewConv] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatDateTime = (date?: Date) => {
    if (!date) return "Just now";
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(date);
  };

  // --- 1. SMART NOTIFICATION & SIDEBAR LOGIC ---
  const fetchNotificationCounts = async () => {
    try {
      const adminQuery = new parseClient.Query("InternalChat");
      adminQuery.equalTo("role", "ADMIN");
      adminQuery.equalTo("isManagerRead", false);
      setAdminNotifications(await adminQuery.count());

      // Only count support messages created after management's last chat visit
      const lastVisit = localStorage.getItem("managementLastChatVisit");
      const supportQuery = new parseClient.Query("SupportMessage");
      supportQuery.equalTo("status", "Pending");
      if (lastVisit) {
        supportQuery.greaterThan("createdAt", new Date(lastVisit));
      }
      setSupportNotifications(await supportQuery.count());
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      if (activeTab === "internal") {
        const query = new parseClient.Query("InternalChat");
        query.ascending("createdAt");
        const results = await query.find();

        // Auto-mark as read when looking at internal tab
        for (const m of results) {
          if (m.get("role") === "ADMIN" && !m.get("isManagerRead")) {
            m.set("isManagerRead", true);
            await m.save();
          }
        }
        setMessages(results);
      } else {
        const query = new parseClient.Query("SupportMessage");
        query.include("user");
        query.ascending("createdAt");
        const results = await query.find();
        setMessages(results);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🚩 Fetch all registered users for "New Conversation"
  const fetchAllUsers = async () => {
    try {
      const User = parseClient.Object.extend("User");
      const query = new parseClient.Query(User);
      query.limit(1000);
      const results = await query.find();
      setAllUsers(results);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  useEffect(() => {
    // 🚩 Only update timestamp when viewing the support tab
    // (Admin sync badge is handled by isManagerRead flag on InternalChat)
    if (activeTab === "support") {
      localStorage.setItem("managementLastChatVisit", new Date().toISOString());
    }

    fetchData();
    fetchNotificationCounts();
    if (activeTab === "support") fetchAllUsers();
    const interval = setInterval(() => {
      fetchData();
      fetchNotificationCounts();
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  const handleSend = async () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);

    try {
      if (activeTab === "internal") {
        // ✅ PRIVATE STAFF MESSAGE - Use InternalChat class
        const Chat = parseClient.Object.extend("InternalChat");
        const msg = new Chat();

        msg.set("text", replyText);
        msg.set("sender", "manager");
        msg.set("role", "MANAGEMENT");
        msg.set("isAdminRead", false); // Triggers Admin Notification
        msg.set("isManagerRead", true); // Manager already read their own

        await msg.save();
      } else {
        // 🚩 PUBLIC CUSTOMER REPLY
        if (!selectedUser) return;

        const Support = parseClient.Object.extend("SupportMessage");
        const msg = new Support();

        const acl = new parseClient.ACL();
        acl.setPublicReadAccess(true);
        acl.setPublicWriteAccess(true);
        msg.setACL(acl);

        msg.set("adminReply", replyText);
        msg.set("status", "Replied");
        msg.set("user", selectedUser);

        // Mark user's previous questions as seen
        const query = new parseClient.Query("SupportMessage");
        query.equalTo("user", selectedUser);
        query.equalTo("status", "Pending");
        const pending = await query.find();
        for (const p of pending) {
          p.set("status", "Replied");
          await p.save();
        }

        await msg.save();
      }

      setReplyText("");
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSending(false);
    }
  };

  // --- 🚩 THE SECRET: DYNAMIC SIDEBAR SORTING ---
  const supportUsers = Array.from(
    new Set(messages.map((m) => m.get("user")?.id)),
  )
    .filter(Boolean)
    .map((id) => {
      const userMsgs = messages.filter((m) => m.get("user")?.id === id);
      const userObj = userMsgs[0].get("user");
      const hasPending = userMsgs.some((m) => m.get("status") === "Pending");
      const lastMsgDate = userMsgs[userMsgs.length - 1].createdAt;
      return { userObj, hasPending, lastMsgDate };
    })
    // Sort by Pending first, then by Newest Date
    .sort((a, b) => {
      if (a.hasPending !== b.hasPending) return a.hasPending ? -1 : 1;
      return b.lastMsgDate - a.lastMsgDate;
    });

  return (
    <main className="min-h-screen bg-[#f5f5f7] p-8 md:p-12 font-sans antialiased text-black">
      <div className="max-w-6xl mx-auto h-[85vh] flex flex-col">
        {/* TAB HEADER */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex bg-white p-1.5 rounded-[2rem] border border-gray-200 shadow-sm">
            <div className="relative">
              <button
                onClick={() => {
                  setActiveTab("internal");
                  setSelectedUser(null);
                }}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "internal" ? "bg-black !text-white" : "!text-gray-400"}`}
              >
                Admin Sync
              </button>
              {adminNotifications > 0 && activeTab !== "internal" && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-black animate-bounce ring-2 ring-white shadow-lg">
                  {adminNotifications}
                </div>
              )}
            </div>
            <div className="relative ml-2">
              <button
                onClick={() => setActiveTab("support")}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "support" ? "bg-indigo-600 !text-white" : "!text-gray-400"}`}
              >
                User Support
              </button>
              {supportNotifications > 0 && activeTab !== "support" && (
                <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-black animate-bounce ring-2 ring-white shadow-lg">
                  {supportNotifications}
                </div>
              )}
            </div>
          </div>
          <Link
            href="/management/dashboard"
            className="text-[11px] font-black bg-white border-2 border-black px-8 py-3 rounded-full uppercase text-black hover:bg-black hover:text-white transition-all shadow-sm"
          >
            ← Back to Dashboard
          </Link>
        </header>

        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* SIDEBAR WITH NEW MESSAGE BADGES */}
          {activeTab === "support" && (
            <div className="w-80 bg-white rounded-[2.5rem] border border-gray-100 p-4 overflow-y-auto space-y-2 no-scrollbar">
              <div className="flex items-center justify-between px-4 pt-2 pb-1">
                <h3 className="text-[9px] font-black !text-gray-400 uppercase tracking-widest">
                  Inquiry Threads
                </h3>
                <button
                  onClick={() => setShowNewConv(true)}
                  className="text-[9px] font-black bg-indigo-600 text-white px-4 py-2 rounded-full uppercase tracking-widest hover:bg-black transition-all shadow-md"
                >
                  ✉️ New
                </button>
              </div>
              {supportUsers.map(({ userObj, hasPending }) => (
                <div
                  key={userObj.id}
                  onClick={() => setSelectedUser(userObj)}
                  className={`p-5 rounded-2xl cursor-pointer transition-all relative ${selectedUser?.id === userObj.id ? "bg-indigo-600 !text-white shadow-lg" : "bg-gray-50 !text-black hover:bg-gray-100"}`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm">
                      {userObj.get("username")}
                    </p>
                    {hasPending && (
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                    )}
                  </div>
                  <p
                    className={`text-[9px] font-black uppercase mt-1 ${selectedUser?.id === userObj.id ? "text-indigo-200" : "text-gray-400"}`}
                  >
                    {hasPending ? "🔵 New Message" : "Seen"}
                  </p>
                </div>
              ))}

              {/* NEW CONVERSATION MODAL */}
              {showNewConv && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                  <div className="bg-[#1c1c1e] w-full max-w-md rounded-[3rem] p-8 shadow-2xl text-white border border-white/5 animate-in zoom-in duration-200">
                    <h2 className="text-2xl font-black uppercase tracking-tight mb-1">
                      New Conversation
                    </h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">
                      Select a user to message
                    </p>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {allUsers
                        .filter(
                          (u) =>
                            u.id !== parseClient.User.current()?.id &&
                            !supportUsers.some((s) => s.userObj.id === u.id),
                        )
                        .map((user) => (
                          <div
                            key={user.id}
                            onClick={() => {
                              setSelectedUser(user);
                              setShowNewConv(false);
                            }}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 cursor-pointer hover:bg-indigo-600 hover:border-indigo-500 transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-black">
                              {user.get("username")?.charAt(0).toUpperCase() ||
                                "?"}
                            </div>
                            <div>
                              <p className="font-bold text-sm">
                                {user.get("username") || "Unknown"}
                              </p>
                              <p className="text-[9px] text-gray-400 font-bold">
                                {user.get("email") || "No email"}
                              </p>
                            </div>
                          </div>
                        ))}
                      {allUsers.filter(
                        (u) => !supportUsers.some((s) => s.userObj.id === u.id),
                      ).length === 0 && (
                        <p className="text-center text-gray-500 text-xs font-bold py-10">
                          All users already have threads
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNewConv(false)}
                      className="w-full mt-6 bg-white text-black py-4 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHAT BOX */}
          <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-10 space-y-6 bg-[#fbfbfd]"
            >
              {messages
                .filter(
                  (m) =>
                    activeTab === "internal" ||
                    m.get("user")?.id === selectedUser?.id,
                )
                .map((m) => {
                  const isInternal = activeTab === "internal";
                  const isMe = isInternal
                    ? m.get("role") === "MANAGEMENT"
                    : m.get("adminReply");

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`px-7 py-4 rounded-[2rem] text-sm font-bold shadow-sm max-w-[80%] ${isMe ? "bg-indigo-600 !text-white rounded-tr-none shadow-indigo-100" : "bg-white border border-gray-100 !text-black rounded-tl-none"}`}
                      >
                        {isInternal
                          ? m.get("text")
                          : m.get("message") || m.get("adminReply")}
                      </div>
                      <div
                        className={`flex items-center gap-2 mt-2 px-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <span className="text-[8px] font-black text-gray-900 uppercase">
                          {isInternal
                            ? `${m.get("role")} : ${m.get("sender")}`
                            : m.get("adminReply")
                              ? "Management"
                              : "Customer"}
                        </span>
                        <span className="text-[8px] font-bold text-gray-400">
                          {formatDateTime(m.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-8 bg-white border-t border-gray-100 flex gap-4">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Secure staff message..."
                className="flex-1 bg-gray-50 rounded-2xl px-8 py-5 text-sm font-bold !text-black outline-none border-none focus:ring-2 ring-indigo-100 transition-all"
              />
              <button
                onClick={handleSend}
                disabled={isSending}
                className="bg-black !text-white px-10 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-600 transition-all"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
