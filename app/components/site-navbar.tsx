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
const ORANGE_DARK = "#d9381e";
const ORANGE_LIGHT = "#fff7f5";

const navButtonBaseStyle: React.CSSProperties = {
  textDecoration: "none",
  height: "38px",
  padding: "0 16px",
  borderRadius: "10px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontSize: "13px",
  fontWeight: 900,
  whiteSpace: "nowrap",
  transition: "all 0.18s ease",
  border: "1px solid rgba(255,255,255,0.65)",
  background: ORANGE,
  color: "#fff",
  cursor: "pointer",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 10px rgba(120,35,15,0.22)",
};

const activeButtonStyle: React.CSSProperties = {
  background: "#fff",
  color: ORANGE,
  border: "1px solid #fff",
  boxShadow:
    "0 0 0 2px rgba(255,255,255,0.28), 0 6px 14px rgba(120,35,15,0.24)",
  transform: "translateY(-1px)",
};

const logoutButtonStyle: React.CSSProperties = {
  ...navButtonBaseStyle,
  background: ORANGE_DARK,
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.8)",
};

export default function SiteNavbar() {
  const pathname = usePathname();
  const isMobile = useIsMobile(720);

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatBadgeBlink, setChatBadgeBlink] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const trackHref = user ? "/orders" : "/guest-orders";

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const isTrackActive = isActive("/orders") || isActive("/guest-orders");

  const getNavStyle = (active: boolean): React.CSSProperties => ({
    ...navButtonBaseStyle,
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

    let lastUserCheck = Date.now();
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastUserCheck < 60_000) return;
      lastUserCheck = now;
      loadUser();
    };

    window.addEventListener("auth-changed", onAuthChanged);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("auth-changed", onAuthChanged);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setChatUnreadCount(0);
      return;
    }

    let stopped = false;
    let timer: number | null = null;
    const POLL_INTERVAL = 30_000;

    const tick = () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        loadChatUnreadCount(user);
      }
    };

    tick();
    timer = window.setInterval(tick, POLL_INTERVAL);

    const onChatRead = () => loadChatUnreadCount(user);
    const onChatUpdated = () => loadChatUnreadCount(user);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        loadChatUnreadCount(user);
      }
    };

    window.addEventListener("chat-read", onChatRead);
    window.addEventListener("chat-updated", onChatUpdated);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopped = true;
      if (timer != null) window.clearInterval(timer);
      window.removeEventListener("chat-read", onChatRead);
      window.removeEventListener("chat-updated", onChatUpdated);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (chatUnreadCount <= 0) {
      setChatBadgeBlink(false);
      return;
    }

    const timer = window.setInterval(() => {
      setChatBadgeBlink((prev) => !prev);
    }, 900);

    return () => window.clearInterval(timer);
  }, [chatUnreadCount]);

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
        cache: "no-store",
        credentials: "include",
      });
    } catch {}

    localStorage.removeItem("cart");
    localStorage.removeItem("adminLoggedIn");

    window.dispatchEvent(new Event("auth-changed"));
    // hard navigate + cache bust → กัน LINE/Chrome มือถือเอา HTML เก่ามาแสดง
    // ทำให้หน้าใหม่โหลดสด ไม่ค้างอยู่กับ user เก่า
    window.location.href = `/login?v=${Date.now()}`;
  };

  const isCreatorApproved = useMemo(() => {
    return user?.creatorEnabled === true || user?.creatorStatus === "approved";
  }, [user]);

  const TrackOrderButton = ({ inMenu = false }: { inMenu?: boolean }) => {
    if (inMenu) {
      return (
        <Link
          href={trackHref}
          className={`mobile-menu-item ${isTrackActive ? "active" : ""}`}
          onClick={() => setMenuOpen(false)}
        >
          <span style={{ fontSize: 20 }}>📦</span>
          <span style={{ flex: 1 }}>
            {user ? "การซื้อของฉัน" : "ติดตามคำสั่งซื้อ / ทวงของ"}
          </span>
        </Link>
      );
    }

    return (
      <Link href={trackHref} style={getNavStyle(isTrackActive)}>
        <span>📦</span>
        <span>{user ? "การซื้อของฉัน" : "ติดตามคำสั่งซื้อ"}</span>
      </Link>
    );
  };

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
        background: "linear-gradient(180deg, #f04424 0%, #ee4d2d 100%)",
        boxShadow: "0 4px 14px rgba(120,35,15,0.18)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: isMobile ? "10px 12px" : "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "center",
          gap: "10px",
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
            gap: "9px",
            textDecoration: "none",
            color: "#fff",
            fontWeight: 900,
            fontSize: isMobile ? "16px" : "18px",
            minWidth: 0,
            flex: isMobile ? "1 1 auto" : "0 0 auto",
            padding: isMobile ? "7px 9px" : "7px 12px",
            borderRadius: "14px",
            background: "linear-gradient(180deg, #ff6b4a 0%, #f04424 100%)",
            border: "2px solid rgba(255,255,255,0.9)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 14px rgba(130,35,15,0.28), 0 2px 0 rgba(140,40,20,0.45)",
          }}
        >
          <div
            style={{
              width: isMobile ? 36 : 38,
              height: isMobile ? 36 : 38,
              borderRadius: 10,
              background: "#fff",
              color: ORANGE,
              display: "grid",
              placeItems: "center",
              fontSize: isMobile ? 18 : 20,
              fontWeight: 900,
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,0.9), 0 4px 9px rgba(0,0,0,0.16)",
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
              textShadow: "0 2px 3px rgba(0,0,0,0.22)",
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
                boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
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
                background: "#fff",
                color: ORANGE,
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              ...
            </div>
          ) : !user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/guest-orders"
                aria-label="ติดตามคำสั่งซื้อ"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "#fff",
                  color: ORANGE,
                  border: "2px solid rgba(255,255,255,0.95)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  textDecoration: "none",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
                }}
              >
                📦
              </Link>

              <Link
                href="/login"
                style={{
                  ...getNavStyle(isActive("/login")),
                  background: isActive("/login") ? "#fff" : ORANGE_DARK,
                  color: isActive("/login") ? ORANGE : "#fff",
                  height: 40,
                  padding: "0 13px",
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                เข้าสู่ระบบ
              </Link>
            </div>
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
                href="/orders"
                aria-label="ติดตามคำสั่งซื้อ"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: isTrackActive ? "#fff" : ORANGE_DARK,
                  color: isTrackActive ? ORANGE : "#fff",
                  border: "2px solid rgba(255,255,255,0.9)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  textDecoration: "none",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
                }}
              >
                📦
              </Link>

              <Link
                href={user.role === "admin" ? "/admin/inquiries" : "/my-chats"}
                aria-label="ห้องแชท"
                style={{
                  position: "relative",
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background:
                    isActive("/my-chats") || isActive("/admin/inquiries")
                      ? "#fff"
                      : ORANGE_DARK,
                  color:
                    isActive("/my-chats") || isActive("/admin/inquiries")
                      ? ORANGE
                      : "#fff",
                  border: "2px solid rgba(255,255,255,0.9)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  flexShrink: 0,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
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
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "#fff",
                  color: ORANGE,
                  border: "2px solid rgba(255,255,255,0.95)",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: 22,
                  flexShrink: 0,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.14)",
                }}
              >
                ☰
              </button>
            </div>
          )
        ) : loading ? (
          <div
            style={{
              minWidth: "220px",
              height: 42,
              padding: "0 18px",
              borderRadius: 12,
              background: "#fff",
              color: ORANGE,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              boxShadow: "0 6px 14px rgba(120,35,15,0.2)",
            }}
          >
            กำลังโหลด...
          </div>
        ) : !user ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              padding: "6px",
              borderRadius: 14,
              background: "rgba(255,255,255,0.22)",
              border: "1px solid rgba(255,255,255,0.45)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
            }}
          >
            <TrackOrderButton />

            <Link href="/login" style={getNavStyle(isActive("/login"))}>
              เข้าสู่ระบบ / สมัครสมาชิก
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "6px",
              borderRadius: "14px",
              background: "rgba(255,255,255,0.24)",
              border: "1px solid rgba(255,255,255,0.45)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.28), 0 6px 14px rgba(120,35,15,0.14)",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
           <Link href="/" style={getNavStyle(isActive("/"))}>
  <span>🌿</span>
  <span>
    {user?.name?.trim()
      ? user.name
      : user?.email?.split("@")[0] || "ผู้ใช้งาน"}
  </span>
</Link>

            <TrackOrderButton />

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
                    border: isActive("/account/finance")
                      ? "1px solid rgba(238,77,45,0.2)"
                      : "1px solid rgba(255,255,255,0.25)",
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

            <button onClick={handleLogout} style={logoutButtonStyle}>
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
                background: "linear-gradient(135deg, #ee4d2d 0%, #f04424 100%)",
                color: "#fff",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800 }}>
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
                  border: "1px solid rgba(255,255,255,0.55)",
                  background: "rgba(255,255,255,0.18)",
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

            <TrackOrderButton inMenu />

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