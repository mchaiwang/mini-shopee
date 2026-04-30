"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type CurrentUser = {
  id: string;
  name: string;
  email?: string;
  role: "admin" | "customer" | string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
};

const ORANGE = "#ee4d2d";

const navButtonBaseStyle: React.CSSProperties = {
  textDecoration: "none",
  height: "42px",
  padding: "0 16px",
  borderRadius: "10px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontSize: "14px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  transition: "all 0.18s ease",
  border: `1px solid ${ORANGE}`,
  background: ORANGE,
  color: "#fff",
  boxShadow: "0 4px 10px rgba(238,77,45,0.18)",
};

const activeButtonStyle: React.CSSProperties = {
  background: "#fff",
  color: ORANGE,
  border: `2px solid ${ORANGE}`,
  boxShadow:
    "0 0 0 3px rgba(238,77,45,0.18), 0 8px 18px rgba(238,77,45,0.18)",
  transform: "translateY(-1px)",
};

const navPanelButtonStyle: React.CSSProperties = {
  ...navButtonBaseStyle,
};

export default function SiteNavbar() {
  const pathname = usePathname();
  const isMobile = useIsMobile(720);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatBadgeBlink, setChatBadgeBlink] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const getNavStyle = (active: boolean): React.CSSProperties => ({
    ...navPanelButtonStyle,
    ...(active ? activeButtonStyle : {}),
  });

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
    return role === "admin"
      ? `admin_chat_read_${roomId}`
      : `chat_read_${roomId}`;
  };

  const countUnreadMessages = (
    rooms: any[],
    currentUser: CurrentUser | null
  ) => {
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

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";

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

  const ChatLink = ({ inMenu = false }: { inMenu?: boolean }) => {
    const href = user?.role === "admin" ? "/admin/inquiries" : "/my-chats";
    const active = isActive("/my-chats") || isActive("/admin/inquiries");

    if (inMenu) {
      return (
        <Link
          href={href}
          className={`mobile-menu-item ${active ? "active" : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          <span style={{ fontSize: 20 }}>💬</span>
          <span style={{ flex: 1 }}>ห้องแชท</span>
          {chatUnreadCount > 0 ? (
            <span className="chat-count-badge">
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
          ...getNavStyle(active),
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
        background: "linear-gradient(135deg, #ee4d2d 0%, #f25a3a 100%)",
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
          title="กลับหน้าแรก"
          aria-label="จำรัสฟาร์ม กลับหน้าแรก"
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
            padding: "7px 10px",
            borderRadius: "16px",
            background: isActive("/")
              ? "rgba(255,255,255,0.22)"
              : "rgba(255,255,255,0.10)",
            border: isActive("/")
              ? "2px solid rgba(255,255,255,0.85)"
              : "1px solid rgba(255,255,255,0.35)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.35), 0 9px 18px rgba(130,35,15,0.25), 0 2px 0 rgba(120,35,15,0.35)",
            transform: isActive("/") ? "translateY(-1px)" : "translateY(0)",
          }}
        >
          <div
            style={{
              width: isMobile ? 38 : 44,
              height: isMobile ? 38 : 44,
              borderRadius: 12,
              background: "#fff",
              color: ORANGE,
              display: "grid",
              placeItems: "center",
              fontSize: isMobile ? 19 : 22,
              fontWeight: 900,
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,0.9), 0 8px 14px rgba(0,0,0,0.16), 0 3px 0 rgba(150,45,20,0.25)",
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
              textShadow: "0 2px 4px rgba(0,0,0,0.22)",
            }}
          >
            จำรัสฟาร์ม
          </span>

          {!isMobile ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                background: "#fff",
                color: ORANGE,
                borderRadius: 999,
                padding: "4px 8px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
              }}
            >
              หน้าแรก
            </span>
          ) : null}
        </Link>

        {isMobile ? (
          loading ? (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 10,
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
                ...getNavStyle(isActive("/login")),
                background: "#fff",
                color: ORANGE,
                height: 40,
                padding: "0 14px",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              เข้าสู่ระบบ
            </Link>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
              }}
            >
              <Link
                href={user.role === "admin" ? "/admin/inquiries" : "/my-chats"}
                aria-label="ห้องแชท"
                style={{
                  position: "relative",
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background:
                    isActive("/my-chats") || isActive("/admin/inquiries")
                      ? "#fff"
                      : ORANGE,
                  color:
                    isActive("/my-chats") || isActive("/admin/inquiries")
                      ? ORANGE
                      : "#fff",
                  border:
                    isActive("/my-chats") || isActive("/admin/inquiries")
                      ? `2px solid ${ORANGE}`
                      : "2px solid #fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  flexShrink: 0,
                  boxShadow:
                    isActive("/my-chats") || isActive("/admin/inquiries")
                      ? "0 0 0 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.12)"
                      : "0 4px 10px rgba(0,0,0,0.08)",
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
                  borderRadius: 12,
                  background: "#fff",
                  color: ORANGE,
                  border: "2px solid rgba(255,255,255,0.85)",
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
        ) : loading ? (
          <div
            style={{
              minWidth: "240px",
              padding: "12px 20px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.18)",
              color: "#fff",
              textAlign: "center",
              fontWeight: 800,
            }}
          >
            กำลังโหลด...
          </div>
        ) : !user ? (
          <Link href="/login" style={getNavStyle(isActive("/login"))}>
            เข้าสู่ระบบ / สมัครสมาชิก
          </Link>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              borderRadius: "14px",
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
                borderRadius: "10px",
                background: "rgba(238,77,45,0.08)",
                border: "1px solid rgba(238,77,45,0.22)",
                color: "#111827",
                fontWeight: 900,
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              👋 {user.name}
            </div>

            <Link href="/orders" style={getNavStyle(isActive("/orders"))}>
              <span>📦</span>
              <span>การซื้อของฉัน</span>
            </Link>

            <ChatLink />

            <Link
              href="/account/finance"
              style={getNavStyle(isActive("/account/finance"))}
            >
              <span>🪙</span>
              <span>ครีเอเตอร์</span>
              {isCreatorApproved ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: isActive("/account/finance")
                      ? "rgba(238,77,45,0.12)"
                      : "rgba(255,255,255,0.22)",
                    color: isActive("/account/finance") ? ORANGE : "#fff",
                  }}
                >
                  อนุมัติ
                </span>
              ) : null}
            </Link>

            {user.role === "admin" && (
              <Link href="/admin" style={getNavStyle(isActive("/admin"))}>
                <span>⚙️</span>
                <span>หลังบ้าน</span>
              </Link>
            )}

            <Link href="/profile" style={getNavStyle(isActive("/profile"))}>
              <span>👤</span>
              <span>บัญชีของฉัน</span>
            </Link>

            <button
              onClick={handleLogout}
              style={{
                ...navButtonBaseStyle,
                background: ORANGE,
                border: `1px solid ${ORANGE}`,
                color: "#fff",
                cursor: "pointer",
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        )}
      </div>

      {isMobile && menuOpen && user ? (
        <>
          <div
            className="mobile-menu-overlay"
            onClick={() => setMenuOpen(false)}
          />

          <nav className="mobile-menu-panel" aria-label="เมนูหลัก">
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #f1f5f9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                background: "linear-gradient(135deg, #ee4d2d 0%, #f25a3a 100%)",
                color: "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 700 }}>
                  เมนูผู้ใช้งาน
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
                  borderRadius: 10,
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
              href="/"
              className={`mobile-menu-item ${isActive("/") ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>🌿</span>
              <span>จำรัสฟาร์ม / กลับหน้าแรก</span>
            </Link>

            <Link
              href="/orders"
              className={`mobile-menu-item ${
                isActive("/orders") ? "active" : ""
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>📦</span>
              <span>การซื้อของฉัน</span>
            </Link>

            <ChatLink inMenu />

            <Link
              href="/account/finance"
              className={`mobile-menu-item ${
                isActive("/account/finance") ? "active" : ""
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>🪙</span>
              <span>
                ครีเอเตอร์
                {isCreatorApproved ? (
                  <span className="creator-approved-badge">อนุมัติแล้ว</span>
                ) : null}
              </span>
            </Link>

            <Link
              href="/profile"
              className={`mobile-menu-item ${
                isActive("/profile") ? "active" : ""
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span style={{ fontSize: 20 }}>👤</span>
              <span>บัญชีของฉัน</span>
            </Link>

            {user.role === "admin" && (
              <Link
                href="/admin"
                className={`mobile-menu-item ${
                  isActive("/admin") ? "active" : ""
                }`}
                onClick={() => setMenuOpen(false)}
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

      <style jsx global>{`
        .mobile-menu-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.48);
          z-index: 9998;
        }

        .mobile-menu-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: min(88vw, 360px);
          height: 100vh;
          background: #fff;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          box-shadow: -18px 0 50px rgba(15, 23, 42, 0.2);
          animation: slideMenuIn 0.18s ease;
        }

        @keyframes slideMenuIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        .mobile-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px 18px;
          color: #0f172a;
          text-decoration: none;
          font-weight: 900;
          border-bottom: 1px solid #f1f5f9;
          position: relative;
        }

        .mobile-menu-item.active {
          color: #ee4d2d;
          background: #fff7f5;
          box-shadow: inset 5px 0 0 #ee4d2d;
        }

        .mobile-menu-item.danger {
          color: #ee4d2d;
        }

        .chat-count-badge {
          min-width: 22px;
          height: 22px;
          padding: 0 7px;
          border-radius: 999px;
          background: #ff1744;
          color: #fff;
          font-size: 12px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        .creator-approved-badge {
          margin-left: 8px;
          font-size: 11px;
          color: #027a48;
          background: #ecfdf3;
          border: 1px solid #a6f4c5;
          padding: 2px 6px;
          border-radius: 999px;
          font-weight: 900;
        }
      `}</style>
    </header>
  );
}