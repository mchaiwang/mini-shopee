"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ToastProvider";

type UserMe = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

type ChatMessage = {
  id: string;
  sender: "customer" | "admin";
  senderName: string;
  message: string;
  createdAt: string;
  type?: "text" | "product" | "image";
  productId?: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  imageUrl?: string;
};

type OrderItemSnapshot = {
  id?: string | number;
  name?: string;
  image?: string;
  qty?: number;
  price?: number;
};

type OrderSnapshot = {
  orderId: string;
  customerName?: string;
  phone?: string;
  address?: string;
  total?: number;
  status?: string;
  items?: OrderItemSnapshot[];
  createdAt?: string;
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
  orderId?: string;
  isGuest?: boolean;
  guestToken?: string;
  guestPhone?: string;
  customerPhone?: string;
  channel?: "inquire" | "order_chat" | "remind";
  orderSnapshot?: OrderSnapshot;
};

type StreamPayload = {
  type?: "connected" | "room_updated" | "room_deleted";
  room?: InquiryRoom;
  at?: string;
};

const GUEST_TOKEN_PREFIX = "guest_token:";

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

function getMessageType(msg: ChatMessage): "text" | "product" | "image" {
  if (msg.type === "product" || msg.type === "image" || msg.type === "text") {
    return msg.type;
  }
  return "text";
}

function readGuestToken(orderId: string): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(GUEST_TOKEN_PREFIX + orderId) || "";
  } catch {
    return "";
  }
}

function writeGuestToken(orderId: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_TOKEN_PREFIX + orderId, token);
  } catch {
    /* ignore */
  }
}

function OrderChatInner() {
  const { showToast } = useToast();

  const searchParams = useSearchParams();
  const orderIdParam = String(searchParams.get("orderId") || "").trim();
  const sourceParam =
    (searchParams.get("source") as "order_chat" | "remind" | null) ||
    "order_chat";
  const guestPhoneParam = String(
    searchParams.get("phone") || ""
  ).trim();
  const guestNameParam = String(searchParams.get("name") || "").trim();

  const [me, setMe] = useState<UserMe | null>(null);
  const [meChecked, setMeChecked] = useState(false);
  const [room, setRoom] = useState<InquiryRoom | null>(null);
  const [guestToken, setGuestToken] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }, 60);
  };

  // Step 1: check login
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        if (!alive) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          setMe(data?.user || null);
        } else {
          setMe(null);
        }
      } catch {
        if (alive) setMe(null);
      } finally {
        if (alive) setMeChecked(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Step 2: open or fetch the order room (after login state known)
  useEffect(() => {
    if (!meChecked) return;
    if (!orderIdParam) {
      setLoading(false);
      setError("ไม่พบเลขคำสั่งซื้อ");
      return;
    }

    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const existingToken = readGuestToken(orderIdParam);

        // POST to /api/inquiries with orderId — server will create or reuse
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (!me && existingToken) {
          headers["x-guest-token"] = existingToken;
        }

        const body: any = {
          orderId: orderIdParam,
          source: sourceParam === "remind" ? "remind" : "order_chat",
        };

        if (!me) {
          if (existingToken) body.guestToken = existingToken;
          if (guestPhoneParam) body.guestPhone = guestPhoneParam;
          if (guestNameParam) body.guestName = guestNameParam;
        }

        const res = await fetch("/api/inquiries", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => null);

        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setError(
            data?.error ||
              "เปิดห้องแชทไม่สำเร็จ กรุณาตรวจสอบสิทธิ์ของคุณอีกครั้ง"
          );
          setLoading(false);
          return;
        }

        // Store guest token for next time
        if (!me && data.guestToken) {
          writeGuestToken(orderIdParam, data.guestToken);
          setGuestToken(data.guestToken);
        } else if (!me && existingToken) {
          setGuestToken(existingToken);
        }

        setRoom(data.room);
        setLoading(false);
        scrollToBottom(false);
      } catch (err) {
        console.error(err);
        if (alive) {
          setError("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meChecked, orderIdParam]);

  // Step 3: realtime subscribe
  useEffect(() => {
    if (!room?.id) return;

    const url = guestToken
      ? `/api/inquiries/stream?guestToken=${encodeURIComponent(guestToken)}`
      : `/api/inquiries/stream`;

    const es = new EventSource(url, { withCredentials: true });

    es.onopen = () => setLiveConnected(true);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as StreamPayload;
        if (payload.type === "connected") {
          setLiveConnected(true);
          return;
        }
        if (
          payload.type === "room_updated" &&
          payload.room &&
          payload.room.id === room.id
        ) {
          setRoom(payload.room);
          scrollToBottom();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    es.onerror = () => setLiveConnected(false);

    return () => {
      es.close();
      setLiveConnected(false);
    };
  }, [room?.id, guestToken]);

  const sendMessage = async () => {
    if (!room?.id || !message.trim() || sending) return;
    if (room.status === "closed") {
      showToast("error", "ห้องแชทถูกปิดแล้ว");
      return;
    }

    try {
      setSending(true);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (!me && guestToken) {
        headers["x-guest-token"] = guestToken;
      }

      const res = await fetch("/api/inquiries", {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({
          id: room.id,
          message: message.trim(),
          type: "text",
          ...(guestToken && !me ? { guestToken } : {}),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast("error", data?.error || "ส่งข้อความไม่สำเร็จ");
        return;
      }

      if (data?.room) setRoom(data.room);
      setMessage("");
      scrollToBottom();
    } catch (err) {
      console.error(err);
      showToast("error", "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  };

  const orderSnap = room?.orderSnapshot;

  const itemsPreview = useMemo(() => {
    if (!orderSnap?.items) return [];
    return orderSnap.items;
  }, [orderSnap]);

  if (loading) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <div style={{ textAlign: "center", padding: 30 }}>
            กำลังเปิดห้องแชท...
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <h1 style={{ marginTop: 0, color: "#ee4d2d" }}>เปิดแชทไม่สำเร็จ</h1>
          <p style={{ color: "#475569", lineHeight: 1.7 }}>{error}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <Link href="/guest-orders" style={primaryBtn}>
              กลับไปหน้าตรวจสอบคำสั่งซื้อ
            </Link>
            <Link href="/" style={ghostBtn}>
              กลับหน้าแรก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main style={pageWrap}>
        <div style={card}>
          <h1>ไม่พบห้องแชท</h1>
        </div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      {/* Header card with order info */}
      <div style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={badge}>
            {room.channel === "remind" ? "ทวงของ" : "แชทคำสั่งซื้อ"}
          </span>
          <span style={pillStatus(room.status)}>
            {room.status === "open" ? "ห้องเปิดอยู่" : "ห้องถูกปิด"}
          </span>
          <span
            style={{
              ...pill,
              background: liveConnected ? "#dcfce7" : "#fff7ed",
              color: liveConnected ? "#166534" : "#c2410c",
            }}
          >
            {liveConnected ? "Realtime พร้อมใช้งาน" : "กำลังเชื่อมต่อสด..."}
          </span>
        </div>

        <h1 style={titleStyle}>
          คำสั่งซื้อ #{room.orderId || orderSnap?.orderId || "-"}
        </h1>

        <div style={infoGrid}>
          {orderSnap?.customerName ? (
            <div>
              <b>ชื่อผู้รับ:</b> {orderSnap.customerName}
            </div>
          ) : null}
          {orderSnap?.phone ? (
            <div>
              <b>เบอร์โทร:</b> {orderSnap.phone}
            </div>
          ) : null}
          {orderSnap?.status ? (
            <div>
              <b>สถานะ:</b> {orderSnap.status}
            </div>
          ) : null}
          {orderSnap?.total ? (
            <div>
              <b>ยอดรวม:</b> ฿{Number(orderSnap.total).toLocaleString("th-TH")}
            </div>
          ) : null}
        </div>

        {itemsPreview.length > 0 ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              รายการสินค้า
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {itemsPreview.map((it, idx) => (
                <div key={idx} style={itemRow}>
                  <div style={imageBox}>
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.image}
                        alt={it.name || ""}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ color: "#94a3b8", fontSize: 11 }}>ไม่มีรูป</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#0f172a" }}>
                      {it.name || "สินค้า"}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>
                      จำนวน {Number(it.qty || 1)}
                      {it.price ? ` • ฿${Number(it.price).toLocaleString("th-TH")}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Chat card */}
      <div
        style={{
          ...card,
          padding: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={chatHeader}>
          <div style={{ fontWeight: 900, color: "#0f172a" }}>
            แชทกับร้านค้า
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            {room.isGuest ? "ลูกค้าไม่ลงทะเบียน" : "สมาชิก"}
            {" • "}
            {room.customerName}
          </div>
        </div>

        <div style={chatBody}>
          {room.messages.length === 0 ? (
            <div style={emptyMsg}>ยังไม่มีข้อความในห้องนี้</div>
          ) : (
            room.messages.map((msg) => {
              const isMine = msg.sender === "customer";
              const t = getMessageType(msg);
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{ maxWidth: "82%", display: "grid", gap: 4 }}>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 700,
                        textAlign: isMine ? "right" : "left",
                        padding: "0 6px",
                      }}
                    >
                      {msg.senderName}
                    </div>

                    {t === "image" && msg.imageUrl ? (
                      <div style={imageBubble}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.imageUrl}
                          alt="image"
                          style={{
                            display: "block",
                            maxWidth: 260,
                            maxHeight: 260,
                            borderRadius: 10,
                            objectFit: "cover",
                          }}
                        />
                        {msg.message ? (
                          <div style={{ marginTop: 6, color: "#222", fontSize: 13 }}>
                            {msg.message}
                          </div>
                        ) : null}
                      </div>
                    ) : t === "product" ? (
                      <div style={productBubble}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.productImage || "/no-image.png"}
                          alt={msg.productName || "product"}
                          style={{
                            width: "100%",
                            height: 140,
                            objectFit: "cover",
                            borderRadius: 10,
                          }}
                        />
                        <div
                          style={{
                            marginTop: 8,
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          {msg.productName || `สินค้า #${msg.productId}`}
                        </div>
                        {msg.productSlug ? (
                          <a
                            href={`/product/${msg.productSlug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={productLinkBtn}
                          >
                            ดูสินค้า
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <div style={textBubble(isMine)}>{msg.message}</div>
                    )}

                    <div
                      style={{
                        fontSize: 11,
                        color: "#94a3b8",
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

        <div style={chatFooter}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="พิมพ์ข้อความถึงร้านค้า... (Enter ส่ง / Shift+Enter ขึ้นบรรทัด)"
            rows={2}
            disabled={room.status === "closed"}
            style={textareaStyle}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !message.trim() || room.status === "closed"}
            style={{
              ...sendButton,
              opacity:
                sending || !message.trim() || room.status === "closed"
                  ? 0.55
                  : 1,
              cursor:
                sending || !message.trim() || room.status === "closed"
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {sending ? "กำลังส่ง..." : "ส่ง"}
          </button>
        </div>

        {room.status === "closed" ? (
          <div style={closedNotice}>
            ห้องนี้ถูกปิดแล้ว หากต้องการสอบถามเพิ่มเติมโปรดติดต่อร้านในช่องทางอื่น
          </div>
        ) : null}
      </div>

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link href="/guest-orders" style={ghostBtn}>
          ← กลับไปหน้าคำสั่งซื้อ
        </Link>
      </div>
    </main>
  );
}

export default function OrderChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>กำลังโหลด...</div>}>
      <OrderChatInner />
    </Suspense>
  );
}

// ===== styles =====
const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#fff7f2",
  padding: "20px 12px 36px",
};

const card: React.CSSProperties = {
  maxWidth: 820,
  margin: "0 auto 14px",
  background: "#fff",
  border: "1px solid #ffe0d7",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 10px 26px rgba(238,77,45,0.08)",
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0 8px",
  fontSize: 26,
  fontWeight: 900,
  color: "#0f172a",
};

const badge: React.CSSProperties = {
  background: "#fff1ec",
  color: "#ee4d2d",
  border: "1px solid #ffd2c4",
  borderRadius: 999,
  padding: "5px 11px",
  fontWeight: 900,
  fontSize: 12,
};

const pill: React.CSSProperties = {
  borderRadius: 999,
  padding: "5px 11px",
  fontWeight: 800,
  fontSize: 12,
};

const pillStatus = (s: "open" | "closed"): React.CSSProperties => ({
  ...pill,
  background: s === "open" ? "#dcfce7" : "#fef3c7",
  color: s === "open" ? "#166534" : "#92400e",
});

const infoGrid: React.CSSProperties = {
  marginTop: 10,
  display: "grid",
  gap: 6,
  color: "#334155",
  lineHeight: 1.7,
};

const itemRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  background: "#fffaf8",
  border: "1px solid #ffe4dc",
  borderRadius: 14,
  padding: 8,
  alignItems: "center",
};

const imageBox: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const chatHeader: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: "1px solid #f1f1f1",
  background: "linear-gradient(90deg,#fff7f2 0%,#ffffff 100%)",
};

const chatBody: React.CSSProperties = {
  height: "55vh",
  minHeight: 360,
  maxHeight: "65vh",
  overflowY: "auto",
  padding: 14,
  background: "#f6f8fb",
  display: "grid",
  gap: 10,
};

const emptyMsg: React.CSSProperties = {
  margin: "auto",
  color: "#777",
  background: "#fff",
  border: "1px dashed #d7d7d7",
  borderRadius: 12,
  padding: "16px 18px",
  textAlign: "center",
  maxWidth: 360,
  lineHeight: 1.7,
};

const textBubble = (isMine: boolean): React.CSSProperties => ({
  background: isMine ? "linear-gradient(135deg,#ee4d2d,#ff7a45)" : "#ffffff",
  color: isMine ? "#fff" : "#222",
  border: isMine ? "1px solid #ee4d2d" : "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "10px 14px",
  whiteSpace: "pre-wrap",
  lineHeight: 1.6,
  fontSize: 14,
  wordBreak: "break-word",
});

const imageBubble: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 6,
};

const productBubble: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 10,
  width: 240,
};

const productLinkBtn: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  textAlign: "center",
  background: "#ee4d2d",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  padding: "8px 12px",
  borderRadius: 10,
  fontSize: 13,
};

const chatFooter: React.CSSProperties = {
  borderTop: "1px solid #f1f1f1",
  padding: 12,
  background: "#fff",
  display: "grid",
  gridTemplateColumns: "1fr auto",
  gap: 10,
  alignItems: "end",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid #d9d9d9",
  padding: 10,
  fontSize: 14,
  resize: "none",
  fontFamily: "inherit",
  outline: "none",
};

const sendButton: React.CSSProperties = {
  minWidth: 96,
  height: 44,
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(135deg,#ee4d2d,#ff7a45)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 14,
};

const closedNotice: React.CSSProperties = {
  padding: "8px 14px",
  fontSize: 13,
  color: "#92400e",
  background: "#fef3c7",
  borderTop: "1px solid #fde68a",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-block",
  background: "linear-gradient(135deg,#ee4d2d,#ff7337)",
  color: "#fff",
  borderRadius: 14,
  padding: "12px 18px",
  fontWeight: 900,
  textDecoration: "none",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  background: "#fff",
  color: "#ee4d2d",
  border: "1px solid #ffb9a5",
  borderRadius: 14,
  padding: "12px 18px",
  fontWeight: 900,
  textDecoration: "none",
};
