"use client";

import { useEffect, useState } from "react";

type OrderItem = {
  id?: string | number;
  name?: string;
  title?: string;
  image?: string;
  price?: number;
  qty?: number;
  quantity?: number;
};

type GuestOrder = {
  id: string;
  status: string;
  createdAt?: string;
  name?: string;
  phone?: string;
  address?: string;
  total?: number;
  trackingNo?: string;
  shippingProvider?: string;
  items: OrderItem[];
};

function money(n: any) {
  return Number(n || 0).toLocaleString("th-TH");
}

function statusText(status: string) {
  const s = String(status || "").trim();

  if (s === "pending") return "รอตรวจสอบ";
  if (s === "approved") return "กำลังจัดเตรียมสินค้า";
  if (s === "preparing") return "กำลังจัดเตรียมสินค้า";
  if (s === "shipping") return "รอจัดส่ง";
  if (s === "shipped") return "จัดส่งแล้ว";
  if (s === "delivered") return "ได้รับสินค้าแล้ว";

  return s || "รอจัดเตรียมสินค้า";
}

function getOrderId(order: any) {
  return String(order?.id || order?.orderId || order?._id || "-");
}

function openOrderChat(opts: {
  orderId: string;
  source: "order_chat" | "remind";
  loggedIn: boolean;
  phone?: string;
  name?: string;
}) {
  const { orderId, source, loggedIn, phone, name } = opts;
  if (!orderId) return;

  const ok = window.confirm("เปิดแชทเพื่อติดตามคำสั่งซื้อนี้ใช่ไหม?");
  if (!ok) return;

  const params = new URLSearchParams();
  params.set("orderId", orderId);
  params.set("source", source);

  if (!loggedIn) {
    if (phone) params.set("phone", phone);
    if (name) params.set("name", name);
  }

  window.location.href = `/order-chat?${params.toString()}`;
}

export default function GuestOrdersPage() {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [message, setMessage] = useState("");
  const [searchedPhoneRaw, setSearchedPhoneRaw] = useState("");

  async function searchOrders() {
    const cleanPhone = phone.replace(/\D/g, "");

    if (cleanPhone.length < 8) {
      setMessage("กรุณากรอกเบอร์โทรให้ถูกต้อง");
      return;
    }

    setLoading(true);
    setSearched(true);
    setMessage("");

    try {
      const res = await fetch(
        `/api/guest-orders?phone=${encodeURIComponent(cleanPhone)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setOrders([]);
        setMessage(data.message || "ค้นหาคำสั่งซื้อไม่สำเร็จ");
        return;
      }

      setOrders(data.orders || []);
      setSearchedPhoneRaw(cleanPhone);

      if (!data.orders || data.orders.length === 0) {
        setMessage("ไม่พบคำสั่งซื้อจากเบอร์นี้ กรุณาตรวจสอบเบอร์โทรอีกครั้ง");
      }
    } catch {
      setOrders([]);
      setMessage("เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function checkLogin() {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          setLoggedIn(false);
          return;
        }

        const data = await res.json();

        if (data?.user) {
          setLoggedIn(true);

          const orderRes = await fetch("/api/orders", {
            credentials: "include",
            cache: "no-store",
          });

          const orderData = await orderRes.json().catch(() => null);
          setMyOrders(orderData?.orders || []);
        } else {
          setLoggedIn(false);
        }
      } catch {
        setLoggedIn(false);
      } finally {
        setCheckingLogin(false);
      }
    }

    checkLogin();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("justOrdered") === "1") {
      setMessage(
        "สั่งซื้อสำเร็จแล้ว กรอกเบอร์โทรที่ใช้สั่งซื้อเพื่อตรวจสอบสถานะหรือทักแชทตามของ"
      );
    }
  }, []);

  return (
    <main style={pageWrap}>
      {checkingLogin ? (
        <section style={heroCard}>
          <h1 style={title}>กำลังตรวจสอบข้อมูล...</h1>
        </section>
      ) : loggedIn ? (
        <section style={orderList}>
          <div style={heroCard}>
            <div style={smallBadge}>เข้าสู่ระบบแล้ว</div>
            <h1 style={title}>📦 คำสั่งซื้อของฉัน</h1>
            <p style={desc}>
              ระบบแสดงคำสั่งซื้อของคุณอัตโนมัติ ไม่ต้องกรอกเบอร์โทร
            </p>
          </div>

          {myOrders.length === 0 ? (
            <div style={orderCard}>
              <div style={muted}>ยังไม่มีคำสั่งซื้อ</div>
            </div>
          ) : (
            myOrders.map((order: any) => {
              const orderIdText = getOrderId(order);
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <article key={orderIdText} style={orderCard}>
                  <div style={orderTop}>
                    <div>
                      <div style={label}>เลขคำสั่งซื้อ</div>
                      <div style={orderId}>#{orderIdText}</div>
                    </div>

                    <div style={statusPill}>{statusText(order.status)}</div>
                  </div>

                  <div style={infoGrid}>
                    {order.createdAt && (
                      <div>
                        <b>วันที่สั่งซื้อ:</b> {order.createdAt}
                      </div>
                    )}
                    <div>
                      <b>ยอดรวม:</b> ฿
                      {money(order.total || order.totalPrice || order.grandTotal)}
                    </div>
                  </div>

                  {items.length > 0 && (
                    <>
                      <div style={sectionTitle}>รายการสินค้า</div>

                      <div style={itemsWrap}>
                        {items.map((item: OrderItem, index: number) => {
                          const name = item.name || item.title || "สินค้า";
                          const qty = Number(item.qty || item.quantity || 1);
                          const price = Number(item.price || 0);

                          return (
                            <div key={index} style={itemRow}>
                              <div style={imageBox}>
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={name}
                                    style={imageStyle}
                                  />
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: 12 }}>
                                    ไม่มีรูป
                                  </span>
                                )}
                              </div>

                              <div style={{ flex: 1 }}>
                                <div style={itemName}>{name}</div>
                                <div style={muted}>จำนวน {qty} ชิ้น</div>
                                <div style={priceStyle}>฿{money(price)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div style={actionRow}>
                    <button
                      type="button"
                      onClick={() =>
                        openOrderChat({
                          orderId: orderIdText,
                          source: "remind",
                          loggedIn: true,
                        })
                      }
                      style={chatButton}
                    >
                      💬 ทักแชท / ตามของ
                    </button>

                    <a href="/orders" style={backButton}>
                      ดูหน้าคำสั่งซื้อแบบเต็ม
                    </a>
                  </div>
                </article>
              );
            })
          )}
        </section>
      ) : (
        <>
          <section style={heroCard}>
            <div style={smallBadge}>สำหรับลูกค้าที่ยังไม่ได้สมัครสมาชิก</div>
            <h1 style={title}>ตรวจสอบคำสั่งซื้อ / ตามของ</h1>
            <p style={desc}>
              กรอกเบอร์โทรที่ใช้สั่งซื้อ ระบบจะแสดงคำสั่งซื้อของคุณทันที
              โดยไม่ต้องเข้าสู่ระบบ
            </p>

            {message && <div style={noticeBox}>📌 {message}</div>}

            <div style={searchRow}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="กรอกเบอร์โทร เช่น 0812345678"
                inputMode="tel"
                style={inputStyle}
              />

              <button
                onClick={searchOrders}
                disabled={loading}
                style={{
                  ...buttonStyle,
                  opacity: loading ? 0.65 : 1,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "กำลังค้นหา..." : "ตามของ / ตรวจสอบ"}
              </button>
            </div>

            <div style={trustBox}>
              🛡️ ร้านสามารถตรวจสอบคำสั่งซื้อจากเบอร์โทรของคุณได้
              หากไม่ได้รับสินค้า สามารถกดปุ่มทักแชท / ตามของได้ทันที
            </div>
          </section>

          {searched && orders.length > 0 && (
            <section style={orderList}>
              {orders.map((order) => (
                <article key={order.id} style={orderCard}>
                  <div style={orderTop}>
                    <div>
                      <div style={label}>เลขคำสั่งซื้อ</div>
                      <div style={orderId}>#{order.id}</div>
                    </div>

                    <div style={statusPill}>{statusText(order.status)}</div>
                  </div>

                  <div style={infoGrid}>
                    {order.createdAt && (
                      <div>
                        <b>วันที่สั่งซื้อ:</b> {order.createdAt}
                      </div>
                    )}
                    {order.name && (
                      <div>
                        <b>ชื่อผู้รับ:</b> {order.name}
                      </div>
                    )}
                    {order.phone && (
                      <div>
                        <b>เบอร์โทร:</b> {order.phone}
                      </div>
                    )}
                    {order.address && (
                      <div>
                        <b>ที่อยู่จัดส่ง:</b> {order.address}
                      </div>
                    )}
                  </div>

                  <div style={sectionTitle}>รายการสินค้า</div>

                  <div style={itemsWrap}>
                    {order.items.map((item, index) => {
                      const name = item.name || item.title || "สินค้า";
                      const qty = Number(item.qty || item.quantity || 1);
                      const price = Number(item.price || 0);

                      return (
                        <div key={index} style={itemRow}>
                          <div style={imageBox}>
                            {item.image ? (
                              <img src={item.image} alt={name} style={imageStyle} />
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: 12 }}>
                                ไม่มีรูป
                              </span>
                            )}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={itemName}>{name}</div>
                            <div style={muted}>จำนวน {qty} ชิ้น</div>
                            <div style={priceStyle}>฿{money(price)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={totalBox}>
                    <div style={totalText}>ยอดรวม: ฿{money(order.total)}</div>

                    {order.trackingNo ? (
                      <div style={trackingText}>
                        ขนส่ง: {order.shippingProvider || "-"}
                        <br />
                        เลขพัสดุ: {order.trackingNo}
                      </div>
                    ) : (
                      <div style={warningText}>
                        ยังไม่มีเลขพัสดุ หากเกินเวลาที่ร้านแจ้งไว้
                        สามารถทักแชทเพื่อตามของได้
                      </div>
                    )}
                  </div>

                  <div style={actionRow}>
                    <button
                      type="button"
                      onClick={() =>
                        openOrderChat({
                          orderId: order.id,
                          source: "remind",
                          loggedIn: false,
                          phone: searchedPhoneRaw,
                          name: order.name || "",
                        })
                      }
                      style={chatButton}
                    >
                      💬 ทักแชท / ตามของ
                    </button>

                    <a href="/" style={backButton}>
                      กลับไปเลือกสินค้า
                    </a>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}

const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#fff7f2",
  padding: "28px 14px 48px",
};

const heroCard: React.CSSProperties = {
  maxWidth: 920,
  margin: "0 auto",
  background: "#fff",
  border: "1px solid #ffe0d7",
  borderRadius: 26,
  padding: 24,
  boxShadow: "0 10px 28px rgba(238,77,45,0.10)",
};

const smallBadge: React.CSSProperties = {
  display: "inline-block",
  background: "#fff1ec",
  color: "#ee4d2d",
  border: "1px solid #ffd2c4",
  borderRadius: 999,
  padding: "7px 12px",
  fontWeight: 900,
  fontSize: 13,
  marginBottom: 12,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  lineHeight: 1.2,
  color: "#0f172a",
  fontWeight: 900,
};

const desc: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  fontSize: 16,
  lineHeight: 1.7,
};

const noticeBox: React.CSSProperties = {
  marginTop: 16,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#c2410c",
  borderRadius: 16,
  padding: "13px 15px",
  fontWeight: 800,
};

const searchRow: React.CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 18,
  flexWrap: "wrap",
};

const inputStyle: React.CSSProperties = {
  flex: "1 1 260px",
  height: 52,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  padding: "0 16px",
  fontSize: 16,
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  minWidth: 180,
  height: 52,
  borderRadius: 16,
  border: "none",
  background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 16,
  boxShadow: "0 10px 22px rgba(238,77,45,0.22)",
};

const trustBox: React.CSSProperties = {
  marginTop: 18,
  background: "#f8fafc",
  borderRadius: 18,
  padding: 16,
  color: "#475569",
  fontWeight: 700,
  lineHeight: 1.7,
};

const orderList: React.CSSProperties = {
  maxWidth: 920,
  margin: "22px auto 0",
  display: "grid",
  gap: 18,
};

const orderCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #ffe0d7",
  borderRadius: 26,
  padding: 22,
  boxShadow: "0 10px 26px rgba(15,23,42,0.06)",
};

const orderTop: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const label: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const orderId: React.CSSProperties = {
  color: "#0f172a",
  fontSize: 22,
  fontWeight: 900,
  marginTop: 3,
};

const statusPill: React.CSSProperties = {
  background: "#fff1ec",
  color: "#ee4d2d",
  border: "1px solid #ffd2c4",
  borderRadius: 999,
  padding: "9px 14px",
  fontWeight: 900,
};

const infoGrid: React.CSSProperties = {
  marginTop: 16,
  display: "grid",
  gap: 8,
  color: "#334155",
  lineHeight: 1.6,
};

const sectionTitle: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: "1px dashed #e2e8f0",
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 18,
};

const itemsWrap: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 12,
};

const itemRow: React.CSSProperties = {
  display: "flex",
  gap: 14,
  background: "#fffaf8",
  border: "1px solid #ffe4dc",
  borderRadius: 18,
  padding: 12,
};

const imageBox: React.CSSProperties = {
  width: 78,
  height: 78,
  borderRadius: 16,
  background: "#fff",
  border: "1px solid #e5e7eb",
  overflow: "hidden",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const itemName: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 16,
};

const muted: React.CSSProperties = {
  color: "#64748b",
  marginTop: 4,
};

const priceStyle: React.CSSProperties = {
  color: "#ee4d2d",
  fontWeight: 900,
  marginTop: 5,
};

const totalBox: React.CSSProperties = {
  marginTop: 16,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  borderRadius: 18,
  padding: 16,
};

const totalText: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 900,
  fontSize: 18,
};

const trackingText: React.CSSProperties = {
  marginTop: 8,
  color: "#334155",
  lineHeight: 1.6,
};

const warningText: React.CSSProperties = {
  marginTop: 8,
  color: "#c2410c",
  lineHeight: 1.6,
  fontWeight: 700,
};

const actionRow: React.CSSProperties = {
  marginTop: 16,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const chatButton: React.CSSProperties = {
  flex: "1 1 220px",
  textAlign: "center",
  textDecoration: "none",
  background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 16,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 15,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(238,77,45,0.22)",
};

const backButton: React.CSSProperties = {
  flex: "1 1 180px",
  textAlign: "center",
  textDecoration: "none",
  background: "#fff",
  color: "#ee4d2d",
  border: "1px solid #ffb9a5",
  borderRadius: 16,
  padding: "14px 18px",
  fontWeight: 900,
};
