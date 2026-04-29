"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Order = {
  orderId: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: string;
  totalPrice: number;
  status: string;
  createdAt: string;
};

export default function PaymentProofPage() {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payerName, setPayerName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const currentOrder = localStorage.getItem("currentOrder");
    if (currentOrder) {
      setOrder(JSON.parse(currentOrder));
    }
  }, []);

  const submitProof = async () => {
    if (!order) {
      alert("ไม่พบออเดอร์");
      return;
    }

    if (!payerName.trim()) {
      alert("กรุณากรอกชื่อผู้โอน");
      return;
    }

    if (!selectedFile) {
      alert("กรุณาเลือกไฟล์สลิป");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("orderId", order.orderId);
      formData.append("payerName", payerName);
      formData.append("slip", selectedFile);

      const res = await fetch("/api/upload-slip", {
        method: "POST",
        body: formData
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "ส่งหลักฐานการโอนไม่สำเร็จ");
        return;
      }

      localStorage.removeItem("cart");
      alert("ส่งหลักฐานการโอนสำเร็จ");
      router.push("/account");
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดตอนส่งสลิป");
    } finally {
      setLoading(false);
    }
  };

  if (!order) {
    return (
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
        <h1>ส่งหลักฐานการโอนเงิน</h1>
        <p>ไม่พบข้อมูลออเดอร์</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "30px", fontWeight: 800, marginBottom: "20px" }}>
        ส่งหลักฐานการโอนเงิน
      </h1>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px"
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <strong>Order ID:</strong> {order.orderId}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>ยอดชำระ:</strong>{" "}
          <span style={{ color: "#f28c28", fontWeight: 800 }}>
            ฿{order.totalPrice.toFixed(2)}
          </span>
        </div>
        <div>
          <strong>สถานะ:</strong> {order.status}
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "20px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>QR รับเงิน</h2>

        <div
          style={{
            width: "220px",
            height: "220px",
            margin: "16px 0",
            borderRadius: "12px",
            border: "1px dashed #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fafafa",
            fontWeight: 700,
            color: "#888"
          }}
        >
          วางรูป QR ที่นี่
        </div>

        <p style={{ color: "#666", margin: 0 }}>
          ตอนนี้เป็นโหมดตัวอย่าง ขั้นต่อไปเราจะเปลี่ยนเป็น QR จริงได้
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: "16px",
          padding: "20px"
        }}
      >
        <h2 style={{ marginTop: 0 }}>อัปโหลดสลิป</h2>

        <div style={{ display: "grid", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
              ชื่อผู้โอน
            </label>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              placeholder="กรอกชื่อผู้โอน"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
              เลือกไฟล์สลิป
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setSelectedFile(file);
              }}
              style={inputStyle}
            />
            {selectedFile ? (
              <p style={{ marginTop: "8px", color: "#666" }}>
                ไฟล์ที่เลือก: {selectedFile.name}
              </p>
            ) : null}
          </div>

          <button onClick={submitProof} style={mainButtonStyle} disabled={loading}>
            {loading ? "กำลังส่ง..." : "ส่งสลิป"}
          </button>
        </div>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid #dcdcdc",
  fontSize: "15px",
  outline: "none"
};

const mainButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "none",
  background: "#f28c28",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer"
};