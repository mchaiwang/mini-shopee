"use client";

import { useEffect, useState } from "react";

type Order = {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  items: {
    id: number;
    name: string;
    price: number;
    qty: number;
  }[];
};

type Me = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
};

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMe = async () => {
    const res = await fetch("/api/auth/me?t=" + Date.now(), {
      cache: "no-store"
    });

    if (!res.ok) return null;

    const data = await res.json();
    setMe(data.user || null);
    return data.user || null;
  };

  const loadOrders = async () => {
    try {
      setError("");

      const res = await fetch("/api/orders?t=" + Date.now(), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "โหลดออเดอร์ไม่สำเร็จ");
      }

      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถโหลดประวัติการสั่งซื้อได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await loadMe();
      await loadOrders();
    };

    init();
  }, []);

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "30px", fontWeight: 800, marginBottom: "12px" }}>
        ประวัติการสั่งซื้อ
      </h1>

      {me && (
        <div style={{ color: "#666", marginBottom: "18px" }}>
          ผู้ใช้: {me.name} ({me.email})
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "16px",
            padding: "20px"
          }}
        >
          กำลังโหลดข้อมูล...
        </div>
      ) : error ? (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            color: "#c2410c",
            borderRadius: "16px",
            padding: "20px"
          }}
        >
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: "16px",
            padding: "20px"
          }}
        >
          ยังไม่มีออเดอร์
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {orders.map((order) => (
            <div
              key={order.orderId}
              style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: "16px",
                padding: "20px"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginBottom: "12px"
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: "18px" }}>{order.orderId}</div>
                  <div style={{ color: "#666", marginTop: "4px" }}>
                    ผู้สั่งซื้อ: {order.customerName}
                  </div>
                  <div style={{ color: "#888", marginTop: "4px", fontSize: "14px" }}>
                    วันที่สั่งซื้อ: {new Date(order.createdAt).toLocaleString("th-TH")}
                  </div>
                </div>

                <div
                  style={{
                    background: "#fff7ed",
                    color: "#c2410c",
                    border: "1px solid #fdba74",
                    padding: "8px 12px",
                    borderRadius: "999px",
                    fontWeight: 700,
                    height: "fit-content"
                  }}
                >
                  {order.status}
                </div>
              </div>

              <div style={{ color: "#555", marginBottom: "8px" }}>เบอร์โทร: {order.phone}</div>
              <div style={{ color: "#555", marginBottom: "12px" }}>ที่อยู่: {order.address}</div>

              <div style={{ display: "grid", gap: "8px", marginBottom: "12px" }}>
                {order.items.map((item) => (
                  <div
                    key={`${order.orderId}-${item.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      background: "#fafafa",
                      borderRadius: "10px",
                      border: "1px solid #f0f0f0"
                    }}
                  >
                    <span>
                      {item.name} x {item.qty}
                    </span>
                    <span style={{ fontWeight: 700 }}>
                      ฿{(item.price * item.qty).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 800,
                  fontSize: "18px"
                }}
              >
                <span>รวมทั้งหมด</span>
                <span style={{ color: "#f28c28" }}>฿{Number(order.totalPrice || 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}