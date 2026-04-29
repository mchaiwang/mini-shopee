"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ReviewTitleItem = {
  id: string;
  label: string;
  active: boolean;
  sortOrder?: number;
};

export default function AdminReviewTitlesPage() {
  const [items, setItems] = useState<ReviewTitleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [keyword, setKeyword] = useState("");

  const [editingId, setEditingId] = useState("");
  const [editingLabel, setEditingLabel] = useState("");
  const [editingActive, setEditingActive] = useState(true);

  const API = "/api/admin/review-titles"; // ✅ แก้ path ตรงนี้

  const load = async () => {
    try {
      setLoading(true);

      const res = await fetch(API, { cache: "no-store" });

      if (!res.ok) {
        throw new Error("โหลด API ไม่สำเร็จ");
      }

      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (error) {
      console.error(error);
      alert("โหลดหัวข้อรีวิวไม่สำเร็จ");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) =>
      String(item.label || "").toLowerCase().includes(q)
    );
  }, [items, keyword]);

  const createItem = async () => {
    if (!newLabel.trim()) return;

    try {
      setSaving(true);

      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "create",
          label: newLabel.trim(),
          active: true,
          sortOrder: items.length + 1,
        }),
      });

      if (!res.ok) {
        throw new Error("POST fail");
      }

      const data = await res.json();

      if (!data?.success) {
        alert(data?.message || "เพิ่มหัวข้อรีวิวไม่สำเร็จ");
        return;
      }

      setNewLabel("");
      await load();
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเพิ่มหัวข้อรีวิว");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: ReviewTitleItem) => {
    setEditingId(item.id);
    setEditingLabel(item.label);
    setEditingActive(Boolean(item.active));
  };

  const cancelEdit = () => {
    setEditingId("");
    setEditingLabel("");
    setEditingActive(true);
  };

  const saveEdit = async () => {
    if (!editingId || !editingLabel.trim()) return;

    try {
      setSaving(true);

      const current = items.find((item) => item.id === editingId);

      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "update",
          id: editingId,
          label: editingLabel.trim(),
          active: editingActive,
          sortOrder: current?.sortOrder || 0,
        }),
      });

      if (!res.ok) {
        throw new Error("UPDATE fail");
      }

      const data = await res.json();

      if (!data?.success) {
        alert(data?.message || "แก้ไขไม่สำเร็จ");
        return;
      }

      cancelEdit();
      await load();
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการแก้ไข");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (item: ReviewTitleItem) => {
    const ok = window.confirm(`ลบหัวข้อนี้?\n\n${item.label}`);
    if (!ok) return;

    try {
      setSaving(true);

      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "delete",
          id: item.id,
        }),
      });

      if (!res.ok) {
        throw new Error("DELETE fail");
      }

      const data = await res.json();

      if (!data?.success) {
        alert(data?.message || "ลบไม่สำเร็จ");
        return;
      }

      if (editingId === item.id) cancelEdit();

      await load();
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบ");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: ReviewTitleItem) => {
    try {
      setSaving(true);

      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "update",
          id: item.id,
          label: item.label,
          active: !item.active,
          sortOrder: item.sortOrder || 0,
        }),
      });

      if (!res.ok) {
        throw new Error("TOGGLE fail");
      }

      await load();
    } catch (error) {
      console.error(error);
      alert("อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>กำลังโหลด...</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>จัดการหัวข้อรีวิว</h1>

      <Link href="/admin">← กลับ Dashboard</Link>

      <div style={{ marginTop: 20 }}>
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="เพิ่มหัวข้อรีวิว"
          style={{ width: "100%", padding: 10 }}
        />
        <button onClick={createItem} disabled={saving}>
          + เพิ่ม
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="ค้นหา"
          style={{ width: "100%", padding: 10 }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        {filteredItems.map((item) => (
          <div key={item.id} style={{ border: "1px solid #ddd", padding: 10 }}>
            {editingId === item.id ? (
              <>
                <input
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                />
                <button onClick={saveEdit}>บันทึก</button>
                <button onClick={cancelEdit}>ยกเลิก</button>
              </>
            ) : (
              <>
                <b>{item.label}</b>
                <div>
                  <button onClick={() => startEdit(item)}>แก้ไข</button>
                  <button onClick={() => deleteItem(item)}>ลบ</button>
                  <button onClick={() => toggleActive(item)}>
                    {item.active ? "ปิด" : "เปิด"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}