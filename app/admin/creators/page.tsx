"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/app/components/ToastProvider";

export default function AdminCreatorsPage() {
  const { showToast } = useToast();

  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    // no-store + credentials → admin route ต้องสดทุกครั้ง
    const res = await fetch("/api/admin/creators", {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json();
    setUsers(data.users || []);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (userId: string, action: string) => {
    await fetch("/api/admin/creators", {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    // โหลดสด ทันทีหลังอนุมัติ/ปฏิเสธ ไม่ต้อง clear cache
    load();
  };

  const save = async (u: any) => {
    await fetch("/api/admin/creators", {
      method: "PATCH",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: u.id,
        action: "update",
        payload: {
          creatorDisplayName: u.creatorDisplayName,
          ...u.creatorPayment,
        },
      }),
    });
    showToast("success", "บันทึกแล้ว");
    load();
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>จัดการครีเอเตอร์</h1>

      {users.map((u, i) => (
        <div key={u.id} style={{
          border: "1px solid #ddd",
          padding: 20,
          marginBottom: 15,
          borderRadius: 10
        }}>
          <div><b>{u.email}</b></div>
          <div>Status: {u.creatorStatus || "-"}</div>

          <hr />

          <input
            placeholder="ชื่อแสดง"
            value={u.creatorDisplayName || ""}
            onChange={(e) => {
              const newUsers = [...users];
              newUsers[i].creatorDisplayName = e.target.value;
              setUsers(newUsers);
            }}
          />

          <input
            placeholder="PromptPay"
            value={u.creatorPayment?.promptPay || ""}
            onChange={(e) => {
              const newUsers = [...users];
              newUsers[i].creatorPayment.promptPay = e.target.value;
              setUsers(newUsers);
            }}
          />

          <input
            placeholder="ธนาคาร"
            value={u.creatorPayment?.bankName || ""}
            onChange={(e) => {
              const newUsers = [...users];
              newUsers[i].creatorPayment.bankName = e.target.value;
              setUsers(newUsers);
            }}
          />

          <input
            placeholder="ชื่อบัญชี"
            value={u.creatorPayment?.accountName || ""}
            onChange={(e) => {
              const newUsers = [...users];
              newUsers[i].creatorPayment.accountName = e.target.value;
              setUsers(newUsers);
            }}
          />

          <input
            placeholder="เลขบัญชี"
            value={u.creatorPayment?.accountNumber || ""}
            onChange={(e) => {
              const newUsers = [...users];
              newUsers[i].creatorPayment.accountNumber = e.target.value;
              setUsers(newUsers);
            }}
          />

          <br /><br />

          <button onClick={() => save(u)}>💾 บันทึก</button>
          <button onClick={() => updateStatus(u.id, "approve")}>✅ อนุมัติ</button>
          <button onClick={() => updateStatus(u.id, "reject")}>❌ ปฏิเสธ</button>
          <button onClick={() => updateStatus(u.id, "disable")}>⛔ ปิด</button>

        </div>
      ))}
    </div>
  );
}
