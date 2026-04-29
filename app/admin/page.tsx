"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderRecord = {
  id?: string;
  status?: string;
  orderStatus?: string;
  paymentStatus?: string;
  shippingStatus?: string;
  deliveryStatus?: string;
  total?: number;
  createdAt?: string;
};

type OrdersResponse = {
  orders?: OrderRecord[];
};

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  async function loadOrders() {
    try {
      setLoadingOrders(true);

      const res = await fetch("/api/orders", {
        cache: "no-store",
        credentials: "include",
      });

      const data: OrdersResponse | OrderRecord[] = await res
        .json()
        .catch(() => ({} as OrdersResponse));

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
          ? data.orders
          : [];

      setOrders(list);
    } catch (error) {
      console.error("load admin dashboard orders error:", error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function getMainStatus(order: OrderRecord) {
    return String(
      order.orderStatus ||
        order.status ||
        order.deliveryStatus ||
        order.shippingStatus ||
        order.paymentStatus ||
        ""
    )
      .trim()
      .toLowerCase();
  }

  const orderStats = useMemo(() => {
    let action = 0;
    let approved = 0;
    let shipping = 0;
    let shipped = 0;
    let received = 0;

    for (const order of orders) {
      const status = getMainStatus(order);

      if (
        [
          "pending",
          "waiting_payment",
          "payment_pending",
          "checking",
          "waiting_check",
          "รอตรวจสอบ",
          "รอชำระเงิน",
          "ที่ต้องจัดการ",
        ].includes(status)
      ) {
        action += 1;
        continue;
      }

      if (
        [
          "approved",
          "paid",
          "payment_approved",
          "อนุมัติ",
          "ชำระแล้ว",
        ].includes(status)
      ) {
        approved += 1;
        continue;
      }

      if (
        [
          "processing",
          "waiting_shipping",
          "ready_to_ship",
          "packing",
          "รอจัดส่ง",
          "กำลังเตรียมสินค้า",
        ].includes(status)
      ) {
        shipping += 1;
        continue;
      }

      if(
[
 "shipped",
 "จัดส่งแล้ว"
].includes(status)
){
 shipped +=1;
 continue;
}

if(
[
 "received",
 "customer_received",
 "received_by_customer",
 "ได้รับสินค้าแล้ว"
].includes(status)
){
 received +=1;
 continue;
}

      action += 1;
    }

    return {
 total: orders.length,
 action,
 approved,
 shipping,
 shipped,
 received
}
  }, [orders]);

const todaySales = useMemo(() => {
  const today = new Date();

  return orders.reduce((sum, order) => {
    if (!order.createdAt) return sum;

    const d = new Date(order.createdAt);

    const sameDay =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    if (!sameDay) return sum;

    return sum + Number(order.total || 0);
  }, 0);
}, [orders]);

function money(n:number){
 return "฿"+n.toLocaleString("th-TH");
}
  return (
    <div style={page}>
      <div style={hero}>
        <div>
          <div style={eyebrow}>ADMIN CONTROL CENTER</div>
          <h1 style={title}>Admin Dashboard</h1>
          <p style={subtitle}>
            บริหารสินค้า ออเดอร์ รีวิว ครีเอเตอร์ และการเงินคอมมิชชั่นในที่เดียว
          </p>
        </div>

        <div style={heroActions}>
          <Link href="/admin/finance" style={primaryButton}>
            💸 ไปหน้าการเงิน
          </Link>
          <Link href="/" style={ghostButton}>
            กลับหน้าร้าน
          </Link>
        </div>
      </div>

     <div style={salesTodayPanel}>
   <div>
      <div style={salesEyebrow}>
         TODAY SALES
      </div>

      <div style={salesTitle}>
         ยอดขายของฉันวันนี้
      </div>

      <div style={salesValue}>
         {money(todaySales)}
      </div>

      <div style={salesSub}>
         รวมยอดขายจากคำสั่งซื้อวันนี้
      </div>
   </div>

   <div style={salesRightBox}>
      <div style={salesMiniLabel}>จำนวนออเดอร์วันนี้</div>

      <div style={salesMiniNumber}>
         {orders.filter(o=>{
           if(!o.createdAt) return false;
           const d=new Date(o.createdAt);
           const t=new Date();
           return (
             d.getDate()===t.getDate() &&
             d.getMonth()===t.getMonth() &&
             d.getFullYear()===t.getFullYear()
           );
         }).length}
      </div>
   </div>
</div>

      <section style={orderBoard}>
        <div style={orderBoardHeader}>
          <div>
            <div style={orderBoardTitle}>คำสั่งซื้อของฉัน</div>
            <div style={orderBoardSub}>
              {loadingOrders ? "กำลังโหลดข้อมูลคำสั่งซื้อ..." : "สรุปจำนวนคำสั่งซื้อจาก /api/orders"}
            </div>
          </div>

          <button type="button" onClick={loadOrders} style={refreshButton}>
            รีเฟรช
          </button>
        </div>

        <div style={orderGrid}>
          <OrderCard icon="📦" title="ทั้งหมด" count={orderStats.total} color="#2563eb" />
          <OrderCard icon="📝" title="ที่ต้องจัดการ" count={orderStats.action} color="#ea580c" />
          <OrderCard icon="✅" title="อนุมัติ" count={orderStats.approved} color="#15803d" />
          <OrderCard icon="🚚" title="รอจัดส่ง" count={orderStats.shipping} color="#6d28d9" />
          <OrderCard icon="📬" title="จัดส่งแล้ว" count={orderStats.shipped} color="#16a34a" />
          <OrderCard icon="🎉" title="รับสินค้าแล้ว" count={orderStats.received} color="#059669"/>
        </div>
      </section>

      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>เมนูจัดการระบบ</h2>
          <p style={sectionSub}>เลือกส่วนที่ต้องการจัดการ</p>
        </div>
      </div>

     <div style={grid}>

{/* 1 */}
<Link href="/admin/orders" style={cardStyle}>
  <div style={iconBox}>🧾</div>
  <div style={cardTitle}>1 จัดการคำสั่งซื้อ</div>
  <div style={cardText}>
    ตรวจสอบออเดอร์ ดูสลิป และอัปเดตสถานะ
  </div>
</Link>

{/* 2 */}
<Link href="/admin/products" style={cardStyle}>
  <div style={iconBox}>📦</div>
  <div style={cardTitle}>2 จัดการสินค้า</div>
  <div style={cardText}>
    เพิ่ม แก้ไข ลบสินค้า และอัปโหลดรูปสินค้า
  </div>
</Link>

{/* 3 */}
<Link href="/admin/catalog" style={cardStyle}>
  <div style={iconBox}>🗂️</div>
  <div style={cardTitle}>3 จัดการ catalog สินค้า</div>
  <div style={cardText}>
    สร้างและจัดการหมวดสินค้า หลัก / ย่อย / ย่อยชั้น 3
  </div>
</Link>

{/* 4 */}
<Link href="/admin/finance" style={financeCardStyle}>
  <div style={iconBox}>💸</div>
  <div style={cardTitle}>4 การเงิน / คอมมิชชั่น</div>
  <div style={cardText}>
    อนุมัติโอนเงิน ตรวจยอดรอโอน ดูรายได้จากรีวิว
  </div>
  <div style={cardHint}>สำคัญสำหรับระบบ Creator</div>
</Link>

{/* 5 */}
<Link href="/admin/reviews" style={cardStyle}>
  <div style={iconBox}>⭐</div>
  <div style={cardTitle}>5 จัดการรีวิว</div>
  <div style={cardText}>
    ตรวจสอบ ลบ แก้ไข รีวิว และดูโบรชัวร์
  </div>
</Link>

{/* 6 */}
<Link href="/admin/review-titles" style={cardStyle}>
  <div style={iconBox}>🏷️</div>
  <div style={cardTitle}>6 จัดการหัวข้อรีวิว</div>
  <div style={cardText}>
    เพิ่ม แก้ไข ลบ และเปิด-ปิดหัวข้อรีวิว
  </div>
</Link>

{/* 7 */}
<Link href="/admin/creators" style={cardStyle}>
  <div style={iconBox}>👥</div>
  <div style={cardTitle}>7 อนุมัติครีเอเตอร์</div>
  <div style={cardText}>
    ตรวจสอบและอนุมัติผู้สมัครครีเอเตอร์
  </div>
</Link>

{/* 8 */}
<Link href="/admin/users" style={dangerCardStyle}>
  <div style={iconBox}>🗑️</div>
  <div style={{...cardTitle,color:"#dc2626"}}>
    8 จัดการผู้ใช้งาน
  </div>
  <div style={cardText}>
    ลบ user ทีละคน และลบรีวิวของ user คนนั้น
  </div>
</Link>

</div>
    </div>
  );
}

function OrderCard({
  icon,
  title,
  count,
  color,
}: {
  icon: string;
  title: string;
  count: number;
  color: string;
}) {
  return (
    <Link href="/admin/orders" style={orderCard}>
      <div style={orderIcon}>{icon}</div>
      <div style={orderTitle}>{title}</div>
      <div style={{ ...orderCount, color }}>{count}</div>
      <div style={orderLabel}>คำสั่งซื้อ</div>
    </Link>
  );
}
const salesTodayPanel: React.CSSProperties = {
 borderRadius:30,
 padding:"30px 34px",
 marginBottom:24,
 background:"linear-gradient(135deg,#fff7ed 0%,#ffedd5 100%)",
 border:"2px solid #fdba74",
 display:"flex",
 justifyContent:"space-between",
 alignItems:"center",
 flexWrap:"wrap",
 gap:20,
 boxShadow:"0 12px 30px rgba(249,115,22,.12)"
};

const salesEyebrow:React.CSSProperties={
fontSize:13,
fontWeight:900,
letterSpacing:1.5,
color:"#9a3412"
};

const salesTitle:React.CSSProperties={
fontSize:42,
fontWeight:900,
color:"#7c2d12",
marginTop:8
};

const salesValue:React.CSSProperties={
fontSize:58,
fontWeight:900,
color:"#ea580c",
lineHeight:1.1,
marginTop:10
};

const salesSub:React.CSSProperties={
marginTop:12,
fontSize:18,
fontWeight:700,
color:"#9a3412"
};

const salesRightBox:React.CSSProperties={
background:"#fff",
padding:"24px 30px",
borderRadius:24,
boxShadow:"0 8px 24px rgba(0,0,0,.06)"
};

const salesMiniLabel:React.CSSProperties={
fontWeight:800,
color:"#64748b",
marginBottom:10
};

const salesMiniNumber:React.CSSProperties={
fontSize:52,
fontWeight:900,
color:"#2563eb"
};
const page: React.CSSProperties = {
  maxWidth: 1320,
  margin: "28px auto",
  padding: "0 16px 50px",
};

const hero: React.CSSProperties = {
  borderRadius: 28,
  padding: 30,
  background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
  color: "#fff",
  display: "flex",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 20,
  boxShadow: "0 18px 40px rgba(15,23,42,0.18)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  letterSpacing: 1.4,
  opacity: 0.8,
  marginBottom: 8,
};

const title: React.CSSProperties = {
  fontSize: 50,
  fontWeight: 900,
  margin: 0,
  lineHeight: 1.05,
};

const subtitle: React.CSSProperties = {
  marginTop: 12,
  fontSize: 20,
  lineHeight: 1.6,
  opacity: 0.9,
};

const heroActions: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButton: React.CSSProperties = {
  textDecoration: "none",
  borderRadius: 16,
  padding: "15px 20px",
  color: "#fff",
  fontWeight: 900,
  fontSize: 18,
  background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
  boxShadow: "0 12px 24px rgba(238,77,45,0.25)",
};

const ghostButton: React.CSSProperties = {
  textDecoration: "none",
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 16,
  padding: "15px 20px",
  color: "#fff",
  fontWeight: 800,
  fontSize: 18,
  background: "rgba(255,255,255,0.08)",
};

const financePanel: React.CSSProperties = {
  borderRadius: 24,
  padding: 24,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  marginBottom: 18,
};

const panelTitle: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  color: "#9a3412",
  marginBottom: 6,
};

const panelText: React.CSSProperties = {
  color: "#7c2d12",
  fontSize: 17,
  lineHeight: 1.6,
  fontWeight: 700,
};

const financeButton: React.CSSProperties = {
  textDecoration: "none",
  background: "#ee4d2d",
  color: "#fff",
  borderRadius: 16,
  padding: "14px 18px",
  fontWeight: 900,
  fontSize: 17,
};

const orderBoard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #dbe3ef",
  borderRadius: 28,
  padding: 26,
  marginBottom: 30,
  boxShadow: "0 10px 24px rgba(15,23,42,.05)",
};

const orderBoardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 22,
};

const orderBoardTitle: React.CSSProperties = {
  fontSize: 36,
  fontWeight: 900,
  color: "#0f172a",
};

const orderBoardSub: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  marginTop: 4,
};

const refreshButton: React.CSSProperties = {
  border: "1px solid #dbe3ef",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 14,
  padding: "12px 16px",
  fontWeight: 900,
  cursor: "pointer",
};

const orderGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))",
  gap: 18,
};

const orderCard: React.CSSProperties = {
  textDecoration: "none",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 24,
  minHeight: 165,
  color: "#111827",
  boxShadow: "0 8px 20px rgba(15,23,42,.04)",
};

const orderIcon: React.CSSProperties = {
  fontSize: 34,
  marginBottom: 10,
};

const orderTitle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  marginBottom: 12,
  color: "#111827",
};

const orderCount: React.CSSProperties = {
  fontSize: 48,
  fontWeight: 900,
  lineHeight: 1,
};

const orderLabel: React.CSSProperties = {
  marginTop: 12,
  color: "#64748b",
  fontWeight: 800,
};

const sectionHeader: React.CSSProperties = {
  marginBottom: 14,
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 32,
  fontWeight: 900,
  color: "#0f172a",
};

const sectionSub: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 17,
  fontWeight: 700,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 20,
};

const cardStyle: React.CSSProperties = {
  display: "block",
  textDecoration: "none",
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 24,
  padding: 24,
  minHeight: 190,
  color: "#111827",
  boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
};

const financeCardStyle: React.CSSProperties = {
  ...cardStyle,
  background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
  border: "2px solid #fb923c",
  boxShadow: "0 14px 30px rgba(249,115,22,0.14)",
};

const dangerCardStyle: React.CSSProperties = {
  ...cardStyle,
  border: "1px solid #fecaca",
  background: "#fff",
};

const iconBox: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: "#f8fafc",
  display: "grid",
  placeItems: "center",
  fontSize: 28,
  marginBottom: 16,
};

const cardTitle: React.CSSProperties = {
  fontSize: 27,
  fontWeight: 900,
  marginBottom: 12,
  color: "#0f172a",
};

const cardText: React.CSSProperties = {
  fontSize: 17,
  lineHeight: 1.6,
  color: "#4b5563",
  fontWeight: 650,
};

const cardHint: React.CSSProperties = {
  marginTop: 14,
  display: "inline-flex",
  borderRadius: 999,
  background: "#ffedd5",
  color: "#9a3412",
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 900,
};