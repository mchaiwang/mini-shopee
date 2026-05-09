"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

// ✅ ADDED: lightweight Product type used only by the product-picker popup
type ProductLite = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
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

export default function AdminInquiriesPage() {
  const [me, setMe] = useState<UserMe | null>(null);
  const [rooms, setRooms] = useState<InquiryRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [search, setSearch] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // ===== ADDED: state for product picker popup & image upload =====
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // ================================================================

useEffect(() => {
  const check = () => setIsMobile(window.innerWidth <= 820);
  check();
  window.addEventListener("resize", check);
  return () => window.removeEventListener("resize", check);
}, []);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const goLogin = () => {
    window.location.href = "/login?next=/admin/inquiries";
  };

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }, 50);
  };

  const loadMe = async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.user) {
        goLogin();
        return null;
      }

      if (data.user.role !== "admin") {
        window.location.href = "/";
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
      const res = await fetch("/api/inquiries?admin=1", {
        cache: "no-store",
      });

      if (res.status === 401) {
        goLogin();
        return [];
      }

      if (res.status === 403) {
        window.location.href = "/";
        return [];
      }

      const data = await res.json().catch(() => null);
      const list = Array.isArray(data?.rooms) ? data.rooms : [];

      setRooms(list);

      setSelectedRoomId((prev) => {
        if (prev && list.some((room: InquiryRoom) => room.id === prev)) {
          return prev;
        }
        return list[0]?.id || "";
      });

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

        if (payload.type === "room_deleted" && payload.room) {
          // ✅ FIXED: use functional update — read latest list from setter callback
          // so we don't have to put `rooms` in the deps array (which caused
          // SSE reconnect loop).
          const deletedId = payload.room!.id;

          setRooms((prev) => prev.filter((room) => room.id !== deletedId));

          setSelectedRoomId((prev) => {
            if (prev !== deletedId) return prev;
            // We don't have a synchronous handle on the next list here, but
            // the next render will re-derive selectedRoom from `rooms`.
            // Pick "" to fall back; UI then auto-selects first if any.
            return "";
          });

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

            return [...next].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            );
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
    // ✅ FIXED: removed `rooms` from deps. Previously it caused the SSE
    // EventSource to be torn down + recreated on EVERY incoming message
    // (because that updated `rooms`), spamming the server.
    // We use functional state updates above so we don't need `rooms` here.
  }, [me?.id]);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return rooms;

    return rooms.filter((room) => {
      const haystack = [
        room.productName,
        room.productSlug,
        room.customerName,
        room.customerUserId,
        String(room.productId),
        room.id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rooms, search]);

  const selectedRoom = useMemo(() => {
    return rooms.find((room) => room.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    scrollToBottom();
  }, [selectedRoom?.messages?.length, selectedRoomId]);

  const sendMessage = async () => {
    if (!selectedRoom?.id || !message.trim() || sending) return;

    try {
      setSending(true);

      const res = await fetch("/api/inquiries", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedRoom.id,
          message: message.trim(),
          // ✅ ADDED (explicit, but optional — backend defaults to "text")
          type: "text",
        }),
      });

      if (res.status === 401) {
        goLogin();
        return;
      }

      if (res.status === 403) {
        alert("ไม่มีสิทธิ์ใช้งานส่วนนี้");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("sendMessage error:", data);
        alert(data?.error || "ส่งข้อความไม่สำเร็จ");
        return;
      }

      setMessage("");
      if (data?.room) {
        setRooms((prev) =>
          [data.room, ...prev.filter((room) => room.id !== data.room.id)].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
        );
        setSelectedRoomId(data.room.id);
      }

      scrollToBottom();
    } catch (error) {
      console.error("sendMessage failed:", error);
      alert("ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  // ===== ADDED: send a product card =====
  const sendProductMessage = async (product: ProductLite) => {
    if (!selectedRoom?.id || sending) return;

    try {
      setSending(true);

      const res = await fetch("/api/inquiries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRoom.id,
          type: "product",
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          productImage: product.image,
          message: "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "ส่งสินค้าไม่สำเร็จ");
        return;
      }

      if (data?.room) {
        setRooms((prev) =>
          [data.room, ...prev.filter((room) => room.id !== data.room.id)].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
        );
        setSelectedRoomId(data.room.id);
      }

      setShowProductPicker(false);
      scrollToBottom();
    } catch (error) {
      console.error("sendProductMessage failed:", error);
      alert("ส่งสินค้าไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };
  // =======================================

  // ===== ADDED: send an image message (base64 data URL) =====
  const sendImageMessage = async (file: File) => {
    if (!selectedRoom?.id || uploadingImage) return;

    // Soft size guard — keep JSON storage manageable.
    // 4 MB raw → ~5.5 MB base64. Reject above ~3 MB to stay safe.
    if (file.size > 3 * 1024 * 1024) {
      alert("ไฟล์รูปใหญ่เกินไป (สูงสุด 3 MB)");
      return;
    }

    try {
      setUploadingImage(true);

      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("read failed"));
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/inquiries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRoom.id,
          type: "image",
          imageUrl: dataUrl,
          message: "",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "ส่งรูปไม่สำเร็จ");
        return;
      }

      if (data?.room) {
        setRooms((prev) =>
          [data.room, ...prev.filter((room) => room.id !== data.room.id)].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
        );
        setSelectedRoomId(data.room.id);
      }

      scrollToBottom();
    } catch (error) {
      console.error("sendImageMessage failed:", error);
      alert("ส่งรูปไม่สำเร็จ");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  // ==========================================================

  // ===== ADDED: load product list when picker opens =====
  const openProductPicker = async () => {
    setShowProductPicker(true);
    if (products.length > 0) return; // cache after first load

    try {
      setProductsLoading(true);
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      const list: ProductLite[] = Array.isArray(data?.products)
        ? data.products.map((p: any) => ({
            id: Number(p.id),
            name: String(p.name || ""),
            slug: String(p.slug || ""),
            price: Number(p.price) || 0,
            image: String(p.image || "/no-image.png"),
          }))
        : [];
      setProducts(list);
    } catch (e) {
      console.error("loadProducts failed:", e);
    } finally {
      setProductsLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.slug, String(p.id)].join(" ").toLowerCase().includes(q)
    );
  }, [products, productSearch]);
  // =======================================================

  const updateStatus = async (status: "open" | "closed") => {
    if (!selectedRoom?.id) return;

    try {
      const res = await fetch("/api/inquiries", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedRoom.id,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }

      const data = await res.json().catch(() => null);
      if (data?.room) {
        setRooms((prev) =>
          prev.map((room) => (room.id === data.room.id ? data.room : room))
        );
      }
    } catch {
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const deleteRoom = async () => {
    if (!selectedRoom?.id) return;
    if (!confirm("ลบห้องแชทนี้ใช่หรือไม่?")) return;

    try {
      const res = await fetch(`/api/inquiries?id=${selectedRoom.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.error || "ลบห้องแชทไม่สำเร็จ");
        return;
      }

      const deletedId = selectedRoom.id;

      setRooms((prev) => {
        const next = prev.filter((room) => room.id !== deletedId);
        setSelectedRoomId(next[0]?.id || "");
        return next;
      });
    } catch {
      alert("ลบห้องแชทไม่สำเร็จ");
    }
  };

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
        padding: "20px 12px 24px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "360px minmax(0,1fr)",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
            minHeight: "78vh",
            display: "flex",
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
              Admin Chat
            </div>

            <div
              style={{
                marginTop: 6,
                fontSize: 14,
                color: "#555",
                fontWeight: 700,
              }}
            >
              ผู้ดูแล: {me?.name || "-"}
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
                ทั้งหมด {rooms.length} ห้อง
              </span>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหา ชื่อลูกค้า / สินค้า / room id"
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
                ยังไม่พบห้องแชท
              </div>
            ) : (
              filteredRooms.map((room) => {
                const last = room.messages[room.messages.length - 1];
                const active = room.id === selectedRoomId;

                // ✅ ADDED: render preview text by message type
                let lastPreview = "ยังไม่มีข้อความ";
                if (last) {
                  const t = getMessageType(last);
                  if (t === "product") {
                    lastPreview = `${last.senderName}: [สินค้า] ${last.productName || ""}`;
                  } else if (t === "image") {
                    lastPreview = `${last.senderName}: [รูปภาพ]`;
                  } else {
                    lastPreview = `${last.senderName}: ${last.message}`;
                  }
                }

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
                          {room.customerName}
                        </div>

                        {/* ===== ADDED: member/guest + channel badges ===== */}
                        <div
                          style={{
                            marginTop: 4,
                            display: "flex",
                            gap: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: 999,
                              background: room.isGuest ? "#fff7ed" : "#ecfdf5",
                              color: room.isGuest ? "#c2410c" : "#166534",
                              border: room.isGuest
                                ? "1px solid #fdba74"
                                : "1px solid #86efac",
                            }}
                          >
                            {room.isGuest ? "ลูกค้าไม่ลงทะเบียน" : "สมาชิก"}
                          </span>

                          {room.orderId ? (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 999,
                                background:
                                  room.channel === "remind"
                                    ? "#fff7ed"
                                    : "#eff6ff",
                                color:
                                  room.channel === "remind"
                                    ? "#c2410c"
                                    : "#1d4ed8",
                                border:
                                  room.channel === "remind"
                                    ? "1px solid #fdba74"
                                    : "1px solid #bfdbfe",
                              }}
                            >
                              {room.channel === "remind"
                                ? "ทวงของ"
                                : "แชทคำสั่งซื้อ"}
                            </span>
                          ) : null}
                        </div>
                        {/* ============================================= */}

                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 13,
                            color: "#555",
                            fontWeight: 700,
                            wordBreak: "break-word",
                          }}
                        >
                          {room.productName}
                        </div>

                        {/* ===== ADDED: order id + phone summary ===== */}
                        {room.orderId || room.customerPhone ? (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: "#444",
                              lineHeight: 1.5,
                            }}
                          >
                            {room.orderId ? (
                              <div>คำสั่งซื้อ: #{room.orderId}</div>
                            ) : null}
                            {room.customerPhone ? (
                              <div>โทร: {room.customerPhone}</div>
                            ) : null}
                          </div>
                        ) : null}
                        {/* ============================================= */}
                      </div>

                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          color: room.status === "open" ? "#166534" : "#92400e",
                          background:
                            room.status === "open" ? "#dcfce7" : "#fef3c7",
                          borderRadius: 999,
                          padding: "4px 8px",
                          fontWeight: 800,
                        }}
                      >
                        {room.status === "open" ? "เปิด" : "ปิด"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#666",
                        lineHeight: 1.6,
                      }}
                    >
                      ลูกค้า ID: {room.customerUserId}
                      <br />
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
                      }}
                    >
                      {lastPreview}
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
            minHeight: "78vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
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
              เลือกห้องแชททางซ้ายเพื่อเริ่มตอบลูกค้า
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
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 900,
                        color: "#ee4d2d",
                        lineHeight: 1.2,
                      }}
                    >
                      ห้องแชทสินค้า
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#222",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                      }}
                    >
                      {selectedRoom.productName}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
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
                        ลูกค้า: {selectedRoom.customerName}
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
                        Product ID: {selectedRoom.productId}
                      </span>

                      <span
                        style={{
                          fontSize: 12,
                          color:
                            selectedRoom.status === "open"
                              ? "#166534"
                              : "#92400e",
                          background:
                            selectedRoom.status === "open"
                              ? "#dcfce7"
                              : "#fef3c7",
                          borderRadius: 999,
                          padding: "5px 10px",
                          fontWeight: 800,
                        }}
                      >
                        {selectedRoom.status === "open"
                          ? "ห้องเปิดอยู่"
                          : "ห้องถูกปิด"}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#777",
                        lineHeight: 1.7,
                        wordBreak: "break-word",
                      }}
                    >
                      room id: {selectedRoom.id}
                      <br />
                      สร้างเมื่อ: {formatDateTime(selectedRoom.createdAt)}
                    </div>

                    {/* ===== ADDED: order context panel (only when room is order-bound) ===== */}
                    {selectedRoom.orderId ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: 12,
                          background: "#fffaf5",
                          border: "1px solid #ffd2c4",
                          color: "#334155",
                          fontSize: 13,
                          lineHeight: 1.7,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: selectedRoom.isGuest
                                ? "#fff7ed"
                                : "#ecfdf5",
                              color: selectedRoom.isGuest
                                ? "#c2410c"
                                : "#166534",
                              border: selectedRoom.isGuest
                                ? "1px solid #fdba74"
                                : "1px solid #86efac",
                            }}
                          >
                            {selectedRoom.isGuest
                              ? "ลูกค้าไม่ลงทะเบียน"
                              : "สมาชิก"}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background:
                                selectedRoom.channel === "remind"
                                  ? "#fff7ed"
                                  : "#eff6ff",
                              color:
                                selectedRoom.channel === "remind"
                                  ? "#c2410c"
                                  : "#1d4ed8",
                              border:
                                selectedRoom.channel === "remind"
                                  ? "1px solid #fdba74"
                                  : "1px solid #bfdbfe",
                            }}
                          >
                            ช่องทาง:{" "}
                            {selectedRoom.channel === "remind"
                              ? "ทวงของ"
                              : "ทักแชทจากคำสั่งซื้อ"}
                          </span>
                        </div>

                        <div>
                          <b>เลขคำสั่งซื้อ:</b> #{selectedRoom.orderId}
                        </div>

                        {selectedRoom.orderSnapshot?.customerName ? (
                          <div>
                            <b>ชื่อผู้รับ:</b>{" "}
                            {selectedRoom.orderSnapshot.customerName}
                          </div>
                        ) : null}

                        {(selectedRoom.customerPhone ||
                          selectedRoom.orderSnapshot?.phone) ? (
                          <div>
                            <b>เบอร์โทร:</b>{" "}
                            {selectedRoom.customerPhone ||
                              selectedRoom.orderSnapshot?.phone}
                          </div>
                        ) : null}

                        {selectedRoom.orderSnapshot?.status ? (
                          <div>
                            <b>สถานะคำสั่งซื้อ:</b>{" "}
                            {selectedRoom.orderSnapshot.status}
                          </div>
                        ) : null}

                        {selectedRoom.orderSnapshot?.total ? (
                          <div>
                            <b>ยอดรวม:</b> ฿
                            {Number(
                              selectedRoom.orderSnapshot.total
                            ).toLocaleString("th-TH")}
                          </div>
                        ) : null}

                        {Array.isArray(selectedRoom.orderSnapshot?.items) &&
                        selectedRoom.orderSnapshot!.items!.length > 0 ? (
                          <div style={{ marginTop: 6 }}>
                            <b>รายการสินค้า:</b>
                            <ul
                              style={{
                                margin: "4px 0 0",
                                paddingLeft: 18,
                              }}
                            >
                              {selectedRoom.orderSnapshot!.items!.map(
                                (it, idx) => (
                                  <li key={idx}>
                                    {it.name || "สินค้า"} x{" "}
                                    {Number(it.qty || 1)}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {/* ====================================================== */}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => updateStatus("open")}
                      style={{
                        border: "none",
                        background: "#16a34a",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      เปิดห้อง
                    </button>

                    <button
                      onClick={() => updateStatus("closed")}
                      style={{
                        border: "none",
                        background: "#f59e0b",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      ปิดห้อง
                    </button>

                    <button
                      onClick={deleteRoom}
                      style={{
                        border: "none",
                        background: "#ef4444",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      ลบห้อง
                    </button>
                  </div>
                </div>
              </div>

              <div
                style={{
                  height: isMobile ? "48vh" : "62vh",
minHeight: isMobile ? 260 : 420,
maxHeight: isMobile ? "52vh" : "72vh",
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
                    const isMine = msg.sender === "admin";
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
                                background: isMine ? "linear-gradient(135deg,#ee4d2d,#ff7a45)" : "#ffffff",
                                color: isMine ? "#fff" : "#222",
                                border: isMine
                                  ? "1px solid #1677ff"
                                  : "1px solid #e5e7eb",
                                borderRadius: 16,
                                padding: "13px 16px",
                                boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.7,
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

              <div
                style={{
                  borderTop: "1px solid #f1f1f1",
                  padding: 14,
                  background: "#fff",
                }}
              >
                {/* ===== ADDED: hidden file input for image upload ===== */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) sendImageMessage(file);
                  }}
                />
                {/* ====================================================== */}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "auto auto 1fr auto",
                    gap: 8,
                    alignItems: "end",
                  }}
                >
                  {/* ===== ADDED: + button to open product picker ===== */}
                  <button
                    type="button"
                    onClick={openProductPicker}
                    disabled={selectedRoom.status === "closed" || sending}
                    title="ส่งสินค้า"
                    style={{
                      width: 46,
                      height: 46,
                      border: "1px solid #ee4d2d",
                      background: "#fff",
                      color: "#ee4d2d",
                      borderRadius: 12,
                      fontSize: 22,
                      fontWeight: 900,
                      cursor:
                        selectedRoom.status === "closed" || sending
                          ? "not-allowed"
                          : "pointer",
                      lineHeight: 1,
                    }}
                  >
                    +
                  </button>
                  {/* ====================================================== */}

                  {/* ===== ADDED: image upload button ===== */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      selectedRoom.status === "closed" || uploadingImage
                    }
                    title="ส่งรูปภาพ"
                    style={{
                      width: 46,
                      height: 46,
                      border: "1px solid #1677ff",
                      background: "#fff",
                      color: "#1677ff",
                      borderRadius: 12,
                      fontSize: 18,
                      fontWeight: 900,
                      cursor:
                        selectedRoom.status === "closed" || uploadingImage
                          ? "not-allowed"
                          : "pointer",
                      lineHeight: 1,
                    }}
                  >
                    {uploadingImage ? "..." : "🖼"}
                  </button>
                  {/* ============================================ */}

                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="พิมพ์ข้อความตอบลูกค้า... กด Enter เพื่อส่ง / Shift+Enter เพื่อขึ้นบรรทัดใหม่"
                    rows={3}
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      border: "1px solid #d9d9d9",
                      padding: 12,
                      fontSize: 14,
                      resize: "none",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />

                  <button
                    onClick={sendMessage}
                    disabled={
                      sending ||
                      !message.trim() ||
                      selectedRoom.status === "closed"
                    }
                    style={{
                      minWidth: isMobile ? "100%" : 120,
                      height: 46,
                      border: "none",
                      borderRadius: 12,
                      background:
                        sending ||
                        !message.trim() ||
                        selectedRoom.status === "closed"
                          ? "#bfdbfe"
                          : "#1677ff",
                      color: "#fff",
                      fontWeight: 800,
                      cursor:
                        sending ||
                        !message.trim() ||
                        selectedRoom.status === "closed"
                          ? "not-allowed"
                          : "pointer",
                    }}
                  >
                    {sending ? "กำลังส่ง..." : "ส่ง"}
                  </button>
                </div>

                {selectedRoom.status === "closed" ? (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "#b45309",
                      fontWeight: 700,
                    }}
                  >
                    ห้องนี้ถูกปิดอยู่ ต้องกด “เปิดห้อง” ก่อนจึงจะส่งข้อความได้
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* ============= ADDED: PRODUCT PICKER POPUP MODAL ============= */}
    {showProductPicker ? (
      <div
        onClick={() => setShowProductPicker(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "grid",
          placeItems: "center",
          zIndex: 9999,
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            borderRadius: 16,
            width: "100%",
            maxWidth: 720,
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid #f1f1f1",
              background: "linear-gradient(90deg,#fff7f2 0%,#ffffff 100%)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#ee4d2d",
              }}
            >
              เลือกสินค้าเพื่อส่งให้ลูกค้า
            </div>
            <button
              onClick={() => setShowProductPicker(false)}
              style={{
                border: "none",
                background: "#f5f5f5",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              ปิด
            </button>
          </div>

          <div style={{ padding: 14, borderBottom: "1px solid #f1f1f1" }}>
            <input
              autoFocus
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="ค้นหาชื่อสินค้า / slug / id"
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #d9d9d9",
                padding: "11px 14px",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              overflowY: "auto",
              flex: 1,
              padding: 12,
              background: "#f8fafc",
            }}
          >
            {productsLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "#777" }}>
                กำลังโหลดสินค้า...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#777" }}>
                ไม่พบสินค้า
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0,1fr))",
                  gap: 10,
                }}
              >
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => sendProductMessage(p)}
                    disabled={sending}
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      padding: 10,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 12,
                      cursor: sending ? "not-allowed" : "pointer",
                      textAlign: "left",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image || "/no-image.png"}
                      alt={p.name}
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 8,
                        background: "#f5f5f5",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
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
                        {p.name}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 13,
                          color: "#ee4d2d",
                          fontWeight: 800,
                        }}
                      >
                        ฿{p.price.toLocaleString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    ) : null}
    {/* ================================================================ */}
    </>
  );
}
