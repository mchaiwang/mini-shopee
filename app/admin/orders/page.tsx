"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id?: string;
  name?: string;
  title?: string;
  qty?: number;
  quantity?: number;
  price?: number;
};

type ShippingAddress = {
  fullName?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
};

type Order = {
  id: string;
  customerName?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  note?: string;
  email?: string;
  userEmail?: string;
  customerEmail?: string;
  shippingAddress?: ShippingAddress;
  items?: OrderItem[];
  total?: number;
  paymentMethod?: "bank_transfer" | "cod" | string;
  slip?: string;
  slipName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};


function buildCalendarDate(value: string, endOfDay = false) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;

  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);

  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatCalendarDateThai(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "-";

  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
}

function formatMoney(value?: number) {
  return `฿${Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getOrderTime(order: Order) {
  const time = new Date(order.createdAt || "").getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getThaiDateKey(order: Order) {
  if (!order.createdAt) return "ไม่ระบุวันที่";
  try {
    return new Date(order.createdAt).toLocaleDateString("th-TH");
  } catch {
    return "ไม่ระบุวันที่";
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string>("");

  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  async function loadOrders() {
    try {
      setLoading(true);
      const res = await fetch("/api/orders", {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.orders || [];
      setOrders(list);
    } catch (error) {
      console.error("loadOrders error:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function updateStatus(id: string, status: string) {
    try {
      setUpdatingId(id);

      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }

      await loadOrders();
    } catch (error) {
      console.error("updateStatus error:", error);
      alert("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteOrder(id: string) {
    const ok = confirm("ต้องการลบคำสั่งซื้อนี้ใช่ไหม?");
    if (!ok) return;

    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "ลบคำสั่งซื้อไม่สำเร็จ");
        return;
      }

      await loadOrders();
    } catch (error) {
      console.error("deleteOrder error:", error);
      alert("ลบคำสั่งซื้อไม่สำเร็จ");
    }
  }

  function toggleSelectOrder(id: string) {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllVisibleOrders(targetOrders: Order[]) {
    setSelectedOrderIds(targetOrders.map((order) => order.id));
  }

  function clearSelectedOrders() {
    setSelectedOrderIds([]);
  }

  async function updateSelectedOrders(status: string) {
    if (selectedOrderIds.length === 0) {
      alert("กรุณาเลือกออเดอร์ก่อน");
      return;
    }

    const ok = confirm(
      `ต้องการอัปเดต ${selectedOrderIds.length} ออเดอร์ เป็น "${status}" ใช่ไหม?`
    );
    if (!ok) return;

    try {
      setUpdatingId("batch");

      for (const id of selectedOrderIds) {
        const res = await fetch("/api/orders", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, status }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `อัปเดต ${id} ไม่สำเร็จ`);
        }
      }

      clearSelectedOrders();
      await loadOrders();
    } catch (error) {
      console.error("updateSelectedOrders error:", error);
      alert(error instanceof Error ? error.message : "อัปเดตแบบชุดไม่สำเร็จ");
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteSelectedOrders() {
    if (selectedOrderIds.length === 0) {
      alert("กรุณาเลือกออเดอร์ก่อน");
      return;
    }

    const ok = confirm(`ต้องการลบ ${selectedOrderIds.length} ออเดอร์ ใช่ไหม?`);
    if (!ok) return;

    try {
      setUpdatingId("batch-delete");

      for (const id of selectedOrderIds) {
        const res = await fetch("/api/orders", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || `ลบ ${id} ไม่สำเร็จ`);
        }
      }

      clearSelectedOrders();
      await loadOrders();
    } catch (error) {
      console.error("deleteSelectedOrders error:", error);
      alert(error instanceof Error ? error.message : "ลบแบบชุดไม่สำเร็จ");
    } finally {
      setUpdatingId("");
    }
  }

  function paymentLabel(method?: string) {
    if (method === "cod") return "เก็บเงินปลายทาง";
    if (method === "bank_transfer") return "โอนเงิน / สแกนจ่าย";
    return method || "ไม่ระบุ";
  }

  function paymentBadgeStyle(method?: string): React.CSSProperties {
    if (method === "cod") {
      return {
        background: "#fff7ed",
        color: "#ea580c",
        border: "1px solid #fed7aa",
      };
    }

    return {
      background: "#ecfdf5",
      color: "#059669",
      border: "1px solid #a7f3d0",
    };
  }

  function statusBadgeStyle(status?: string): React.CSSProperties {
    switch (status) {
      case "รอตรวจสอบสลิป":
        return {
          background: "#fff7ed",
          color: "#ea580c",
          border: "1px solid #fdba74",
        };
      case "รอยืนยันคำสั่งซื้อ":
        return {
          background: "#fff7ed",
          color: "#f97316",
          border: "1px solid #fdba74",
        };
      case "ชำระเงินแล้ว":
      case "อนุมัติแล้ว":
        return {
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
        };
      case "รอจัดส่ง":
        return {
          background: "#eff6ff",
          color: "#2563eb",
          border: "1px solid #bfdbfe",
        };
      case "จัดส่งแล้ว":
        return {
          background: "#f5f3ff",
          color: "#7c3aed",
          border: "1px solid #ddd6fe",
        };
      case "ได้รับสินค้าแล้ว":
        return {
          background: "#dcfce7",
          color: "#16a34a",
          border: "1px solid #86efac",
        };
      case "สำเร็จ":
        return {
          background: "#f0fdf4",
          color: "#15803d",
          border: "1px solid #86efac",
        };
      case "ยกเลิก":
        return {
          background: "#fef2f2",
          color: "#dc2626",
          border: "1px solid #fecaca",
        };
      default:
        return {
          background: "#f9fafb",
          color: "#4b5563",
          border: "1px solid #e5e7eb",
        };
    }
  }

  /** สีหลักของแต่ละสถานะ — ใช้สำหรับแถบไฮไลท์ด้านซ้ายและ accent อื่นๆ */
  function statusAccentColor(status?: string): string {
    switch (status) {
      case "รอตรวจสอบสลิป":
      case "รอยืนยันคำสั่งซื้อ":
        return "#f97316"; // ส้ม
      case "ชำระเงินแล้ว":
      case "อนุมัติแล้ว":
        return "#10b981"; // เขียวอ่อน
      case "รอจัดส่ง":
        return "#2563eb"; // น้ำเงิน
      case "จัดส่งแล้ว":
        return "#7c3aed"; // ม่วง
      case "ได้รับสินค้าแล้ว":
      case "สำเร็จ":
        return "#16a34a"; // เขียวเข้ม
      case "ยกเลิก":
        return "#dc2626"; // แดง
      default:
        return "#9ca3af"; // เทา
    }
  }

  /** Icon emoji แทนสถานะ */
  function statusIcon(status?: string): string {
    switch (status) {
      case "รอตรวจสอบสลิป":
        return "🧾";
      case "รอยืนยันคำสั่งซื้อ":
        return "📋";
      case "ชำระเงินแล้ว":
      case "อนุมัติแล้ว":
        return "✓";
      case "รอจัดส่ง":
        return "📦";
      case "จัดส่งแล้ว":
        return "🚚";
      case "ได้รับสินค้าแล้ว":
      case "สำเร็จ":
        return "✅";
      case "ยกเลิก":
        return "✕";
      default:
        return "•";
    }
  }

  /**
   * คืน step index ของ status (0-3) สำหรับ progress stepper
   * step 0: อนุมัติ
   * step 1: รอจัดส่ง
   * step 2: จัดส่งแล้ว
   * step 3: ได้รับสินค้าแล้ว
   * คืน -1 ถ้ายังไม่อยู่ใน flow (รอตรวจสอบ/รอยืนยัน) หรือ ยกเลิก
   */
  function statusStepIndex(status?: string): number {
    switch (status) {
      case "ชำระเงินแล้ว":
      case "อนุมัติแล้ว":
        return 0;
      case "รอจัดส่ง":
        return 1;
      case "จัดส่งแล้ว":
        return 2;
      case "ได้รับสินค้าแล้ว":
      case "สำเร็จ":
        return 3;
      default:
        return -1;
    }
  }

  const STATUS_STEPS = [
    { label: "อนุมัติ", icon: "✓" },
    { label: "รอจัดส่ง", icon: "📦" },
    { label: "จัดส่งแล้ว", icon: "🚚" },
    { label: "รับของแล้ว", icon: "✅" },
  ];

  function getRecipientName(order: Order) {
    return (
      order.customerName?.trim() ||
      order.fullName?.trim() ||
      order.shippingAddress?.fullName?.trim() ||
      "-"
    );
  }

  function getPhone(order: Order) {
    return order.phone?.trim() || order.shippingAddress?.phone?.trim() || "-";
  }

  function getAddress(order: Order) {
    return (
      order.address?.trim() || order.shippingAddress?.address?.trim() || "-"
    );
  }

  function getNote(order: Order) {
    return order.note?.trim() || order.shippingAddress?.note?.trim() || "-";
  }

  const filteredOrders = useMemo(() => {
    const fromDate = buildCalendarDate(dateFrom, false);
    const toDate = buildCalendarDate(dateTo, true);

    const fromTime = fromDate ? fromDate.getTime() : null;
    const toTime = toDate ? toDate.getTime() : null;

    return orders.filter((order) => {
      const orderTime = getOrderTime(order);

      const passFrom = fromTime !== null ? orderTime >= fromTime : true;
      const passTo = toTime !== null ? orderTime <= toTime : true;

      const passPayment =
        paymentFilter === "all"
          ? true
          : String(order.paymentMethod || "") === paymentFilter;

      return passFrom && passTo && passPayment;
    });
  }, [orders, dateFrom, dateTo, paymentFilter]);

  const summary = useMemo(() => {
    const codOrders = filteredOrders.filter((order) => order.paymentMethod === "cod");
    const transferOrders = filteredOrders.filter(
      (order) => order.paymentMethod === "bank_transfer"
    );

    const codTotal = codOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );
    const transferTotal = transferOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );

    return {
      count: filteredOrders.length,
      codCount: codOrders.length,
      transferCount: transferOrders.length,
      codTotal,
      transferTotal,
      grandTotal: codTotal + transferTotal,
    };
  }, [filteredOrders]);

  const dailySummary = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        count: number;
        codCount: number;
        transferCount: number;
        codTotal: number;
        transferTotal: number;
        grandTotal: number;
      }
    >();

    filteredOrders.forEach((order) => {
      const key = getThaiDateKey(order);
      const current =
        map.get(key) || {
          date: key,
          count: 0,
          codCount: 0,
          transferCount: 0,
          codTotal: 0,
          transferTotal: 0,
          grandTotal: 0,
        };

      const total = Number(order.total || 0);

      current.count += 1;
      current.grandTotal += total;

      if (order.paymentMethod === "cod") {
        current.codCount += 1;
        current.codTotal += total;
      }

      if (order.paymentMethod === "bank_transfer") {
        current.transferCount += 1;
        current.transferTotal += total;
      }

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [filteredOrders]);

  function clearFilters() {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("all");
    setSelectedOrderIds([]);
  }

  function scrollToOrder(orderId: string) {
    requestAnimationFrame(() => {
      const el = document.getElementById(`order-card-${orderId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "24px auto",
        padding: "0 16px 32px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #ee4d2d 0%, #ff7337 55%, #ff8f5a 100%)",
          borderRadius: 24,
          padding: "24px 24px",
          marginBottom: 24,
          color: "#fff",
          boxShadow: "0 12px 28px rgba(238,77,45,0.22)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>
            จัดการคำสั่งซื้อ
          </h1>
          <p style={{ marginTop: 8, fontSize: 16, opacity: 0.95 }}>
            ตรวจสอบออเดอร์ ดูสลิป และอัปเดตสถานะแบบหลังร้าน
          </p>
        </div>

        <Link
          href="/admin"
          style={{
            textDecoration: "none",
            borderRadius: 14,
            padding: "12px 18px",
            color: "#ee4d2d",
            fontWeight: 800,
            background: "#fff",
            boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          }}
        >
          กลับหน้าแอดมิน
        </Link>
      </div>

      <section style={filterCardStyle}>
        <div style={filterHeaderStyle}>
          <div>
            <div style={filterTitleStyle}>ตัวกรองบัญชีรายวัน</div>
            <div style={filterSubStyle}>
              ตรวจยอดโอน / สแกนจ่าย และยอดเก็บเงินปลายทางในแต่ละวัน
            </div>
          </div>

          <button type="button" onClick={clearFilters} style={clearFilterButtonStyle}>
            ล้างตัวกรอง
          </button>
        </div>

        <div style={calendarGridStyle}>
          <label style={calendarLabelStyle}>
            จากวันที่
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={calendarInputStyle}
            />
            <span style={calendarThaiTextStyle}>
              แสดงผล: {formatCalendarDateThai(dateFrom)}
            </span>
          </label>

          <label style={calendarLabelStyle}>
            ถึงวันที่
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={calendarInputStyle}
            />
            <span style={calendarThaiTextStyle}>
              แสดงผล: {formatCalendarDateThai(dateTo)}
            </span>
          </label>
        </div>

        <div style={filterBlockTitleStyle}>วิธีชำระเงิน</div>
        <div style={paymentFilterGridStyle}>
          <button
            type="button"
            onClick={() => setPaymentFilter("all")}
            style={{
              ...paymentFilterButtonStyle,
              ...(paymentFilter === "all" ? paymentFilterActiveStyle : {}),
            }}
          >
            ทั้งหมด
          </button>

          <button
            type="button"
            onClick={() => setPaymentFilter("cod")}
            style={{
              ...paymentFilterButtonStyle,
              ...(paymentFilter === "cod" ? paymentFilterActiveStyle : {}),
            }}
          >
            เก็บเงินปลายทาง (COD)
          </button>

          <button
            type="button"
            onClick={() => setPaymentFilter("bank_transfer")}
            style={{
              ...paymentFilterButtonStyle,
              ...(paymentFilter === "bank_transfer" ? paymentFilterActiveStyle : {}),
            }}
          >
            โอนเงิน / สแกนจ่าย
          </button>
        </div>

        <div style={summaryGridStyle}>
          <SummaryBox title="จำนวนออเดอร์" value={`${summary.count} รายการ`} tone="dark" />
          <SummaryBox
            title="เก็บเงินปลายทาง"
            value={formatMoney(summary.codTotal)}
            note={`${summary.codCount} รายการ`}
            tone="orange"
          />
          <SummaryBox
            title="โอนเงิน / สแกนจ่าย"
            value={formatMoney(summary.transferTotal)}
            note={`${summary.transferCount} รายการ`}
            tone="green"
          />
          <SummaryBox title="ยอดรวมตามตัวกรอง" value={formatMoney(summary.grandTotal)} tone="blue" />
        </div>

        <div style={dailyBoxStyle}>
          <div style={dailyTitleStyle}>สรุปยอดเงินรายวัน</div>

          {dailySummary.length === 0 ? (
            <div style={dailyEmptyStyle}>ยังไม่มีข้อมูลตามตัวกรองนี้</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {dailySummary.map((day) => (
                <div key={day.date} style={dailyRowStyle}>
                  <div>
                    <div style={dailyDateStyle}>{day.date}</div>
                    <div style={dailyMetaStyle}>{day.count} ออเดอร์</div>
                  </div>

                  <div style={dailyAmountGroupStyle}>
                    <div style={dailyAmountStyle}>
                      COD: {formatMoney(day.codTotal)}
                      <div style={dailyMetaStyle}>{day.codCount} รายการ</div>
                    </div>
                    <div style={dailyAmountStyle}>
                      โอน/สแกน: {formatMoney(day.transferTotal)}
                      <div style={dailyMetaStyle}>{day.transferCount} รายการ</div>
                    </div>
                    <div style={dailyTotalStyle}>รวม: {formatMoney(day.grandTotal)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={batchBarStyle}>
          <div style={batchTextStyle}>เลือกแล้ว {selectedOrderIds.length} ออเดอร์</div>
          <button
            type="button"
            onClick={() => selectAllVisibleOrders(filteredOrders)}
            style={batchSoftButtonStyle}
          >
            เลือกทั้งหมดที่แสดง
          </button>
          <button type="button" onClick={clearSelectedOrders} style={batchSoftButtonStyle}>
            ยกเลิกเลือก
          </button>
          <button
            type="button"
            onClick={() => updateSelectedOrders("รอจัดส่ง")}
            disabled={updatingId !== ""}
            style={batchOrangeButtonStyle}
          >
            จัดการเป็นชุด: รอจัดส่ง
          </button>
          <button
            type="button"
            onClick={() => updateSelectedOrders("จัดส่งแล้ว")}
            disabled={updatingId !== ""}
            style={batchPurpleButtonStyle}
          >
            จัดการเป็นชุด: จัดส่งแล้ว
          </button>
          <button
            type="button"
            onClick={deleteSelectedOrders}
            disabled={updatingId !== ""}
            style={batchRedButtonStyle}
          >
            ลบชุด
          </button>
        </div>

        {filteredOrders.length > 0 ? (
          <div style={orderJumpBoxStyle}>
            <div style={orderJumpTitleStyle}>รายการออเดอร์แบบย่อ</div>

            <div style={orderJumpListStyle}>
              {filteredOrders.map((order) => {
                const accentColor = statusAccentColor(order.status);
                return (
                <div
                  key={`jump-${order.id}`}
                  style={{
                    ...orderJumpRowStyle,
                    borderLeft: `5px solid ${accentColor}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order.id)}
                    onChange={() => toggleSelectOrder(order.id)}
                    style={{ width: 18, height: 18 }}
                  />

                  <button
                    type="button"
                    onClick={() => scrollToOrder(order.id)}
                    style={orderJumpMainButtonStyle}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={orderJumpIdStyle}>#{order.id}</div>
                      <div style={orderJumpMetaStyle}>
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("th-TH")
                          : "-"}
                      </div>
                    </div>

                    <div style={orderJumpPaymentStyle}>
                      {paymentLabel(order.paymentMethod)}
                    </div>

                    {/* status pill เด่นใน quick row */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 12px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 800,
                        background: `${accentColor}18`,
                        color: accentColor,
                        border: `1.5px solid ${accentColor}`,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span>{statusIcon(order.status)}</span>
                      <span>{order.status || "ยังไม่ระบุ"}</span>
                    </div>

                    <div style={orderJumpTotalStyle}>
                      {formatMoney(order.total)}
                    </div>

                    <div style={orderJumpActionStyle}>ดูรายละเอียด</div>
                  </button>

                  <div style={orderJumpQuickActionStyle}>
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(
                          order.id,
                          order.paymentMethod === "cod" ? "อนุมัติแล้ว" : "ชำระเงินแล้ว"
                        )
                      }
                      disabled={updatingId === order.id || updatingId === "batch"}
                      style={quickApproveButtonStyle}
                    >
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(order.id, "รอจัดส่ง")}
                      disabled={updatingId === order.id || updatingId === "batch"}
                      style={quickShipButtonStyle}
                    >
                      รอจัดส่ง
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(order.id, "จัดส่งแล้ว")}
                      disabled={updatingId === order.id || updatingId === "batch"}
                      style={quickDoneButtonStyle}
                    >
                      จัดส่งแล้ว
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(order.id, "ได้รับสินค้าแล้ว")}
                      disabled={updatingId === order.id || updatingId === "batch"}
                      style={quickDeliveredButtonStyle}
                      title="ลูกค้ายืนยันว่าได้รับสินค้าแล้ว — ระบบจะคิดคอมมิชชั่นให้ครีเอเตอร์"
                    >
                      ✅ ได้รับของแล้ว
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      {loading ? (
        <div style={emptyBoxStyle}>กำลังโหลดคำสั่งซื้อ...</div>
      ) : filteredOrders.length === 0 ? (
        <div style={emptyBoxStyle}>ไม่พบคำสั่งซื้อตามตัวกรอง</div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {filteredOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const accentColor = statusAccentColor(order.status);
            const stepIndex = statusStepIndex(order.status);
            const isCancelled = order.status === "ยกเลิก";

            return (
              <div
                id={`order-card-${order.id}`}
                key={order.id}
                style={{
                  background: "#fff",
                  border: selectedOrderIds.includes(order.id)
                    ? "2px solid #ee4d2d"
                    : "1px solid #f1f5f9",
                  borderLeft: selectedOrderIds.includes(order.id)
                    ? "2px solid #ee4d2d"
                    : `8px solid ${accentColor}`,
                  borderRadius: 24,
                  padding: 20,
                  paddingLeft: selectedOrderIds.includes(order.id) ? 20 : 18,
                  boxShadow: selectedOrderIds.includes(order.id)
                    ? "0 12px 32px rgba(238,77,45,0.18)"
                    : "0 8px 24px rgba(15,23,42,0.06)",
                  scrollMarginTop: 110,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    marginBottom: 16,
                    paddingBottom: 14,
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                      style={{ width: 20, height: 20, marginTop: 8 }}
                    />

                    {/* icon ใหญ่ติดข้าง Order ID — เห็นสถานะแวบเดียว */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        background: `${accentColor}15`,
                        border: `2px solid ${accentColor}`,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 26,
                        flexShrink: 0,
                        marginTop: 4,
                      }}
                      title={order.status}
                    >
                      {statusIcon(order.status)}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 30,
                        fontWeight: 900,
                        color: "#0f172a",
                        marginBottom: 6,
                      }}
                    >
                      #{order.id}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 15, marginBottom: 10 }}>
                        วันที่สั่งซื้อ:{" "}
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString("th-TH")
                          : "-"}
                      </div>

                      {/* progress stepper */}
                      {!isCancelled && stepIndex >= 0 && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {STATUS_STEPS.map((step, idx) => {
                            const isCompleted = idx <= stepIndex;
                            const isCurrent = idx === stepIndex;
                            return (
                              <div
                                key={step.label}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <div
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 5,
                                    padding: "4px 10px",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 800,
                                    border: isCompleted
                                      ? `1.5px solid ${accentColor}`
                                      : "1.5px solid #e5e7eb",
                                    background: isCurrent
                                      ? accentColor
                                      : isCompleted
                                        ? `${accentColor}15`
                                        : "#fff",
                                    color: isCurrent
                                      ? "#fff"
                                      : isCompleted
                                        ? accentColor
                                        : "#9ca3af",
                                    boxShadow: isCurrent
                                      ? `0 4px 12px ${accentColor}40`
                                      : "none",
                                    transition: "all 0.18s ease",
                                  }}
                                >
                                  <span style={{ fontSize: 13 }}>{step.icon}</span>
                                  <span>{step.label}</span>
                                </div>
                                {idx < STATUS_STEPS.length - 1 && (
                                  <div
                                    style={{
                                      width: 14,
                                      height: 2,
                                      background:
                                        idx < stepIndex ? accentColor : "#e5e7eb",
                                      borderRadius: 2,
                                    }}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* แสดงข้อความเด่นๆ สำหรับสถานะนอก flow */}
                      {isCancelled && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 12px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 800,
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          ✕ ยกเลิกแล้ว
                        </div>
                      )}

                      {stepIndex < 0 && !isCancelled && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "5px 12px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 800,
                            background: `${accentColor}15`,
                            color: accentColor,
                            border: `1px solid ${accentColor}40`,
                          }}
                        >
                          {statusIcon(order.status)} {order.status || "ยังไม่ระบุ"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        ...pillBase,
                        ...paymentBadgeStyle(order.paymentMethod),
                      }}
                    >
                      {paymentLabel(order.paymentMethod)}
                    </span>

                    <span
                      style={{
                        ...pillBase,
                        ...statusBadgeStyle(order.status),
                      }}
                    >
                      {order.status || "ยังไม่ระบุสถานะ"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.9fr",
                    gap: 20,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 16 }}>
                    <section style={sectionStyle}>
                      <div style={sectionTitle}>ข้อมูลลูกค้า</div>
                      <div style={infoRow}>
                        <strong>ชื่อผู้รับ:</strong> {getRecipientName(order)}
                      </div>
                      <div style={infoRow}>
                        <strong>เบอร์โทร:</strong> {getPhone(order)}
                      </div>
                      <div style={infoRow}>
                        <strong>ที่อยู่:</strong> {getAddress(order)}
                      </div>
                      <div style={infoRow}>
                        <strong>หมายเหตุ:</strong> {getNote(order)}
                      </div>
                    </section>

                    <section style={sectionStyle}>
                      <div style={sectionTitle}>รายการสินค้า</div>

                      {items.length ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          {items.map((item, idx) => {
                            const qty = Number(item.qty || item.quantity || 1);
                            const price = Number(item.price || 0);
                            const name =
                              item.name || item.title || `สินค้า #${idx + 1}`;

                            return (
                              <div
                                key={`${name}-${idx}`}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: 12,
                                  border: "1px solid #f1f5f9",
                                  borderRadius: 16,
                                  padding: "14px 16px",
                                  background: "#fffaf8",
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: 18,
                                      color: "#0f172a",
                                    }}
                                  >
                                    {name}
                                  </div>
                                  <div
                                    style={{
                                      color: "#64748b",
                                      marginTop: 6,
                                      fontSize: 15,
                                    }}
                                  >
                                    จำนวน {qty}
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontWeight: 900,
                                    fontSize: 18,
                                    color: "#111827",
                                  }}
                                >
                                  ฿{(price * qty).toFixed(2)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ color: "#64748b" }}>ไม่มีรายการสินค้า</div>
                      )}

                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px dashed #e2e8f0",
                          fontSize: 18,
                          fontWeight: 900,
                          color: "#ee4d2d",
                        }}
                      >
                        รวมทั้งหมด: ฿{Number(order.total || 0).toFixed(2)}
                      </div>
                    </section>
                  </div>

                  <div style={{ display: "grid", gap: 16 }}>
                    <section style={sectionStyle}>
                      <div style={sectionTitle}>หลักฐานการชำระเงิน</div>

                      {order.paymentMethod === "cod" ? (
                        <div
                          style={{
                            color: "#ea580c",
                            fontWeight: 800,
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: 14,
                            padding: 14,
                          }}
                        >
                          คำสั่งซื้อนี้เป็นแบบเก็บเงินปลายทาง
                        </div>
                      ) : order.slip ? (
                        <div
                          style={{
                            border: "1px solid #f1f5f9",
                            borderRadius: 16,
                            padding: 12,
                            background: "#fff",
                          }}
                        >
                          <img
                            src={order.slip}
                            alt={order.slipName || "payment slip"}
                            style={{
                              width: "100%",
                              height: "auto",
                              display: "block",
                              borderRadius: 12,
                              objectFit: "contain",
                              background: "#f8fafc",
                            }}
                          />
                          <div
                            style={{
                              marginTop: 10,
                              color: "#64748b",
                              fontSize: 14,
                            }}
                          >
                            {order.slipName || "slip"}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            color: "#dc2626",
                            fontWeight: 800,
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            borderRadius: 14,
                            padding: 14,
                          }}
                        >
                          ยังไม่มีหลักฐานการชำระเงิน
                        </div>
                      )}
                    </section>

                    <section style={sectionStyle}>
                      <div style={sectionTitle}>เปลี่ยนสถานะ</div>

                      <div style={{ display: "grid", gap: 12 }}>
                        <button
                          onClick={() =>
                            updateStatus(
                              order.id,
                              order.paymentMethod === "cod"
                                ? "อนุมัติแล้ว"
                                : "ชำระเงินแล้ว"
                            )
                          }
                          disabled={updatingId === order.id}
                          style={{
                            ...actionBtn,
                            background:
                              "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
                            color: "#fff",
                            boxShadow: "0 10px 20px rgba(238,77,45,0.20)",
                          }}
                        >
                          {updatingId === order.id ? "กำลังอัปเดต..." : "อนุมัติ"}
                        </button>

                        <button
                          onClick={() => updateStatus(order.id, "รอจัดส่ง")}
                          disabled={updatingId === order.id}
                          style={{
                            ...actionBtn,
                            background: "#fff7ed",
                            color: "#ea580c",
                            border: "1px solid #fdba74",
                          }}
                        >
                          รอจัดส่ง
                        </button>

                        <button
                          onClick={() => updateStatus(order.id, "จัดส่งแล้ว")}
                          disabled={updatingId === order.id}
                          style={{
                            ...actionBtn,
                            background: "#fff",
                            color: "#7c3aed",
                            border: "1px solid #ddd6fe",
                          }}
                        >
                          จัดส่งแล้ว
                        </button>

                        <button
                          onClick={() => updateStatus(order.id, "ได้รับสินค้าแล้ว")}
                          disabled={updatingId === order.id}
                          style={{
                            ...actionBtn,
                            background: "linear-gradient(135deg,#16a34a 0%,#22c55e 100%)",
                            color: "#fff",
                            border: "1px solid #16a34a",
                            boxShadow: "0 8px 16px rgba(22,163,74,0.20)",
                          }}
                          title="ลูกค้ายืนยันว่าได้รับสินค้าแล้ว — ระบบจะคิดคอมมิชชั่นให้ครีเอเตอร์"
                        >
                          ✅ ลูกค้าได้รับของแล้ว
                        </button>

                        <button
                          onClick={() => deleteOrder(order.id)}
                          disabled={updatingId === order.id}
                          style={{
                            ...actionBtn,
                            background: "#fff",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          ลบคำสั่งซื้อ
                        </button>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function SummaryBox({
  title,
  value,
  note,
  tone,
}: {
  title: string;
  value: string;
  note?: string;
  tone: "dark" | "orange" | "green" | "blue";
}) {
  const toneStyle =
    tone === "orange"
      ? {
          background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)",
          border: "1px solid #fed7aa",
          color: "#ea580c",
        }
      : tone === "green"
      ? {
          background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
          border: "1px solid #a7f3d0",
          color: "#059669",
        }
      : tone === "blue"
      ? {
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
          border: "1px solid #bfdbfe",
          color: "#2563eb",
        }
      : {
          background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
          border: "1px solid #e2e8f0",
          color: "#0f172a",
        };

  return (
    <div style={{ ...summaryBoxStyle, ...toneStyle }}>
      <div style={summaryTitleStyle}>{title}</div>
      <div style={summaryValueStyle}>{value}</div>
      {note ? <div style={summaryNoteStyle}>{note}</div> : null}
    </div>
  );
}


const emptyBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #f1f5f9",
  borderRadius: 24,
  padding: 24,
  color: "#64748b",
  boxShadow: "0 8px 24px rgba(15,23,42,0.04)",
};

const sectionStyle: React.CSSProperties = {
  border: "1px solid #f1f5f9",
  borderRadius: 20,
  padding: 18,
  background: "#fff",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  marginBottom: 14,
  color: "#0f172a",
};

const infoRow: React.CSSProperties = {
  marginBottom: 10,
  lineHeight: 1.7,
  color: "#334155",
  fontSize: 16,
};

const pillBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 36,
  padding: "0 14px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const actionBtn: React.CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 14,
  fontWeight: 900,
  fontSize: 16,
  cursor: "pointer",
  border: "none",
  transition: "all 0.2s ease",
};

const filterCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #f1f5f9",
  borderRadius: 24,
  padding: 20,
  marginBottom: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
};

const filterHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 16,
};

const filterTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
};

const filterSubStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontWeight: 700,
};

const clearFilterButtonStyle: React.CSSProperties = {
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  color: "#ea580c",
  borderRadius: 14,
  minHeight: 42,
  padding: "0 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const filterLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#334155",
  fontWeight: 900,
  fontSize: 14,
};

const filterInputStyle: React.CSSProperties = {
  height: 46,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "0 14px",
  fontWeight: 800,
  color: "#0f172a",
  background: "#fff",
  outline: "none",
};

const summaryGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const summaryBoxStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 16,
};

const summaryTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  opacity: 0.9,
  marginBottom: 8,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
};

const summaryNoteStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontWeight: 800,
  fontSize: 13,
};

const dailyBoxStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 14,
  background: "#f8fafc",
};

const dailyTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 12,
};

const dailyEmptyStyle: React.CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 14,
  padding: 14,
  color: "#64748b",
  background: "#fff",
  fontWeight: 800,
};

const dailyRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "180px 1fr",
  gap: 12,
  alignItems: "center",
  padding: 12,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  background: "#fff",
};

const dailyDateStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const dailyMetaStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#64748b",
  fontSize: 13,
  fontWeight: 700,
};

const dailyAmountGroupStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  alignItems: "center",
};

const dailyAmountStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#334155",
};

const dailyTotalStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#ee4d2d",
  fontSize: 16,
};


const filterBlockTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  margin: "14px 0 8px",
};

const dateSelectGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
};

const paymentFilterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10,
  marginBottom: 16,
};

const paymentFilterButtonStyle: React.CSSProperties = {
  minHeight: 46,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  borderRadius: 14,
  fontWeight: 900,
  cursor: "pointer",
};

const paymentFilterActiveStyle: React.CSSProperties = {
  background: "#ee4d2d",
  color: "#fff",
  borderColor: "#ee4d2d",
  boxShadow: "0 8px 18px rgba(238,77,45,0.20)",
};

const batchBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 14,
  background: "#f8fafc",
  marginBottom: 16,
};

const batchTextStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  marginRight: "auto",
};

const batchSoftButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  borderRadius: 12,
  minHeight: 38,
  padding: "0 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const batchOrangeButtonStyle: React.CSSProperties = {
  ...batchSoftButtonStyle,
  background: "#fff7ed",
  color: "#ea580c",
  borderColor: "#fed7aa",
};

const batchPurpleButtonStyle: React.CSSProperties = {
  ...batchSoftButtonStyle,
  background: "#f5f3ff",
  color: "#7c3aed",
  borderColor: "#ddd6fe",
};

const batchRedButtonStyle: React.CSSProperties = {
  ...batchSoftButtonStyle,
  background: "#fef2f2",
  color: "#dc2626",
  borderColor: "#fecaca",
};

const orderJumpBoxStyle: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 14,
  background: "#fff",
};

const orderJumpTitleStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 10,
};

const orderJumpListStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
};

const orderJumpRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "26px minmax(0, 1fr) auto",
  gap: 10,
  alignItems: "center",
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 14,
  padding: 10,
};

const orderJumpMainButtonStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(170px, 1fr) 160px 120px 110px",
  gap: 10,
  alignItems: "center",
  width: "100%",
  border: "none",
  background: "transparent",
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
};

const orderJumpIdStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const orderJumpMetaStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
  marginTop: 4,
};

const orderJumpPaymentStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#334155",
};

const orderJumpTotalStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#ee4d2d",
};

const orderJumpActionStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#2563eb",
  textAlign: "right",
};

const orderJumpQuickActionStyle: React.CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const quickApproveButtonStyle: React.CSSProperties = {
  border: "1px solid #ee4d2d",
  background: "#ee4d2d",
  color: "#fff",
  borderRadius: 10,
  height: 34,
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const quickShipButtonStyle: React.CSSProperties = {
  border: "1px solid #fdba74",
  background: "#fff7ed",
  color: "#ea580c",
  borderRadius: 10,
  height: 34,
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const quickDoneButtonStyle: React.CSSProperties = {
  border: "1px solid #ddd6fe",
  background: "#fff",
  color: "#7c3aed",
  borderRadius: 10,
  height: 34,
  padding: "0 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const quickDeliveredButtonStyle: React.CSSProperties = {
  border: "1px solid #16a34a",
  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
  color: "#fff",
  borderRadius: 10,
  height: 34,
  padding: "0 12px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(22,163,74,0.20)",
};


const calendarGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const calendarLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#334155",
  fontWeight: 900,
  fontSize: 14,
};

const calendarInputStyle: React.CSSProperties = {
  height: 48,
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: "0 14px",
  fontWeight: 900,
  color: "#0f172a",
  background: "#fff",
  outline: "none",
  cursor: "pointer",
};

const calendarThaiTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
};
