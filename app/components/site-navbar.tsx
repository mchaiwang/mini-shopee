"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type CurrentUser = {
  id: string;
  name: string;
  email?: string;
  role: "admin" | "customer" | string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
};

const navButtonBaseStyle: React.CSSProperties = {
  textDecoration: "none",
  height: "42px",
  padding: "0 16px",
  borderRadius: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontSize: "14px",
  fontWeight: 800,
  whiteSpace: "nowrap",
  transition: "all 0.18s ease",
};

const shopeePrimaryButtonStyle: React.CSSProperties = {
  ...navButtonBaseStyle,
  background: "#ee4d2d",
  color: "#fff",
  border: "1px solid #ee4d2d",
  boxShadow: "0 4px 10px rgba(238,77,45,0.18)",
};

const shopeeOutlineButtonStyle: React.CSSProperties = {
  ...navButtonBaseStyle,
  background: "#fff",
  color: "#ee4d2d",
  border: "1px solid #ee4d2d",
  boxShadow: "0 2px 8px rgba(238,77,45,0.08)",
};

const shopeeSoftButtonStyle: React.CSSProperties = {
  ...navButtonBaseStyle,
  background: "#fff7f5",
  color: "#ee4d2d",
  border: "1px solid #ffd0c5",
  boxShadow: "0 2px 8px rgba(238,77,45,0.08)",
};

export default function SiteNavbar() {
  const router = useRouter();
  const isMobile = useIsMobile(720); // navbar collapse ที่จอ ≤720px (เผื่อ tablet เล็ก)
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatBadgeBlink, setChatBadgeBlink] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadUser = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        setUser(null);
        return;
      }

      const data = await res.json();
      setUser(data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const getReadKey = (roomId: string, role?: string) => {
    return role === "admin" ? `admin_chat_read_${roomId}` : `chat_read_${roomId}`;
  };

  const countUnreadMessages = (rooms: any[], currentUser: CurrentUser | null) => {
    if (!currentUser || !Array.isArray(rooms)) return 0;

    const oppositeSender = currentUser.role === "admin" ? "customer" : "admin";

    return rooms.reduce((sum, room) => {
      const messages = Array.isArray(room?.messages) ? room.messages : [];
      const oppositeMessages = messages.filter(
        (msg: any) => String(msg?.sender || "") === oppositeSender
      );

      const readKey = getReadKey(String(room?.id || ""), currentUser.role);
      const readCount = Number(localStorage.getItem(readKey) || 0);

      return sum + Math.max(oppositeMessages.length - readCount, 0);
    }, 0);
  };

  const loadChatUnreadCount = async (currentUser = user) => {
    try {
      if (!currentUser?.id) {
        setChatUnreadCount(0);
        return;
      }

      const url =
        currentUser.role === "admin"
          ? "/api/inquiries?admin=1"
          : "/api/inquiries?all=1";

      const res = await fetch(url, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        setChatUnreadCount(0);
        return;
      }

      const data = await res.json().catch(() => null);

      let rooms: any[] = [];
      if (Array.isArray(data?.rooms)) {
        rooms = data.rooms;
      } else if (data?.room) {
        rooms = [data.room];
      }

      setChatUnreadCount(countUnreadMessages(rooms, currentUser));
    } catch {
      setChatUnreadCount(0);
    }
  };

  useEffect(() => {
    loadUser();

    const onAuthChanged = () => loadUser();
    const onFocus = () => loadUser();

    window.addEventListener("auth-changed", onAuthChanged);
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setChatUnreadCount(0);
      return;
    }

    loadChatUnreadCount(user);

    const timer = window.setInterval(() => {
      loadChatUnreadCount(user);
    }, 5000);

    const onChatRead = () => loadChatUnreadCount(user);
    const onFocus = () => loadChatUnreadCount(user);

    window.addEventListener("chat-read", onChatRead);
    window.addEventListener("focus", onFocus);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("chat-read", onChatRead);
      window.removeEventListener("focus", onFocus);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setChatBadgeBlink((prev) => !prev);
    }, 650);

    return () => window.clearInterval(timer);
  }, []);

  // ปิด menu เมื่อเปลี่ยนจาก mobile -> desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // lock scroll body เมื่อเปิด menu
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch {}

    localStorage.removeItem("cart");
    localStorage.removeItem("adminLoggedIn");

    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  const isCreatorApproved = useMemo(() => {
    return user?.creatorEnabled === true || user?.creatorStatus === "approved";
  }, [user]);

  // ปุ่มแชทพร้อม badge — แยกออกมาเพราะใช้ทั้ง desktop + mobile
  const ChatLink = ({ inMenu = false }: { inMenu?: boolean }) => {
    const href = user?.role === "admin" ? "/admin/inquiries" : "/my-chats";

    if (inMenu) {
      return (
        <Link
          href={href}
          className="mobile-menu-item"
          onClick={() => setMenuOpen(false)}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ flex: 1 }}>ห้องแชท</span>
          {chatUnreadCount > 0 ? (
            <span
              style={{
                minWidth: 22,
                height: 22,
                padding: "0 7px",
                borderRadius: 999,
                background: "#ff1744",
                color: "#fff",
                fontSize: 12,
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
            >
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          ) : null}
        </Link>
      );
    }

    return (
      <Link
        href={href}
        style={{
          ...shopeePrimaryButtonStyle,
          position: "relative",
          overflow: "visible",
        }}
      >
        <span>💬</span>
        <span>ห้องแชท</span>
        {chatUnreadCount > 0 ? (
          <span
            style={{
              position: "absolute",
              top: -9,
              right: -9,
              minWidth: 24,
              height: 24,
              padding: "0 7px",
              borderRadius: 999,
              background: chatBadgeBlink ? "#ff1744" : "#ff6b81",
              color: "#fff",
              fontSize: 12,
              fontWeight: 900,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #fff",
              boxShadow: chatBadgeBlink
                ? "0 0 0 6px rgba(255,23,68,.18)"
                : "0 0 14px rgba(255,23,68,.55)",
              transform: chatBadgeBlink ? "scale(1.12)" : "scale(1)",
              transition: "all .28s ease",
              lineHeight: 1,
            }}
          >
            {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <header
      style={{
        width: "100%",
        background:
          "linear-gradient(135deg, #ee4d2d 0%, #ff6633 55%, #ff8b61 100%)",
        boxShadow: "0 8px 20px rgba(238,77,45,0.18)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: isMobile ? "10px 14px" : "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: isMobile ? "10px" : "14px",
          flexWrap: isMobile ? "nowrap" : "wrap",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            textDecoration: "none",
            color: "#fff",
            fontWeight: 900,
            fontSize: isMobile ? "17px" : "20px",
            minWidth: 0,
            flex: isMobile ? "1 1 auto" : "none",
          }}
        >
          <div
            style={{
              width: isMobile ? 36 : 42,
              height: isMobile ? 36 : 42,
              borderRadius: 10,
              background: "#fff",
              color: "#ee4d2d",
              display: "grid",
              placeItems: "center",
              fontSize: isMobile ? 18 : 21,
              fontWeight: 900,
              boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
              flexShrink: 0,
            }}
          >
            🌿
          </div>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            จำรัสฟาร์ม
          </span>
        </Link>

        {/* ===== MOBILE: hamburger button ===== */}
        {isMobile ? (
          loading ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.18)",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              ...
            </div>
          ) : !user ? (
            <Link
              href="/login"
              style={{
                ...shopeeOutlineButtonStyle,
                background: "#fff",
                height: 40,
                padding: "0 14px",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              เข้าสู่ระบบ
            </Link>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {/* ปุ่มแชทแสดงเด่นบน mobile (มี badge ดูง่าย) */}
              <Link
                href={user.role === "admin" ? "/admin/inquiries" : "/my-chats"}
                aria-label="ห้องแชท"
                style={{
                  position: "relative",
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "#fff",
                  color: "#ee4d2d",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                💬
                {chatUnreadCount > 0 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      minWidth: 20,
                      height: 20,
                      padding: "0 5px",
                      borderRadius: 999,
                      background: chatBadgeBlink ? "#ff1744" : "#ff6b81",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 900,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #fff",
                      lineHeight: 1,
                    }}
                  >
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </span>
                ) : null}
              </Link>

              <button
                onClick={() => setMenuOpen(true)}
                aria-label="เปิดเมนู"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: "#fff",
                  color: "#ee4d2d",
                  border: "none",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: 22,
                  flexShrink: 0,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                }}
              >
                ☰
              </button>
            </div>
          )
        ) : /* ===== DESKTOP ===== */
        loading ? (
          <div
            style={{
              minWidth: "240px",
              padding: "12px 20px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.18)",
              color: "#fff",
              textAlign: "center",
              fontWeight: 800,
            }}
          >
            กำลังโหลด...
          </div>
        ) : !user ? (
          <Link
            href="/login"
            style={{
              ...shopeeOutlineButtonStyle,
              background: "#fff",
              minHeight: 44,
            }}
          >
            เข้าสู่ระบบ / สมัครสมาชิก
          </Link>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              borderRadius: "10px",
              background: "#fff",
              boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "42px",
                padding: "0 14px",
                borderRadius: "4px",
                background: "#fff7f5",
                border: "1px solid #ffd7cf",
                color: "#111827",
                fontWeight: 900,
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              👋 {user.name}
            </div>

            <Link href="/orders" style={shopeePrimaryButtonStyle}>
              <span>📦</span>
              <span>การซื้อของฉัน</span>
            </Link>

            <ChatLink />

            <Link
              href="/account/finance"
              style={
                isCreatorApproved
                  ? shopeeOutlineButtonStyle
                  : shopeeSoftButtonStyle
              }
            >
              <span>🪙</span>
              <span>ครีเอเตอร์/การเงิน</span>
            </Link>

            {user.role === "admin" && (
              <Link
                href="/admin"
                style={{
                  ...shopeePrimaryButtonStyle,
                  background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
                }}
              >
                หลังบ้าน
              </Link>
            )}

            <Link href="/profile" style={shopeeSoftButtonStyle}>
              <span>👤</span>
              <span>บัญชีของฉัน</span>
            </Link>

            <button
              onClick={handleLogout}
              style={{
                height: "42px",
                padding: "0 16px",
                borderRadius: 4,
                border: "1px solid #ef4444",
                background: "#ef4444",
                color: "#fff",
                fontWeight: 900,
                fontSize: "14px",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(239,68,68,0.16)",
                whiteSpace: "nowrap",
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>

      {/* ===== MOBILE MENU OVERLAY ===== */}
      {isMobile && menuOpen && user ? (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="mobile-menu-panel" aria-label="เมนูหลัก">
            {/* header ของ panel */}
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background:
                  "linear-gradient(135deg, #ee4d2d 0%, #ff6633 55%, #ff8b61 100%)",
                color: "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 700 }}>
                  สวัสดีครับ
                </div>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  👋 {user.name}
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="ปิดเมนู"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "none",
                  background: "rgba(255,255,255,0.22)",
                  color: "#fff",
                  fontSize: 20,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <Link
              href="/orders"
              className="mobile-menu-item"
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>📦</span>
              <span>การซื้อของฉัน</span>
            </Link>

            <ChatLink inMenu />

            <Link
              href="/account/finance"
              className="mobile-menu-item"
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>🪙</span>
              <span>
                ครีเอเตอร์/การเงิน
                {isCreatorApproved ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      color: "#027a48",
                      background: "#ecfdf3",
                      border: "1px solid #a6f4c5",
                      padding: "2px 6px",
                      borderRadius: 999,
                      fontWeight: 800,
                    }}
                  >
                    อนุมัติแล้ว
                  </span>
                ) : null}
              </span>
            </Link>

            <Link
              href="/profile"
              className="mobile-menu-item"
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>👤</span>
              <span>บัญชีของฉัน</span>
            </Link>

            {user.role === "admin" && (
              <Link
                href="/admin"
                className="mobile-menu-item"
                onClick={() => setMenuOpen(false)}
                style={{ color: "#ee4d2d", fontWeight: 900 }}
              >
                <span style={{ fontSize: 20 }}>⚙️</span>
                <span>หลังบ้าน</span>
              </Link>
            )}

            <button
              onClick={() => {
                setMenuOpen(false);
                handleLogout();
              }}
              className="mobile-menu-item danger"
              style={{
                background: "transparent",
                border: "none",
                width: "100%",
                textAlign: "left",
                cursor: "pointer",
                marginTop: "auto",
              }}
            >
              <span style={{ fontSize: 20 }}>🚪</span>
              <span>ออกจากระบบ</span>
            </button>
          </nav>
        </>
      ) : null}
    </header>
  );
}
