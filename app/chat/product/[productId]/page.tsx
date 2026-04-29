"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
};

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  images?: string[];
  shortDescription: string;
  category: string;
  stock: number;
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

export default function ProductChatPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Number(params.productId);

  const [me, setMe] = useState<UserMe | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [room, setRoom] = useState<InquiryRoom | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loginUrl = `/login?next=/chat/product/${productId}`;

  const goLogin = () => {
    window.location.href = loginUrl;
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

      setMe(data.user);
      return data.user;
    } catch {
      goLogin();
      return null;
    }
  };

  const loadProduct = async () => {
    try {
      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      const list = Array.isArray(data?.products) ? data.products : [];
      const found =
        list.find((p: Product) => Number(p.id) === productId) || null;
      setProduct(found);
      return found;
    } catch {
      setProduct(null);
      return null;
    }
  };

  const loadRoom = async () => {
    try {
      const res = await fetch(`/api/inquiries?productId=${productId}`, {
        cache: "no-store",
      });

      if (res.status === 401) {
        goLogin();
        return null;
      }

      const data = await res.json().catch(() => null);
      const currentRoom = data?.room || null;
      setRoom(currentRoom);
      return currentRoom;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      const user = await loadMe();
      if (!mounted || !user) return;

      await loadProduct();
      await loadRoom();

      if (mounted) {
        setLoading(false);
        scrollToBottom(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [productId]);

  useEffect(() => {
    if (!me?.id) return;

    const streamUrl = `/api/inquiries/stream?productId=${productId}`;
    const es = new EventSource(streamUrl, { withCredentials: true });

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

        if (payload.type === "room_deleted") {
          if (payload.room?.id && payload.room.id === room?.id) {
            setRoom(null);
          }
          return;
        }

        if (payload.type === "room_updated" && payload.room) {
          if (Number(payload.room.productId) !== Number(productId)) return;

          setRoom((prev) => {
            if (!prev) return payload.room!;
            if (prev.id === payload.room!.id) return payload.room!;
            return payload.room!;
          });

          scrollToBottom();
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
  }, [me?.id, productId, room?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [room?.messages?.length]);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);

      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          message: message.trim(),
        }),
      });

      if (res.status === 401) {
        goLogin();
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("sendMessage error:", data);
        return;
      }

      setMessage("");
      setRoom(data?.room || null);
      scrollToBottom();
    } catch (error) {
      console.error("sendMessage failed:", error);
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => {
    if (product?.name) return product.name;
    if (room?.productName) return room.productName;
    return `สินค้า #${productId}`;
  }, [product, room, productId]);

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
        maxWidth: 980,
        margin: "0 auto",
        padding: "20px 12px 24px",
      }}
    >
      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(15,23,42,0.08)",
        }}
      >
        <div
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid #f1f1f1",
            background: "linear-gradient(90deg,#fff7f2 0%,#ffffff 100%)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
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
              แชทสอบถามสินค้า
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 16,
                fontWeight: 800,
                color: "#222",
                lineHeight: 1.4,
              }}
            >
              {title}
            </div>

            <div
              style={{
                marginTop: 6,
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
                ผู้ใช้: {me?.name || "-"}
              </span>

              {room?.status ? (
                <span
                  style={{
                    fontSize: 12,
                    color: room.status === "open" ? "#166534" : "#92400e",
                    background:
                      room.status === "open" ? "#dcfce7" : "#fef3c7",
                    borderRadius: 999,
                    padding: "5px 10px",
                    fontWeight: 800,
                  }}
                >
                  {room.status === "open" ? "ห้องเปิดอยู่" : "ห้องถูกปิด"}
                </span>
              ) : null}

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
            </div>
          </div>

          <button
            onClick={() => router.back()}
            style={{
              border: "1px solid #ddd",
              background: "#fff",
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "pointer",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            กลับ
          </button>
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
          {!room || room.messages.length === 0 ? (
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
              <br />
              เริ่มพิมพ์คำถามเกี่ยวกับสินค้าได้เลย
            </div>
          ) : (
            room.messages.map((msg) => {
              const isMine = msg.sender === "customer";

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

                    <div
                      style={{
                        background: isMine ? "linear-gradient(135deg,#ee4d2d,#ff7a45)" : "#ffffff",
                        color: isMine ? "#fff" : "#222",
                        border: isMine
                          ? "1px solid #ee4d2d"
                          : "1px solid #d8dee9",
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="พิมพ์ข้อความ...  กด Enter เพื่อส่ง / Shift+Enter เพื่อขึ้นบรรทัดใหม่"
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
              disabled={sending || !message.trim()}
              style={{
                minWidth: 120,
                height: 46,
                border: "none",
                borderRadius: 12,
                background:
                  sending || !message.trim() ? "#bfdbfe" : "#1677ff",
                color: "#fff",
                fontWeight: 800,
                cursor:
                  sending || !message.trim() ? "not-allowed" : "pointer",
              }}
            >
              {sending ? "กำลังส่ง..." : "ส่ง"}
              
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}