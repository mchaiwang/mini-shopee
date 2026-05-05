"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Sender = {
  id: string;
  name: string;
  senderName: string;
  phone: string;
  address: string;
  isDefault?: boolean;
};

const emptyForm: Sender = {
  id: "",
  name: "",
  senderName: "",
  phone: "",
  address: "",
  isDefault: false,
};

export default function AdminShippingSendersPage() {
  const [senders, setSenders] = useState<Sender[]>([]);
  const [form, setForm] = useState<Sender>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadSenders() {
    try {
      setLoading(true);
      const res = await fetch("/api/shipping-senders", { cache: "no-store" });
      const data = await res.json();
      setSenders(Array.isArray(data?.senders) ? data.senders : []);
    } catch {
      setSenders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSenders();
  }, []);

  function editSender(sender: Sender) {
    setForm({ ...sender });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveSender() {
  if (!form.name.trim() || !form.senderName.trim() || !form.phone.trim() || !form.address.trim()) {
    alert("กรุณากรอกข้อมูลผู้ส่งให้ครบ");
    return;
  }

  try {
    setSaving(true);

    const res = await fetch("/api/shipping-senders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: form.id || undefined,
        shopName: form.name,
        senderName: form.senderName,
        phone: form.phone,
        address: form.address,
        isDefault: form.isDefault,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data?.success) {
      alert(data?.message || "บันทึกข้อมูลไม่สำเร็จ");
      return;
    }

    alert("บันทึกสำเร็จ");

    setForm(emptyForm);
    await loadSenders();

  } catch (err) {
    console.error(err);
    alert("บันทึกข้อมูลไม่สำเร็จ");
  } finally {
    setSaving(false);
  }
}

  async function deleteSender(sender: Sender) {
    if (!confirm(`ต้องการลบผู้ส่ง "${sender.name}" ใช่ไหม?`)) return;

    try {
      const res = await fetch("/api/shipping-senders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sender.id }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.message || "ลบข้อมูลไม่สำเร็จ");
        return;
      }

      await loadSenders();
    } catch {
      alert("ลบข้อมูลไม่สำเร็จ");
    }
  }

  async function setDefault(sender: Sender) {
    try {
      const res = await fetch("/api/shipping-senders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sender, isDefault: true }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        alert(data?.message || "ตั้งค่าเริ่มต้นไม่สำเร็จ");
        return;
      }

      await loadSenders();
    } catch {
      alert("ตั้งค่าเริ่มต้นไม่สำเร็จ");
    }
  }

  return (
    <main style={pageWrap}>
      <section style={hero}>
        <div>
          <h1 style={title}>จัดการข้อมูลผู้ส่ง</h1>
          <p style={desc}>ใช้สำหรับพิมพ์ใบปะหน้าพัสดุ A4 และเลือกผู้ส่งก่อนจัดส่ง</p>
        </div>

        <Link href="/admin/orders" style={backButton}>
          กลับไปจัดการคำสั่งซื้อ
        </Link>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>{form.id ? "แก้ไขผู้ส่ง" : "เพิ่มผู้ส่งใหม่"}</h2>

        <div style={formGrid}>
          <label style={label}>
            ชื่อชุดผู้ส่ง เช่น โกดังหลัก
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              style={input}
              placeholder="จำรัสฟาร์ม - อุดรธานี"
            />
          </label>

          <label style={label}>
            ชื่อผู้ส่งบนใบปะหน้า
            <input
              value={form.senderName}
              onChange={(e) => setForm((prev) => ({ ...prev, senderName: e.target.value }))}
              style={input}
              placeholder="จำรัสฟาร์ม"
            />
          </label>

          <label style={label}>
            เบอร์โทรผู้ส่ง
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              style={input}
              placeholder="084-428-4363"
            />
          </label>

          <label style={{ ...label, gridColumn: "1 / -1" }}>
            ที่อยู่ผู้ส่ง
            <textarea
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              style={textarea}
              placeholder="ใส่ที่อยู่ผู้ส่ง"
            />
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={Boolean(form.isDefault)}
              onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
            />
            ตั้งเป็นผู้ส่งเริ่มต้น
          </label>
        </div>

        <div style={actionRow}>
          <button type="button" onClick={saveSender} disabled={saving} style={saveButton}>
            {saving ? "กำลังบันทึก..." : "บันทึกผู้ส่ง"}
          </button>

          <button type="button" onClick={() => setForm(emptyForm)} style={cancelButton}>
            ล้างฟอร์ม
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>รายการผู้ส่ง</h2>

        {loading ? (
          <div style={muted}>กำลังโหลด...</div>
        ) : senders.length === 0 ? (
          <div style={muted}>ยังไม่มีข้อมูลผู้ส่ง</div>
        ) : (
          <div style={list}>
            {senders.map((sender) => (
              <article key={sender.id} style={senderCard}>
                <div>
                  <div style={senderName}>
                    {sender.name}
                    {sender.isDefault ? <span style={defaultBadge}>ค่าเริ่มต้น</span> : null}
                  </div>
                  <div style={senderText}>ผู้ส่ง: {sender.senderName}</div>
                  <div style={senderText}>โทร: {sender.phone}</div>
                  <div style={senderText}>ที่อยู่: {sender.address}</div>
                </div>

                <div style={cardActions}>
                  <button type="button" onClick={() => editSender(sender)} style={softButton}>
                    แก้ไข
                  </button>

                  {!sender.isDefault ? (
                    <button type="button" onClick={() => setDefault(sender)} style={softButton}>
                      ตั้งเริ่มต้น
                    </button>
                  ) : null}

                  <button type="button" onClick={() => deleteSender(sender)} style={dangerButton}>
                    ลบ
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const pageWrap: React.CSSProperties = {
  maxWidth: 1100,
  margin: "24px auto",
  padding: "0 16px 40px",
};

const hero: React.CSSProperties = {
  background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
  color: "#fff",
  borderRadius: 24,
  padding: 24,
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
  boxShadow: "0 12px 28px rgba(238,77,45,0.22)",
  marginBottom: 20,
};

const title: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  margin: 0,
};

const desc: React.CSSProperties = {
  margin: "8px 0 0",
  opacity: 0.95,
  fontWeight: 700,
};

const backButton: React.CSSProperties = {
  textDecoration: "none",
  background: "#fff",
  color: "#ee4d2d",
  borderRadius: 14,
  padding: "12px 16px",
  fontWeight: 900,
};

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #f1f5f9",
  borderRadius: 24,
  padding: 20,
  marginBottom: 18,
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 16px",
  fontSize: 24,
  fontWeight: 900,
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 14,
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 8,
  color: "#334155",
  fontWeight: 900,
};

const input: React.CSSProperties = {
  height: 46,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  padding: "0 14px",
  fontWeight: 800,
  outline: "none",
};

const textarea: React.CSSProperties = {
  minHeight: 90,
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  padding: 14,
  fontWeight: 800,
  outline: "none",
  resize: "vertical",
};

const checkRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontWeight: 900,
  color: "#334155",
};

const actionRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 16,
};

const saveButton: React.CSSProperties = {
  border: "none",
  background: "#ee4d2d",
  color: "#fff",
  borderRadius: 14,
  minHeight: 44,
  padding: "0 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const cancelButton: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  borderRadius: 14,
  minHeight: 44,
  padding: "0 18px",
  fontWeight: 900,
  cursor: "pointer",
};

const muted: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
};

const list: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const senderCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 16,
  background: "#f8fafc",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
};

const senderName: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#0f172a",
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const defaultBadge: React.CSSProperties = {
  fontSize: 12,
  background: "#ecfdf5",
  color: "#059669",
  border: "1px solid #a7f3d0",
  borderRadius: 999,
  padding: "3px 8px",
};

const senderText: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  fontWeight: 700,
};

const cardActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const softButton: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#334155",
  borderRadius: 12,
  minHeight: 38,
  padding: "0 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  ...softButton,
  color: "#dc2626",
  borderColor: "#fecaca",
  background: "#fef2f2",
};
