"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type User = {
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
  creatorDisplayName?: string;
  creatorCode?: string;
  creatorPayment?: {
    promptPay?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
  payoutAccount?: {
    promptPay?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
};

type OrderItem = {
  id?: string | number;
  productId?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  price?: number;
  qty?: number;
  quantity?: number;
  image?: string;
  refReview?: string;
  creatorName?: string;
};

type Order = {
  id?: string;
  total?: number;
  createdAt?: string;
  status?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  paymentMethod?: string;
  refReview?: string;
  refReviewId?: string;
  commissionAmount?: number;
  commissionStatus?: string;
  commissionOwnerUserId?: string;
  commissionApprovedAt?: string;
  commissionPaidAt?: string;
  commissionSlipUrl?: string;
  items?: OrderItem[];
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

type Review = {
  id?: string;
  title?: string;
  creatorName?: string;
  customerName?: string;
  userId?: string;
  commissionOwnerUserId?: string;
  productId?: number;
  productIds?: number[];
  reviewLink?: string;
  views?: number;
  clicks?: number;
  ordersCount?: number;
  commissionTotal?: number;
};

type Product = {
  id?: string | number;
  name?: string;
  slug?: string;
  price?: number;
  image?: string;
};

type Commission = {
  id?: string;
  orderId?: string;
  reviewId?: string;
  creatorUserId?: string;
  userId?: string;
  productId?: string | number;
  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  amount?: number;
  status?: string;
  createdAt?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  paymentRef?: string | null;
};

type Row = {
  id: string;
  commission: Commission;
  order?: Order;
  creator?: User;
  review?: Review;
  product?: Product;
  matchedItem?: OrderItem;
  orderId: string;
  reviewId: string;
  creatorUserId: string;
  productId: string;
  saleAmount: number;
  rate: number;
  amount: number;
  status: string;
  createdAt?: string;
};

function money(value?: number) {
  return `฿${Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function dateText(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("th-TH");
  } catch {
    return "-";
  }
}

function statusText(status?: string) {
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "paid") return "โอนแล้ว";
  if (status === "rejected") return "ระงับ";
  if (status === "requested") return "รออนุมัติถอน";
  if (status === "unconfirmed") return "รอลูกค้ารับของ";
  return "รอโอน";
}

function statusStyle(status?: string): React.CSSProperties {
  if (status === "paid") return { background: "#ecfdf5", color: "#166534", borderColor: "#86efac" };
  if (status === "approved") return { background: "#eff6ff", color: "#1d4ed8", borderColor: "#93c5fd" };
  if (status === "rejected") return { background: "#fef2f2", color: "#991b1b", borderColor: "#fca5a5" };
  if (status === "requested") return { background: "#fff7ed", color: "#9a3412", borderColor: "#fdba74" };
  if (status === "unconfirmed") return { background: "#f1f5f9", color: "#475569", borderColor: "#cbd5e1" };
  return { background: "#fff7ed", color: "#9a3412", borderColor: "#fdba74" };
}

function paymentText(user?: User) {
  const p = user?.creatorPayment || user?.payoutAccount;
  if (!p) return "-";
  if (p.promptPay) return `PromptPay: ${p.promptPay}`;
  return `${p.bankName || "-"} / ${p.accountName || "-"} / ${p.accountNumber || "-"}`;
}

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [admin, setAdmin] = useState<User | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);
  const [filter, setFilter] = useState("all");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [savingId, setSavingId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editSaleAmount, setEditSaleAmount] = useState("");
  const [editRatePercent, setEditRatePercent] = useState("");
  const [editAmount, setEditAmount] = useState("");

  async function loadData() {
    try {
      setLoading(true);

      const authRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const authData = await authRes.json().catch(() => null);
      const me = authData?.user || null;

      if (!authRes.ok || !me || me.role !== "admin") {
        alert("หน้านี้สำหรับแอดมินเท่านั้น");
        location.href = "/login?next=/admin/finance";
        return;
      }

      setAdmin(me);

      const res = await fetch("/api/admin/commissions", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        alert(data?.message || "โหลดข้อมูลคอมมิชชั่นไม่สำเร็จ");
        setRows([]);
        return;
      }

      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (err) {
      console.error(err);
      alert("โหลดข้อมูลการเงินไม่สำเร็จ");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selected) return;
    setEditSaleAmount(String(Number(selected.saleAmount || 0)));
    setEditRatePercent(String(Number((selected.rate || 0) * 100).toFixed(2)));
    setEditAmount(String(Number(selected.amount || 0)));
  }, [selected]);


  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const keyword = q.trim().toLowerCase();
      const passStatus = filter === "all" ? true : row.status === filter;
      const passCreator = creatorFilter === "all" ? true : row.creatorUserId === creatorFilter;
      const rowTime = new Date(row.createdAt || row.order?.createdAt || "").getTime();

const passDateFrom = dateFrom
  ? rowTime >= new Date(`${dateFrom}T00:00:00`).getTime()
  : true;

const passDateTo = dateTo
  ? rowTime <= new Date(`${dateTo}T23:59:59`).getTime()
  : true;

      const text = [
        row.id,
        row.orderId,
        row.reviewId,
        row.creatorUserId,
        row.creator?.creatorDisplayName,
        row.creator?.displayName,
        row.creator?.name,
        row.creator?.email,
        row.review?.title,
        row.review?.creatorName,
        row.product?.name,
        row.matchedItem?.name,
        row.order?.fullName,
        row.order?.email,
      ]
        .join(" ")
        .toLowerCase();

      return passStatus && passCreator && passDateFrom && passDateTo && (!keyword || text.includes(keyword));
    });
  }, [rows, q, filter, creatorFilter, dateFrom, dateTo]);

  const creatorOptions = useMemo(() => {
    const map = new Map<string, string>();

    rows.forEach((row) => {
      const id = String(row.creatorUserId || "").trim();
      if (!id) return;

      const label =
        row.creator?.creatorDisplayName ||
        row.creator?.displayName ||
        row.creator?.name ||
        row.creator?.email ||
        id;

      map.set(id, label);
    });

    return Array.from(map.entries()).sort((a, b) =>
      a[1].localeCompare(b[1], "th")
    );
  }, [rows]);

  const stats = useMemo(() => {
    const totalSales = filteredRows.reduce((sum, r) => sum + Number(r.saleAmount || 0), 0);
    const totalCommission = filteredRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const pending = filteredRows.filter((r) => r.status === "pending").reduce((sum, r) => sum + r.amount, 0);
    const requested = filteredRows.filter((r) => r.status === "requested").reduce((sum, r) => sum + r.amount, 0);
    const approved = filteredRows.filter((r) => r.status === "approved").reduce((sum, r) => sum + r.amount, 0);
    const paid = filteredRows.filter((r) => r.status === "paid").reduce((sum, r) => sum + r.amount, 0);
    const creators = new Set(filteredRows.map((r) => r.creatorUserId).filter(Boolean)).size;
    const reviews = new Set(filteredRows.map((r) => r.reviewId).filter(Boolean)).size;
    const conversionBase = reviews > 0 ? (filteredRows.length / reviews).toFixed(1) : "0";

    return { totalSales, totalCommission, pending, requested, approved, paid, creators, reviews, conversionBase };
  }, [filteredRows]);

  const topCreators = useMemo(() => {
    const map = new Map<string, { creator?: User; amount: number; sales: number; orders: number }>();

    filteredRows.forEach((row) => {
      const key = row.creatorUserId || "unknown";
      const old = map.get(key) || { creator: row.creator, amount: 0, sales: 0, orders: 0 };
      old.creator = old.creator || row.creator;
      old.amount += row.amount;
      old.sales += row.saleAmount;
      old.orders += 1;
      map.set(key, old);
    });

    return Array.from(map.entries())
      .map(([creatorId, data]) => ({ creatorId, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredRows]);

  const topReviews = useMemo(() => {
    const map = new Map<string, { review?: Review; amount: number; sales: number; orders: number }>();

    filteredRows.forEach((row) => {
      const key = row.reviewId || "unknown";
      const old = map.get(key) || { review: row.review, amount: 0, sales: 0, orders: 0 };
      old.review = old.review || row.review;
      old.amount += row.amount;
      old.sales += row.saleAmount;
      old.orders += 1;
      map.set(key, old);
    });

    return Array.from(map.entries())
      .map(([reviewId, data]) => ({ reviewId, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filteredRows]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllFiltered() {
    setSelectedIds(filteredRows.map((row) => row.id));
  }

  function clearSelected() {
    setSelectedIds([]);
  }

  async function updateSelectedStatus(nextStatus: string) {
    if (selectedIds.length === 0) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    const confirmed = window.confirm(`ต้องการเปลี่ยนสถานะ ${selectedIds.length} รายการ เป็น "${statusText(nextStatus)}" ใช่ไหม?`);
    if (!confirmed) return;

    try {
      setSavingId("batch");

      for (const id of selectedIds) {
        const row = rows.find((item) => item.id === id);
        if (!row) continue;

        const res = await fetch("/api/admin/commissions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            commissionId: row.id,
            orderId: row.orderId,
            commissionStatus: nextStatus,
          }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || `อัปเดต ${row.id} ไม่สำเร็จ`);
        }
      }

      clearSelected();
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "อัปเดตแบบชุดไม่สำเร็จ");
    } finally {
      setSavingId("");
    }
  }

  async function deleteCommission(row: Row) {
    const confirmed = window.confirm(`ต้องการลบรายการคอมมิชชั่น ${row.id} ใช่ไหม?`);
    if (!confirmed) return;

    try {
      setSavingId(row.id);

      const res = await fetch("/api/admin/commissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ commissionId: row.id, orderId: row.orderId }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        alert(data?.message || "ลบรายการไม่สำเร็จ");
        return;
      }

      setSelected(null);
      setSelectedIds((prev) => prev.filter((id) => id !== row.id));
      await loadData();
    } catch (err) {
      console.error(err);
      alert("ลบรายการไม่สำเร็จ");
    } finally {
      setSavingId("");
    }
  }

  async function deleteSelectedCommissions() {
    if (selectedIds.length === 0) {
      alert("กรุณาเลือกรายการก่อน");
      return;
    }

    const confirmed = window.confirm(`ต้องการลบ ${selectedIds.length} รายการใช่ไหม?`);
    if (!confirmed) return;

    try {
      setSavingId("batch-delete");

      for (const id of selectedIds) {
        const row = rows.find((item) => item.id === id);
        if (!row) continue;

        const res = await fetch("/api/admin/commissions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ commissionId: row.id, orderId: row.orderId }),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message || `ลบ ${row.id} ไม่สำเร็จ`);
        }
      }

      clearSelected();
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "ลบแบบชุดไม่สำเร็จ");
    } finally {
      setSavingId("");
    }
  }

  async function saveCommissionNumbers(row: Row) {
    const saleAmount = Number(editSaleAmount || 0);
    const rate = Number(editRatePercent || 0) / 100;
    const amount = Number(editAmount || 0);

    if (amount < 0 || saleAmount < 0 || rate < 0) {
      alert("ตัวเลขต้องไม่ติดลบ");
      return;
    }

    try {
      setSavingId(row.id);

      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          commissionId: row.id,
          orderId: row.orderId,
          reviewId: row.reviewId,
          creatorUserId: row.creatorUserId,
          productId: row.productId,
          saleAmount,
          commissionRate: rate,
          commissionAmount: amount,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        alert(data?.message || "บันทึกตัวเลขไม่สำเร็จ");
        return;
      }

      await loadData();
      const refreshedRow = (data?.rows || []).find((item: Row) => item.id === row.id);
      if (refreshedRow) setSelected(refreshedRow);
    } catch (err) {
      console.error(err);
      alert("บันทึกตัวเลขไม่สำเร็จ");
    } finally {
      setSavingId("");
    }
  }

  async function updateCommission(row: Row, nextStatus: string) {
    const confirmed = window.confirm(`ยืนยันเปลี่ยนสถานะเป็น "${statusText(nextStatus)}" ?`);
    if (!confirmed) return;

    try {
      setSavingId(row.id);

      const res = await fetch("/api/admin/commissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          commissionId: row.id,
          orderId: row.orderId,
          commissionStatus: nextStatus,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        alert(data?.message || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }

      await loadData();
      setSelected(null);
    } catch (err) {
      console.error(err);
      alert("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setSavingId("");
    }
  }

  if (loading) {
    return <div style={page}>กำลังโหลด Shopee Affiliate Dashboard...</div>;
  }

  return (
    <div style={page}>
      <div style={topbar}>
        <div>
          <h1 style={title}>Shopee Affiliate Dashboard</h1>
          <p style={sub}>คอมมิชชั่นแยกตามรีวิว / Top creator / Orders from review / Conversion</p>
          {admin ? <p style={muted}>Admin: {admin.name || admin.email}</p> : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={loadData} style={softBtn}>รีเฟรช</button>
          <Link href="/admin" style={softBtn}>กลับ Dashboard</Link>
          <Link href="/" style={darkBtn}>หน้าร้าน</Link>
        </div>
      </div>

      <div style={grid6}>
        <Stat title="ยอดขายจากรีวิว" value={money(stats.totalSales)} tone="dark" />
        <Stat title="คอมมิชชั่นรวม" value={money(stats.totalCommission)} tone="orange" />
        <Stat title="รออนุมัติถอน" value={money(stats.requested)} tone="blue" />
        <Stat title="อนุมัติแล้ว" value={money(stats.approved)} tone="purple" />
        <Stat title="โอนแล้ว" value={money(stats.paid)} tone="green" />
      </div>

      <div style={miniGrid}>
        <MiniStat label="Creator Active" value={`${stats.creators} คน`} />
        <MiniStat label="Review ที่เกิดยอด" value={`${stats.reviews} รีวิว`} />
        <MiniStat label="Order from review" value={`${rows.length} รายการ`} />
        <MiniStat label="Avg orders / review" value={`${stats.conversionBase}`} />
      </div>

      <div style={layout}>
        <main style={{ display: "grid", gap: 18, minWidth: 0 }}>
          <section style={card}>
            <div style={sectionHead}>
              <div>
                <h2 style={h2}>รายการคอมมิชชั่นแยกตามรีวิว</h2>
                <p style={muted}>คิดจากสินค้า item ที่มาจาก refReview เท่านั้น ไม่รวมทั้งบิล</p>
              </div>
              <div style={pill}>ทั้งหมด {filteredRows.length} รายการ</div>
            </div>

            <div style={toolbar}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ค้นหา Order / Creator / Review / Product / Customer"
                style={input}
              />

              <select
                value={creatorFilter}
                onChange={(e) => setCreatorFilter(e.target.value)}
                style={select}
              >
                <option value="all">ทุกครีเอเตอร์</option>
                {creatorOptions.map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>

              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={input}
              />

              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={input}
              />

              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={select}>
                <option value="all">ทุกสถานะ</option>
                <option value="pending">รอโอน</option>
                <option value="requested">รออนุมัติถอน</option>
                <option value="approved">อนุมัติแล้ว</option>
                <option value="paid">โอนแล้ว</option>
                <option value="rejected">ระงับ</option>
              </select>
            </div>

            <div style={batchBar}>
              <div style={batchText}>เลือกแล้ว {selectedIds.length} รายการ</div>
              <button type="button" onClick={selectAllFiltered} style={miniBtn}>เลือกทั้งหมดที่กรอง</button>
              <button type="button" onClick={clearSelected} style={miniBtn}>ยกเลิกเลือก</button>
              <button type="button" onClick={() => updateSelectedStatus("approved")} disabled={savingId !== ""} style={blueBtn}>อนุมัติชุด</button>
              <button type="button" onClick={() => updateSelectedStatus("paid")} disabled={savingId !== ""} style={greenBtn}>โอนแล้วชุด</button>
              <button type="button" onClick={() => updateSelectedStatus("rejected")} disabled={savingId !== ""} style={redBtn}>ระงับชุด</button>
              <button type="button" onClick={deleteSelectedCommissions} disabled={savingId !== ""} style={outlineRedBtn}>ลบชุด</button>
            </div>

            {filteredRows.length === 0 ? (
              <div style={empty}>ยังไม่มีรายการคอมมิชชั่นจากรีวิว</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>เลือก</th>
                      <th style={th}>วันที่</th>
                      <th style={th}>Order</th>
                      <th style={th}>Creator</th>
                      <th style={th}>Review</th>
                      <th style={th}>สินค้า</th>
                      <th style={thRight}>ยอดจากรีวิว</th>
                      <th style={thRight}>Rate</th>
                      <th style={thRight}>คอม</th>
                      <th style={th}>สถานะ</th>
                      <th style={th}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} style={selectedIds.includes(row.id) ? selectedTr : tr}>
                        <td style={td}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={() => toggleSelected(row.id)}
                            style={{ width: 18, height: 18 }}
                          />
                        </td>
                        <td style={td}>{dateText(row.createdAt || row.order?.createdAt)}</td>
                        <td style={tdStrong}>{row.orderId || "-"}</td>
                        <td style={td}>
                          {row.creator?.creatorDisplayName || row.creator?.displayName || row.creator?.name || row.creatorUserId || "-"}
                          <div style={small}>{row.creator?.email || ""}</div>
                        </td>
                        <td style={td}>
                          {row.review?.title || row.review?.creatorName || row.reviewId || "-"}
                          <div style={small}>{row.reviewId}</div>
                        </td>
                        <td style={td}>
                          {row.product?.name || row.matchedItem?.name || row.matchedItem?.title || row.productId || "-"}
                          <div style={small}>Product ID: {row.productId || "-"}</div>
                        </td>
                        <td style={tdRight}>{money(row.saleAmount)}</td>
                        <td style={tdRight}>{Number(row.rate * 100 || 0).toFixed(0)}%</td>
                        <td style={tdRightStrong}>{money(row.amount)}</td>
                        <td style={td}>
                          <span style={{ ...badge, ...statusStyle(row.status) }}>{statusText(row.status)}</span>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button onClick={() => setSelected(row)} style={miniBtn}>ดูที่มา</button>
                            <button onClick={() => updateCommission(row, "approved")} disabled={savingId === row.id} style={tinyBlueBtn}>อนุมัติ</button>
                            <button onClick={() => updateCommission(row, "paid")} disabled={savingId === row.id} style={tinyGreenBtn}>โอนแล้ว</button>
                            <button onClick={() => deleteCommission(row)} disabled={savingId === row.id} style={tinyRedBtn}>ลบ</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>

        <aside style={{ display: "none" }}>
          <section style={card}>
            <h2 style={h2}>Top Creator</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {topCreators.length === 0 ? <div style={empty}>ยังไม่มีข้อมูล</div> : topCreators.map((item, index) => (
                <div key={item.creatorId} style={rankBox}>
                  <div style={rankNo}>#{index + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={rankTitle}>{item.creator?.creatorDisplayName || item.creator?.name || item.creatorId}</div>
                    <div style={small}>Orders {item.orders} • Sales {money(item.sales)}</div>
                  </div>
                  <div style={rankMoney}>{money(item.amount)}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>Top Review</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
              {topReviews.length === 0 ? <div style={empty}>ยังไม่มีข้อมูล</div> : topReviews.map((item, index) => (
                <div key={item.reviewId} style={rankBox}>
                  <div style={rankNo}>#{index + 1}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={rankTitle}>{item.review?.title || item.reviewId}</div>
                    <div style={small}>Orders {item.orders} • Sales {money(item.sales)}</div>
                  </div>
                  <div style={rankMoney}>{money(item.amount)}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={card}>
            <h2 style={h2}>เมนูลัด</h2>
            <Link href="/admin/orders" style={sideLink}>คำสั่งซื้อ</Link>
            <Link href="/admin/creators" style={sideLink}>ครีเอเตอร์</Link>
            <Link href="/admin/reviews" style={sideLink}>รีวิว</Link>
          </section>
        </aside>
      </div>

      {selected && (
        <div style={modalOverlay} onClick={() => setSelected(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={sectionHead}>
              <div>
                <h2 style={h2}>รายละเอียดคอมมิชชั่นจากรีวิว</h2>
                <p style={muted}>Commission ID: {selected.id}</p>
              </div>
              <button onClick={() => setSelected(null)} style={softBtn}>ปิด</button>
            </div>

            <div style={detailGrid}>
              <Detail label="Order ID" value={selected.orderId || "-"} />
              <Detail label="Customer" value={selected.order?.fullName || selected.order?.shippingAddress?.fullName || "-"} />
              <Detail label="Customer Email" value={selected.order?.email || selected.order?.shippingAddress?.email || "-"} />
              <Detail label="Creator" value={selected.creator?.creatorDisplayName || selected.creator?.name || selected.creatorUserId || "-"} />
              <Detail label="Creator Email" value={selected.creator?.email || "-"} />
              <Detail label="Review" value={selected.review?.title || selected.reviewId || "-"} />
              <Detail label="Product" value={selected.product?.name || selected.matchedItem?.name || selected.productId || "-"} />
              <Detail label="ยอดขายจากรีวิว" value={money(selected.saleAmount)} />
              <Detail label="Rate" value={`${Number(selected.rate * 100 || 0).toFixed(0)}%`} />
              <Detail label="คอมมิชชั่น" value={money(selected.amount)} />
              <Detail label="สถานะ" value={statusText(selected.status)} />
              <Detail label="วันที่เกิดรายการ" value={dateText(selected.createdAt)} />
              <Detail label="วิธีรับเงิน" value={paymentText(selected.creator)} />
              <Detail label="อนุมัติเมื่อ" value={dateText(selected.commission.approvedAt || selected.order?.commissionApprovedAt)} />
              <Detail label="โอนเมื่อ" value={dateText(selected.commission.paidAt || selected.order?.commissionPaidAt)} />
              <Detail label="Payment Ref" value={String(selected.commission.paymentRef || selected.order?.commissionSlipUrl || "-")} />
            </div>

            <div style={editBox}>
              <b>แก้ไขตัวเลขคอมมิชชั่น</b>
              <div style={editGrid}>
                <label style={editLabel}>
                  ยอดขายจากรีวิว
                  <input
                    value={editSaleAmount}
                    onChange={(e) => {
                      const sale = e.target.value;
                      setEditSaleAmount(sale);
                      const rate = Number(editRatePercent || 0) / 100;
                      if (rate > 0) setEditAmount(String(Number((Number(sale || 0) * rate).toFixed(2))));
                    }}
                    style={input}
                    inputMode="decimal"
                  />
                </label>

                <label style={editLabel}>
                  Rate (%)
                  <input
                    value={editRatePercent}
                    onChange={(e) => {
                      const rateText = e.target.value;
                      setEditRatePercent(rateText);
                      const sale = Number(editSaleAmount || 0);
                      const rate = Number(rateText || 0) / 100;
                      setEditAmount(String(Number((sale * rate).toFixed(2))));
                    }}
                    style={input}
                    inputMode="decimal"
                  />
                </label>

                <label style={editLabel}>
                  คอมมิชชั่น
                  <input
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    style={input}
                    inputMode="decimal"
                  />
                </label>
              </div>

              <button disabled={savingId === selected.id} onClick={() => saveCommissionNumbers(selected)} style={darkBtn}>
                บันทึกตัวเลขคอมมิชชั่น
              </button>
            </div>

            <div style={productBox}>
              <b>รายการสินค้าในออเดอร์นี้</b>
              {(selected.order?.items || []).length === 0 ? (
                <div style={small}>ไม่มีรายการสินค้า</div>
              ) : (
                <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                  {(selected.order?.items || []).map((item, index) => {
                    const isThisReview = String(item.refReview || "") === String(selected.reviewId || "");
                    return (
                      <div key={`${item.id}-${index}`} style={{ ...itemLine, borderColor: isThisReview ? "#ee4d2d" : "#e5e7eb", background: isThisReview ? "#fff7f5" : "#fff" }}>
                        <div>
                          <b>{item.name || item.title || "สินค้า"}</b>
                          <div style={small}>refReview: {item.refReview || "ไม่มาจากรีวิว"}</div>
                        </div>
                        <div style={{ textAlign: "right", fontWeight: 900 }}>
                          {money(Number(item.price || 0) * Number(item.qty || item.quantity || 1))}
                          <div style={small}>x {item.qty || item.quantity || 1}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={actionRow}>
              <button disabled={savingId === selected.id} onClick={() => updateCommission(selected, "approved")} style={blueBtn}>อนุมัติโอน</button>
              <button disabled={savingId === selected.id} onClick={() => updateCommission(selected, "paid")} style={greenBtn}>บันทึกว่าโอนแล้ว</button>
              <button disabled={savingId === selected.id} onClick={() => updateCommission(selected, "rejected")} style={redBtn}>ระงับยอด</button>
              <button disabled={savingId === selected.id} onClick={() => deleteCommission(selected)} style={outlineRedBtn}>ลบรายการคอมมิชชั่น</button>
              <Link href={`/admin/orders?orderId=${encodeURIComponent(selected.orderId || "")}`} style={softBtn}>ไปหน้าออเดอร์</Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value, tone }: { title: string; value: string; tone: string }) {
  const bg =
    tone === "green" ? "linear-gradient(135deg,#16a34a,#22c55e)" :
    tone === "blue" ? "linear-gradient(135deg,#2563eb,#60a5fa)" :
    tone === "purple" ? "linear-gradient(135deg,#7c3aed,#a78bfa)" :
    tone === "warning" ? "linear-gradient(135deg,#f97316,#fb923c)" :
    tone === "orange" ? "linear-gradient(135deg,#ee4d2d,#ff7337)" :
    "linear-gradient(135deg,#0f172a,#334155)";

  return (
    <div style={{ ...statCard, background: bg }}>
      <div style={statTitle}>{title}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={miniStat}>
      <div style={small}>{label}</div>
      <div style={{ fontWeight: 900, fontSize: 22, color: "#0f172a" }}>{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailBox}>
      <div style={small}>{label}</div>
      <div style={{ fontWeight: 900, color: "#0f172a", wordBreak: "break-word" }}>{value}</div>
    </div>
  );
}

const page: React.CSSProperties = { maxWidth: 1500, margin: "28px auto", padding: "0 16px 50px" };
const topbar: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 };
const title: React.CSSProperties = { margin: 0, fontSize: 42, fontWeight: 900, color: "#0f172a" };
const sub: React.CSSProperties = { margin: "8px 0 0", color: "#64748b", fontSize: 18, fontWeight: 700 };
const grid6: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14, marginBottom: 14 };
const miniGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginBottom: 18 };
const miniStat: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: 14, boxShadow: "0 6px 18px rgba(15,23,42,.04)" };
const statCard: React.CSSProperties = { borderRadius: 22, padding: 18, color: "#fff", minHeight: 116, boxShadow: "0 10px 24px rgba(15,23,42,.10)" };
const statTitle: React.CSSProperties = { fontSize: 14, fontWeight: 900, opacity: .95, marginBottom: 16 };
const statValue: React.CSSProperties = { fontSize: 30, fontWeight: 900 };
const layout: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gap: 18,
  alignItems: "start"
};
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 24, padding: 20, boxShadow: "0 8px 24px rgba(15,23,42,.05)" };
const sectionHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 };
const h2: React.CSSProperties = { margin: 0, fontSize: 24, fontWeight: 900, color: "#0f172a" };
const muted: React.CSSProperties = { margin: "6px 0 0", color: "#64748b", fontWeight: 700 };
const toolbar: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(220px,1fr) 190px 150px 150px 170px",
  gap: 12,
  marginBottom: 14
};
const input: React.CSSProperties = { height: 46, border: "1px solid #e2e8f0", borderRadius: 14, padding: "0 14px", fontWeight: 800 };
const select: React.CSSProperties = { height: 46, border: "1px solid #e2e8f0", borderRadius: 14, padding: "0 12px", fontWeight: 800, background: "#fff" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "separate", borderSpacing: "0 10px", minWidth: 1280 };
const th: React.CSSProperties = { textAlign: "left", color: "#64748b", fontSize: 13, padding: "0 12px", fontWeight: 900 };
const thRight: React.CSSProperties = { ...th, textAlign: "right" };
const tr: React.CSSProperties = { background: "#fff" };
const td: React.CSSProperties = { padding: 12, borderTop: "1px solid #eef2f6", borderBottom: "1px solid #eef2f6", color: "#334155", fontWeight: 700, verticalAlign: "top" };
const tdStrong: React.CSSProperties = { ...td, fontWeight: 900, color: "#0f172a" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right" };
const tdRightStrong: React.CSSProperties = { ...tdRight, fontWeight: 900, color: "#ee4d2d" };
const badge: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 32, padding: "0 12px", borderRadius: 999, border: "1px solid", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" };
const small: React.CSSProperties = { color: "#64748b", fontSize: 12, marginTop: 4, fontWeight: 700 };
const pill: React.CSSProperties = { borderRadius: 999, background: "#f1f5f9", padding: "10px 14px", fontWeight: 900, color: "#334155" };
const softBtn: React.CSSProperties = { border: "1px solid #dbe3ef", background: "#fff", color: "#0f172a", borderRadius: 14, minHeight: 42, padding: "0 14px", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 900, cursor: "pointer" };
const darkBtn: React.CSSProperties = { ...softBtn, background: "#0f172a", color: "#fff", borderColor: "#0f172a" };
const miniBtn: React.CSSProperties = { ...softBtn, minHeight: 36, padding: "0 12px" };
const empty: React.CSSProperties = { border: "1px dashed #d1d5db", borderRadius: 18, padding: 22, color: "#64748b", fontWeight: 800 };
const sideLink: React.CSSProperties = { display: "block", textDecoration: "none", color: "#0f172a", fontWeight: 900, padding: "12px 0", borderBottom: "1px solid #eef2f6" };
const rankBox: React.CSSProperties = { display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", border: "1px solid #eef2f6", borderRadius: 16, padding: 12, background: "#fff" };
const rankNo: React.CSSProperties = { width: 34, height: 34, borderRadius: 999, display: "grid", placeItems: "center", background: "#fff1ee", color: "#ee4d2d", fontWeight: 900 };
const rankTitle: React.CSSProperties = { fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const rankMoney: React.CSSProperties = { fontWeight: 900, color: "#ee4d2d", whiteSpace: "nowrap" };
const modalOverlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,.55)", zIndex: 9999, display: "grid", placeItems: "center", padding: 16 };
const modal: React.CSSProperties = { width: "min(980px,100%)", maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: 24, padding: 22, boxShadow: "0 24px 80px rgba(0,0,0,.3)" };
const detailGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 };
const detailBox: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#f8fafc" };
const actionRow: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 };
const blueBtn: React.CSSProperties = { ...softBtn, background: "#2563eb", color: "#fff", borderColor: "#2563eb" };
const greenBtn: React.CSSProperties = { ...softBtn, background: "#16a34a", color: "#fff", borderColor: "#16a34a" };
const redBtn: React.CSSProperties = { ...softBtn, background: "#dc2626", color: "#fff", borderColor: "#dc2626" };
const productBox: React.CSSProperties = { marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 18, padding: 14, background: "#f8fafc" };
const itemLine: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, border: "1px solid #e5e7eb", borderRadius: 14, padding: 12 };

const selectedTr: React.CSSProperties = { background: "#fff7f5" };
const batchBar: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14, border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 16, padding: 12 };
const batchText: React.CSSProperties = { fontWeight: 900, color: "#0f172a", marginRight: "auto" };
const outlineRedBtn: React.CSSProperties = { ...softBtn, color: "#dc2626", borderColor: "#fecaca", background: "#fff" };
const tinyBlueBtn: React.CSSProperties = { ...miniBtn, color: "#2563eb", borderColor: "#bfdbfe", minHeight: 32, padding: "0 10px" };
const tinyGreenBtn: React.CSSProperties = { ...miniBtn, color: "#16a34a", borderColor: "#bbf7d0", minHeight: 32, padding: "0 10px" };
const tinyRedBtn: React.CSSProperties = { ...miniBtn, color: "#dc2626", borderColor: "#fecaca", minHeight: 32, padding: "0 10px" };
const editBox: React.CSSProperties = { marginTop: 16, border: "1px solid #fed7aa", borderRadius: 18, padding: 14, background: "#fff7ed" };
const editGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, margin: "12px 0" };
const editLabel: React.CSSProperties = { display: "grid", gap: 6, fontSize: 13, color: "#9a3412", fontWeight: 900 };
