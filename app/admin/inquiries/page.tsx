"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

export default function AdminInquiriesPage() {
  const [me, setMe] = useState<UserMe | null>(null);
  const [rooms, setRooms] = useState<InquiryRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [search, setSearch] = useState("");

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
          setRooms((prev) => prev.filter((room) => room.id !== payload.room!.id));

          setSelectedRoomId((prev) => {
            if (prev === payload.room?.id) {
              const remaining = rooms.filter((room) => room.id !== payload.room?.id);
              return remaining[0]?.id || "";
            }
            return prev;
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
  }, [me?.id, rooms]);

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
          gridTemplateColumns: "360px minmax(0,1fr)",
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
                      {last
                        ? `${last.senderName}: ${last.message}`
                        : "ยังไม่มีข้อความ"}
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
                    const isMine = msg.sender === "admin";

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
                      minWidth: 120,
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
    </>
  );
}