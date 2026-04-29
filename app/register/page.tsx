"use client";

import Link from "next/link";
import { useIsMobile } from "@/app/hooks/useIsMobile";

export default function AdminDashboardPage() {
  const isMobile = useIsMobile(640);

  const cardTitle: React.CSSProperties = {
    fontSize: isMobile ? 17 : 32,
    fontWeight: 800,
    marginBottom: isMobile ? 6 : 14,
  };

  const cardText: React.CSSProperties = {
    fontSize: isMobile ? 13 : 20,
    lineHeight: 1.5,
    color: "#4b5563",
  };

  const cardBox: React.CSSProperties = {
    display: "block",
    textDecoration: "none",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: isMobile ? 16 : 22,
    padding: isMobile ? 16 : 26,
    minHeight: isMobile ? "auto" : 180,
    color: "#111827",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
  };

  const ghostButton: React.CSSProperties = {
    textDecoration: "none",
    border: "1px solid #d1d5db",
    borderRadius: isMobile ? 12 : 16,
    padding: isMobile ? "10px 14px" : "14px 20px",
    color: "#111827",
    fontWeight: 700,
    fontSize: isMobile ? 13 : 18,
    background: "#fff",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: isMobile ? "20px auto" : "40px auto",
        padding: isMobile ? "0 12px" : "0 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: isMobile ? 10 : 16,
          marginBottom: isMobile ? 18 : 28,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: isMobile ? 26 : 52,
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Admin Dashboard
          </h1>
          <p
            style={{
              marginTop: isMobile ? 6 : 10,
              color: "#6b7280",
              fontSize: isMobile ? 14 : 26,
            }}
          >
            ยินดีต้อนรับ แอดมิน
          </p>
        </div>

        <Link href="/" style={ghostButton}>
          กลับหน้าร้าน
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr"
            : "repeat(auto-fit, minmax(260px, 1fr))",
          gap: isMobile ? 12 : 20,
        }}
      >
        <Link href="/admin/products" style={cardBox}>
          <div style={cardTitle}>จัดการสินค้า</div>
          <div style={cardText}>
            เพิ่ม แก้ไข ลบสินค้า และอัปโหลดรูปสินค้า
          </div>
        </Link>

        <Link href="/admin/catalog" style={cardBox}>
          <div style={cardTitle}>จัดการ catalog สินค้า</div>
          <div style={cardText}>
            สร้างและจัดการหมวดสินค้า หลัก / ย่อย / ย่อยชั้น 3
          </div>
        </Link>

        <Link href="/admin/orders" style={cardBox}>
          <div style={cardTitle}>จัดการคำสั่งซื้อ</div>
          <div style={cardText}>
            ตรวจสอบออเดอร์ ดูสลิป และอัปเดตสถานะ
          </div>
        </Link>

        <Link href="/admin/reviews" style={cardBox}>
          <div style={cardTitle}>จัดการรีวิว</div>
          <div style={cardText}>
            ตรวจสอบ / ลบ / แก้ไข รีวิว + ดูโบร์ชัวร์
          </div>
        </Link>

        <Link href="/admin/review-titles" style={cardBox}>
          <div style={cardTitle}>จัดการหัวข้อรีวิว</div>
          <div style={cardText}>
            เพิ่ม แก้ไข ลบ และเปิด-ปิดหัวข้อรีวิวสำหรับ creator
          </div>
        </Link>

        <Link href="/admin/creators" style={cardBox}>
          <div style={cardTitle}>อนุมัติครีเอเตอร์</div>
          <div style={cardText}>
            ตรวจสอบและอนุมัติผู้สมัครครีเอเตอร์
          </div>
        </Link>

        <Link href="/admin/users" style={cardBox}>
          <div style={{ ...cardTitle, color: "#dc2626" }}>
            🗑️ จัดการผู้ใช้งาน
          </div>
          <div style={cardText}>
            ลบ user ทีละคน และลบรีวิวของ user คนนั้น
          </div>
        </Link>

        <Link href="/" style={cardBox}>
          <div style={cardTitle}>ดูหน้าร้าน</div>
          <div style={cardText}>กลับไปฝั่งลูกค้า</div>
        </Link>
      </div>
    </div>
  );
}
