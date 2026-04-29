"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type UserItem = {
  id: string;
  email?: string;
  name?: string;
  fullName?: string;
  username?: string;
  role?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string>("");
  const [keyword, setKeyword] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error(error);
      alert("โหลดรายชื่อผู้ใช้งานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleDeleteUser(user: UserItem) {
    const displayName =
      user.fullName || user.name || user.username || user.email || user.id;

    const ok = confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${displayName}"?\n\nระบบจะลบ:\n- user รายนี้\n- review ที่เกี่ยวข้องกับ user รายนี้`
    );
    if (!ok) return;

    try {
      setDeletingId(user.id);

      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "ลบไม่สำเร็จ");
      }

      alert(
        `ลบผู้ใช้งานสำเร็จ\nลบ user 1 ราย\nลบ review ${data.deletedReviews ?? 0} รายการ`
      );

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "เกิดข้อผิดพลาด");
    } finally {
      setDeletingId("");
    }
  }

  const filteredUsers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const text = [
        u.id,
        u.email,
        u.name,
        u.fullName,
        u.username,
        u.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return text.includes(q);
    });
  }, [users, keyword]);

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 42, fontWeight: 800, margin: 0 }}>
            จัดการผู้ใช้งาน
          </h1>
          <p style={{ marginTop: 8, color: "#6b7280", fontSize: 18 }}>
            ลบ user ทีละคน และลบ review ของ user รายนี้ไปพร้อมกัน
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin" style={ghostButton}>
            กลับ Dashboard
          </Link>
          <Link href="/" style={ghostButton}>
            กลับหน้าร้าน
          </Link>
        </div>
      </div>

      <div style={panelStyle}>
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="ค้นหา id / email / name / role"
          style={searchInput}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        {loading ? (
          <div style={emptyStyle}>กำลังโหลดข้อมูล...</div>
        ) : filteredUsers.length === 0 ? (
          <div style={emptyStyle}>ไม่พบผู้ใช้งาน</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {filteredUsers.map((user) => {
              const displayName =
                user.fullName ||
                user.name ||
                user.username ||
                "(ไม่มีชื่อแสดง)";
              const email = user.email || "-";
              const role = user.role || "customer";
              const isDeleting = deletingId === user.id;

              return (
                <div key={user.id} style={userCard}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={userName}>{displayName}</div>
                    <div style={metaText}>ID: {user.id}</div>
                    <div style={metaText}>Email: {email}</div>
                    <div style={metaText}>Role: {role}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    disabled={isDeleting}
                    style={{
                      ...deleteButton,
                      opacity: isDeleting ? 0.7 : 1,
                      cursor: isDeleting ? "not-allowed" : "pointer",
                    }}
                  >
                    {isDeleting ? "กำลังลบ..." : "ลบผู้ใช้งาน"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
};

const searchInput: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 16,
  outline: "none",
};

const userCard: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 18,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
};

const userName: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 800,
  color: "#111827",
  marginBottom: 6,
};

const metaText: React.CSSProperties = {
  fontSize: 15,
  color: "#4b5563",
  lineHeight: 1.7,
};

const deleteButton: React.CSSProperties = {
  border: "none",
  borderRadius: 14,
  padding: "12px 18px",
  background: "#dc2626",
  color: "#fff",
  fontSize: 16,
  fontWeight: 800,
};

const emptyStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px dashed #d1d5db",
  borderRadius: 18,
  padding: 30,
  textAlign: "center",
  color: "#6b7280",
  fontSize: 18,
};

const ghostButton: React.CSSProperties = {
  textDecoration: "none",
  border: "1px solid #d1d5db",
  borderRadius: 14,
  padding: "12px 16px",
  color: "#111827",
  fontWeight: 700,
  fontSize: 16,
  background: "#fff",
};