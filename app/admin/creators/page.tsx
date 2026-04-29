"use client";

import { useEffect, useState } from "react";

export default function AdminCreatorsPage() {
  const [users, setUsers] = useState<any[]>([]);

  const load = async () => {
    const res = await fetch("/api/admin/creators");
    const data = await res.json();
    setUsers(data.users || []);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (userId: string) => {
    await fetch("/api/admin/creators", {
      method: "PATCH",
      body: JSON.stringify({ userId, action: "approve" })
    });
    load();
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>อนุมัติครีเอเตอร์</h1>

      {users.map((u) => (
        <div key={u.id} style={{ border: "1px solid #ddd", padding: 12, marginBottom: 10 }}>
          <div>{u.email}</div>
          <div>Status: {u.creatorStatus}</div>

          {u.creatorStatus === "pending" && (
            <button onClick={() => approve(u.id)}>
              อนุมัติ
            </button>
          )}
        </div>
      ))}
    </div>
  );
}