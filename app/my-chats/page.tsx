"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type UserMe = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

// ✅ EXTENDED type with optional fields for product / image messages
type ChatMessage = {
  id: string;
  sender: "customer" | "admin";
  senderName: string;
  message: string;
  createdAt: string;
  // ===== ADDED FIELDS =====
  type?: "text" | "product" | "image";
  productId?: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  imageUrl?: string;
  // ========================
};

type InquiryRoom = {
  id: string;
  productId: number;
  productName: string;
  productSlug: string;
  productImage?: string;
  customerUserId: string;
  customerName: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  messages: ChatMessage[];
  // ===== ADDED: order/guest fields =====
  orderId?: string;
  isGuest?: boolean;
  guestToken?: string;
  guestPhone?: string;
  customerPhone?: string;
  channel?: "inquire" | "order_chat" | "remind";
  orderSnapshot?: {
    orderId: string;
    customerName?: string;
    phone?: string;
    address?: string;
    total?: number;
    status?: string;
    items?: Array<{
      id?: string | number;
      name?: string;
      image?: string;
      qty?: number;
      price?: number;
    }>;
    createdAt?: string;
  };
};

type StreamPayload = {
  type?: "connected" | "room_updated" | "room_deleted";
  room?: InquiryRoom;
  at?: string;
};

function formatDateTime(dateString: string) {
  try {
    return new Date(dateString).toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

// ✅ ADDED: helper that resolves a message's effective type with backward
// compatibility for legacy messages stored without a `type` field.
function getMessageType(msg: ChatMessage): "text" | "product" | "image" {
  if (msg.type === "product" || msg.type === "image" || msg.type === "text") {
    return msg.type;
  }
  return "text";
}

// ✅ ADDED: build a short preview for room list items (handles all 3 types)
function getMessagePreview(msg: ChatMessage): string {
  const t = getMessageType(msg);
  if (t === "product") {
    return `${msg.senderName}: [สินค้า] ${msg.productName || ""}`;
  }
  if (t === "image") {
    return `${msg.senderName}: [รูปภาพ]`;
  }
  return `${msg.senderName}: ${msg.message}`;
}

function getUnreadCount(room: InquiryRoom) {
  if (typeof window === "undefined") return 0;

  const key = `chat_read_${room.id}`;
  const readCount = Number(localStorage.getItem(key) || 0);
  const adminMessages = room.messages.filter((m) => m.sender === "admin");

  return Math.max(adminMessages.length - readCount, 0);
}

export default function MyChatsPage() {
  const isMobile = useIsMobile(820);

  const [me, setMe] = useState<UserMe | null>(null);
  const [rooms, setRooms] = useState<InquiryRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [loading, setLoading] = useState(true);
  const [liveConnected, setLiveConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "new">("all");
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const goLogin = () => {
    window.location.href = "/login?next=/my-chats";
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }, 50);
  };

  const rebuildUnreadMap = (list: InquiryRoom[]) => {
    const next: Record<string, number> = {};
    list.forEach((room) => {
      next[room.id] = getUnreadCount(room);
    });
    setUnreadMap(next);
  };

  const loadMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.user) {
        goLogin();
        return null;
      }

      setMe(data.user);
      return data.user;
    } catch {
      goLogin();
      return null;
    }
  };

  const loadRooms = async () => {
    try {
      const res = await fetch("/api/inquiries?all=1", {
        cache: "no-store",
      });

      if (res.status === 401) {
        goLogin();
        return [];
      }

      const data = await res.json().catch(() => null);

      let list: InquiryRoom[] = [];

      if (Array.isArray(data?.rooms)) {
        list = data.rooms;
      } else if (data?.room) {
        list = [data.room];
      } else {
        list = [];
      }

      list = [...list].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setRooms(list);

      setSelectedRoomId((prev) => {
        if (prev && list.some((room) => room.id === prev)) return prev;
        return list[0]?.id || "";
      });

      rebuildUnreadMap(list);
      return list;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const user = await loadMe();
      if (!mounted || !user) return;

      await loadRooms();

      if (mounted) {
        setLoading(false);
        scrollToBottom(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!me?.id) return;

    const es = new EventSource("/api/inquiries/stream", {
      withCredentials: true,
    });

    es.onopen = () => {
      setLiveConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StreamPayload;

        if (payload.type === "connected") {
          setLiveConnected(true);
          return;
        }

        if (payload.type === "room_deleted" && payload.room?.id) {
          setRooms((prev) => {
            const next = prev.filter((room) => room.id !== payload.room!.id);
            rebuildUnreadMap(next);
            return next;
          });

          setSelectedRoomId((prev) =>
            prev === payload.room?.id ? "" : prev
          );

          return;
        }

        if (payload.type === "room_updated" && payload.room) {
          setRooms((prev) => {
            const exists = prev.some((room) => room.id === payload.room!.id);

            const next = exists
              ? prev.map((room) =>
                  room.id === payload.room!.id ? payload.room! : room
                )
              : [payload.room!, ...prev];

            const sorted = [...next].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            );

            rebuildUnreadMap(sorted);
            return sorted;
          });

          setSelectedRoomId((prev) => prev || payload.room!.id);
          scrollToBottom();

          // ✅ ADDED: notify the navbar to refresh its unread badge instantly,
          // so we don't depend on the navbar's slower polling interval.
          try {
            window.dispatchEvent(new Event("chat-updated"));
          } catch {
            /* ignore */
          }
        }
      } catch (error) {
        console.error("SSE parse error:", error);
      }
    };

    es.onerror = () => {
      setLiveConnected(false);
    };

    return () => {
      es.close();
      setLiveConnected(false);
    };
  }, [me?.id]);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    if (!selectedRoom?.id) return;

    const key = `chat_read_${selectedRoom.id}`;
    const adminMessages = selectedRoom.messages.filter(
      (m) => m.sender === "admin"
    );

    localStorage.setItem(key, String(adminMessages.length));

    setUnreadMap((prev) => ({
      ...prev,
      [selectedRoom.id]: 0,
    }));

    scrollToBottom();

    // ✅ ADDED: tell navbar the unread count likely went down.
    try {
      window.dispatchEvent(new Event("chat-read"));
    } catch {
      /* ignore */
    }
  }, [selectedRoom?.id, selectedRoom?.messages.length]);

  const totalUnread = useMemo(() => {
    return Object.values(unreadMap).reduce((sum, n) => sum + n, 0);
  }, [unreadMap]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list =
      tab === "new"
        ? rooms.filter((room) => (unreadMap[room.id] || 0) > 0)
        : rooms;

    if (!q) return list;

    return list.filter((room) => {
      const haystack = [
        room.productName,
        room.productSlug,
        room.customerName,
        String(room.productId),
        room.id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rooms, search, tab, unreadMap]);

  if (loading) {
    return <div style={{ padding: 24 }}>กำลังโหลด...</div>;
  }

  return (
    <>
      <style jsx global>{`
        .chat-readable-theme * {
          font-family: inherit;
        }
        .chat-readable-theme ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        .chat-readable-theme ::-webkit-scrollbar-thumb {
          background: #f0b39e;
          border-radius: 999px;
        }
        .chat-readable-theme ::-webkit-scrollbar-track {
          background: #fff7f2;
        }
      `}</style>
    <div
      className="chat-readable-theme"
      style={{
        maxWidth: 1400,
        margin: "0 auto",
        padding: isMobile ? "12px 8px 16px" : "20px 12px 24px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "360px minmax(0,1fr)",
          gap: isMobile ? 0 : 16,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
            minHeight: isMobile ? "calc(100vh - 100px)" : "78vh",
            display: isMobile && selectedRoomId ? "none" : "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #f1f1f1",
              background: "linear-gradient(90deg,#fff7f2 0%,#ffffff 100%)",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#ee4d2d",
                lineHeight: 1.2,
              }}
            >
              ข้อความสอบถามของฉัน
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "#555",
                fontWeight: 700,
              }}
            >
              ผู้ใช้: {me?.name || "-"}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: liveConnected ? "#166534" : "#c2410c",
                  background: liveConnected ? "#dcfce7" : "#fff7ed",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontWeight: 800,
                }}
              >
                {liveConnected ? "Realtime พร้อมใช้งาน" : "กำลังเชื่อมต่อสด..."}
              </span>

              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  background: "#f5f5f5",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontWeight: 700,
                }}
              >
                ข้อความใหม่ {totalUnread}
              </span>

              <span
                style={{
                  fontSize: 12,
                  color: "#666",
                  background: "#f5f5f5",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontWeight: 700,
                }}
              >
                ทั้งหมด {rooms.length} ห้อง
              </span>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
              }}
            >
              <button
                onClick={() => setTab("new")}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: tab === "new" ? "#1677ff" : "#eef2ff",
                  color: tab === "new" ? "#fff" : "#334155",
                }}
              >
                ข้อความใหม่
              </button>

              <button
                onClick={() => setTab("all")}
                style={{
                  border: "none",
                  borderRadius: 10,
                  padding: "9px 12px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  background: tab === "all" ? "#1677ff" : "#eef2ff",
                  color: tab === "all" ? "#fff" : "#334155",
                }}
              >
                ข้อความทั้งหมด
              </button>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา ชื่อสินค้า / room id"
              style={{
                marginTop: 12,
                width: "100%",
                borderRadius: 12,
                border: "1px solid #d9d9d9",
                padding: "13px 16px",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: 10,
              background: "#f6f8fb",
            }}
          >
            {filteredRooms.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  color: "#777",
                  textAlign: "center",
                  lineHeight: 1.7,
                }}
              >
                ยังไม่มีรายการข้อความ
              </div>
            ) : (
              filteredRooms.map((room) => {
                const last = room.messages[room.messages.length - 1];
                const active = room.id === selectedRoomId;
                const unread = unreadMap[room.id] || 0;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: active ? "2px solid #ee4d2d" : "1px solid #e5e7eb",
                      background: active ? "#fff1ee" : "#fff",
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 10,
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 8px 22px rgba(238,77,45,0.14)"
                        : "0 2px 8px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 900,
                            color: "#111",
                            lineHeight: 1.4,
                            wordBreak: "break-word",
                          }}
                        >
                          {room.productName}
                        </div>

                        {/* ===== ADDED: channel/order badge ===== */}
                        {room.orderId ? (
                          <div
                            style={{
                              display: "inline-block",
                              marginTop: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              color:
                                room.channel === "remind"
                                  ? "#c2410c"
                                  : "#1d4ed8",
                              background:
                                room.channel === "remind"
                                  ? "#fff7ed"
                                  : "#eff6ff",
                              border:
                                room.channel === "remind"
                                  ? "1px solid #fdba74"
                                  : "1px solid #bfdbfe",
                              borderRadius: 999,
                              padding: "3px 8px",
                            }}
                          >
                            {room.channel === "remind" ? "ทวงของ" : "แชทคำสั่งซื้อ"} • #
                            {room.orderId}
                          </div>
                        ) : null}
                        {/* ====================================== */}

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: "#666",
                            fontWeight: 700,
                          }}
                        >
                          สถานะ: {room.status === "open" ? "เปิดอยู่" : "ปิดแล้ว"}
                        </div>
                      </div>

                      {unread > 0 ? (
                        <span
                          style={{
                            flexShrink: 0,
                            minWidth: 22,
                            height: 22,
                            borderRadius: 999,
                            background: "#ef4444",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 800,
                            display: "grid",
                            placeItems: "center",
                            padding: "0 6px",
                          }}
                        >
                          {unread}
                        </span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#666",
                        lineHeight: 1.6,
                      }}
                    >
                      อัปเดตล่าสุด: {formatDateTime(room.updatedAt)}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "#444",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: unread > 0 ? 800 : 500,
                      }}
                    >
                      {/* ✅ MODIFIED: use type-aware preview */}
                      {last ? getMessagePreview(last) : "ยังไม่มีข้อความ"}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
            minHeight: isMobile ? "calc(100vh - 100px)" : "78vh",
            display: isMobile && !selectedRoomId ? "none" : "flex",
            flexDirection: "column",
          }}
        >
          {isMobile && selectedRoomId ? (
            <button
              onClick={() => setSelectedRoomId("")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                background: "#fff7f5",
                border: "none",
                borderBottom: "1px solid #ffd6cc",
                color: "#ee4d2d",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              ← กลับไปรายการห้อง
            </button>
          ) : null}

          {!selectedRoom ? (
            <div
              style={{
                margin: "auto",
                padding: 24,
                textAlign: "center",
                color: "#777",
                lineHeight: 1.8,
              }}
            >
              ยังไม่มีห้องแชท
              <br />
              <Link
                href="/"
                style={{
                  color: "#ee4d2d",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
              >
                กลับไปดูสินค้า
              </Link>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: "16px 18px",
                  borderBottom: "1px solid #f1f1f1",
                  background: "linear-gradient(90deg,#fff7f2 0%,#ffffff 100%)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
  <img
    src={selectedRoom?.productImage || "/no-image.png"}
    alt={selectedRoom?.productName || "product"}
    style={{
      width: 60,
      height: 60,
      objectFit: "cover",
      borderRadius: 12,
      border: "1px solid #eee",
      flexShrink: 0,
    }}
  />

  <div style={{ minWidth: 0 }}>
    <div
      style={{
        fontSize: 16,
        fontWeight: 800,
        color: "#222",
        lineHeight: 1.4,
        wordBreak: "break-word",
      }}
    >
      {selectedRoom?.productName}
    </div>

    <div style={{ marginTop: 6, fontSize: 12, color: "#888" }}>
      Product ID: {selectedRoom?.productId}
    </div>
  </div>
</div>

                  <Link
                    href={
                      selectedRoom.orderId
                        ? `/order-chat?orderId=${encodeURIComponent(
                            selectedRoom.orderId
                          )}`
                        : `/chat/product/${selectedRoom.productId}`
                    }
                    style={{
                      textDecoration: "none",
                      background: "#ee4d2d",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontWeight: 800,
                    }}
                  >
                    ไปหน้าพิมพ์แชท
                  </Link>
                </div>
              </div>

              <div
                style={{
                  height: "62vh",
                  minHeight: 420,
                  maxHeight: "72vh",
                  overflowY: "auto",
                  padding: 16,
                  background: "#f6f8fb",
                  display: "grid",
                  gap: 12,
                }}
              >
                {selectedRoom.messages.length === 0 ? (
                  <div
                    style={{
                      margin: "auto",
                      color: "#777",
                      background: "#fff",
                      border: "1px dashed #d7d7d7",
                      borderRadius: 14,
                      padding: "18px 20px",
                      textAlign: "center",
                      maxWidth: 420,
                      lineHeight: 1.7,
                    }}
                  >
                    ยังไม่มีข้อความในห้องนี้
                  </div>
                ) : (
                  selectedRoom.messages.map((msg) => {
                    const isMine = msg.sender === "customer";
                    // ✅ ADDED: resolve effective type with backward compat
                    const msgType = getMessageType(msg);

                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: "flex",
                          justifyContent: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "76%",
                            display: "grid",
                            gap: 4,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              color: "#666",
                              fontWeight: 700,
                              textAlign: isMine ? "right" : "left",
                              padding: "0 6px",
                            }}
                          >
                            {msg.senderName}
                          </div>

                          {/* ===== ADDED: branched rendering by type ===== */}
                          {msgType === "product" ? (
                            <div
                              style={{
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 16,
                                padding: 10,
                                width: 260,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.productImage || "/no-image.png"}
                                alt={msg.productName || "product"}
                                style={{
                                  width: "100%",
                                  height: 160,
                                  objectFit: "cover",
                                  borderRadius: 10,
                                  background: "#f5f5f5",
                                  display: "block",
                                }}
                              />
                              <div
                                style={{
                                  marginTop: 10,
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: "#111",
                                  lineHeight: 1.4,
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {msg.productName || `สินค้า #${msg.productId}`}
                              </div>
                              <a
                                href={
                                  msg.productSlug
                                    ? `/product/${msg.productSlug}`
                                    : `#`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "block",
                                  marginTop: 10,
                                  textAlign: "center",
                                  background: "#ee4d2d",
                                  color: "#fff",
                                  textDecoration: "none",
                                  fontWeight: 800,
                                  padding: "9px 12px",
                                  borderRadius: 10,
                                  fontSize: 13,
                                }}
                              >
                                ดูสินค้า
                              </a>
                            </div>
                          ) : msgType === "image" ? (
                            <div
                              style={{
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: 14,
                                padding: 6,
                                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.imageUrl || ""}
                                alt="image"
                                style={{
                                  display: "block",
                                  maxWidth: 280,
                                  maxHeight: 280,
                                  borderRadius: 10,
                                  objectFit: "cover",
                                }}
                              />
                              {msg.message ? (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 13,
                                    color: "#222",
                                    padding: "0 4px 4px",
                                    whiteSpace: "pre-wrap",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {msg.message}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div
                              style={{
                                background: "#fff7ed",
                                color: "#111827",
                                border: "2px solid #f97316",
                                boxShadow: "0 8px 18px rgba(249,115,22,0.22)",
                                borderRadius: 16,
                                padding: "8px 12px",
                                display: "inline-block",
                                alignSelf: isMine ? "flex-end" : "flex-start",
                                width: "fit-content",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.5,
                                fontSize: 14,
                                wordBreak: "break-word",
                              }}
                            >
                              {msg.message}
                            </div>
                          )}
                          {/* ============================================= */}

                          <div
                            style={{
                              fontSize: 11,
                              color: "#888",
                              textAlign: isMine ? "right" : "left",
                              padding: "0 6px",
                            }}
                          >
                            {formatDateTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                <div ref={bottomRef} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
