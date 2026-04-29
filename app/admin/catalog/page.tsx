"use client";

import { useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type EditState = {
  level: "main" | "sub" | "leaf";
  mainId: string;
  subId?: string;
  leafId?: string;
};

export default function AdminCatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newMain, setNewMain] = useState("");
  const [selectedMain, setSelectedMain] = useState("");
  const [newSub, setNewSub] = useState("");
  const [selectedSub, setSelectedSub] = useState("");
  const [newLeaf, setNewLeaf] = useState("");

  const [editing, setEditing] = useState<EditState | null>(null);
  const [editingName, setEditingName] = useState("");

  const selectedMainNode = useMemo(
    () => categories.find((item) => item.id === selectedMain),
    [categories, selectedMain]
  );

  const selectedSubNode = useMemo(
    () => selectedMainNode?.children?.find((item) => item.id === selectedSub),
    [selectedMainNode, selectedSub]
  );

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      setCategories(Array.isArray(data?.categories) ? data.categories : []);
    } catch (error) {
      console.error(error);
      alert("โหลด catalog ไม่สำเร็จ");
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (next: Category[]) => {
    try {
      setSaving(true);

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categories: next }),
      });

      const data = await res.json();

      if (!data?.success) {
        alert("บันทึก catalog ไม่สำเร็จ");
        return false;
      }

      setCategories(next);
      return true;
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึก catalog");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const addMain = async () => {
    if (!newMain.trim()) return;

    const next: Category[] = [
      ...categories,
      {
        id: Date.now().toString(),
        name: newMain.trim(),
        children: [],
      },
    ];

    const ok = await save(next);
    if (ok) setNewMain("");
  };

  const addSub = async () => {
    if (!selectedMain || !newSub.trim()) return;

    const next = categories.map((main) =>
      main.id === selectedMain
        ? {
            ...main,
            children: [
              ...(main.children || []),
              {
                id: Date.now().toString(),
                name: newSub.trim(),
                children: [],
              },
            ],
          }
        : main
    );

    const ok = await save(next);
    if (ok) setNewSub("");
  };

  const addLeaf = async () => {
    if (!selectedMain || !selectedSub || !newLeaf.trim()) return;

    const next = categories.map((main) =>
      main.id === selectedMain
        ? {
            ...main,
            children: (main.children || []).map((sub) =>
              sub.id === selectedSub
                ? {
                    ...sub,
                    children: [
                      ...(sub.children || []),
                      {
                        id: Date.now().toString(),
                        name: newLeaf.trim(),
                      },
                    ],
                  }
                : sub
            ),
          }
        : main
    );

    const ok = await save(next);
    if (ok) setNewLeaf("");
  };

  const startEditMain = (mainId: string, currentName: string) => {
    setEditing({ level: "main", mainId });
    setEditingName(currentName);
  };

  const startEditSub = (mainId: string, subId: string, currentName: string) => {
    setEditing({ level: "sub", mainId, subId });
    setEditingName(currentName);
  };

  const startEditLeaf = (
    mainId: string,
    subId: string,
    leafId: string,
    currentName: string
  ) => {
    setEditing({ level: "leaf", mainId, subId, leafId });
    setEditingName(currentName);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingName("");
  };

  const saveEdit = async () => {
    if (!editing || !editingName.trim()) return;

    const nextName = editingName.trim();

    const next = categories.map((main) => {
      if (main.id !== editing.mainId) return main;

      if (editing.level === "main") {
        return { ...main, name: nextName };
      }

      return {
        ...main,
        children: (main.children || []).map((sub) => {
          if (sub.id !== editing.subId) return sub;

          if (editing.level === "sub") {
            return { ...sub, name: nextName };
          }

          return {
            ...sub,
            children: (sub.children || []).map((leaf) =>
              leaf.id === editing.leafId ? { ...leaf, name: nextName } : leaf
            ),
          };
        }),
      };
    });

    const ok = await save(next);
    if (ok) cancelEdit();
  };

  const deleteMain = async (mainId: string) => {
    const confirmed = window.confirm("ต้องการลบหมวดหลักนี้ใช่หรือไม่");
    if (!confirmed) return;

    const next = categories.filter((main) => main.id !== mainId);
    const ok = await save(next);

    if (ok) {
      if (selectedMain === mainId) {
        setSelectedMain("");
        setSelectedSub("");
      }
      if (editing?.mainId === mainId) {
        cancelEdit();
      }
    }
  };

  const deleteSub = async (mainId: string, subId: string) => {
    const confirmed = window.confirm("ต้องการลบหมวดย่อยนี้ใช่หรือไม่");
    if (!confirmed) return;

    const next = categories.map((main) =>
      main.id === mainId
        ? {
            ...main,
            children: (main.children || []).filter((sub) => sub.id !== subId),
          }
        : main
    );

    const ok = await save(next);

    if (ok) {
      if (selectedSub === subId) {
        setSelectedSub("");
      }
      if (
        editing?.mainId === mainId &&
        editing?.subId === subId &&
        (editing.level === "sub" || editing.level === "leaf")
      ) {
        cancelEdit();
      }
    }
  };

  const deleteLeaf = async (mainId: string, subId: string, leafId: string) => {
    const confirmed = window.confirm("ต้องการลบหมวดย่อยชั้น 3 นี้ใช่หรือไม่");
    if (!confirmed) return;

    const next = categories.map((main) =>
      main.id === mainId
        ? {
            ...main,
            children: (main.children || []).map((sub) =>
              sub.id === subId
                ? {
                    ...sub,
                    children: (sub.children || []).filter(
                      (leaf) => leaf.id !== leafId
                    ),
                  }
                : sub
            ),
          }
        : main
    );

    const ok = await save(next);

    if (ok) {
      if (
        editing?.mainId === mainId &&
        editing?.subId === subId &&
        editing?.leafId === leafId
      ) {
        cancelEdit();
      }
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
        กำลังโหลด catalog...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <h1 style={{ fontSize: 42, fontWeight: 800, margin: 0 }}>
          จัดการ Catalog สินค้า
        </h1>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/admin" style={navBtn}>
            กลับ Dashboard
          </a>
          <a href="/admin/products" style={navBtn}>
            ไปหน้าจัดการสินค้า
          </a>
        </div>
      </div>

      <div style={{ marginTop: 12, color: "#6b7280", fontSize: 15 }}>
        {saving ? "กำลังบันทึก..." : "เพิ่ม / แก้ไข / ลบ หมวดหลัก หมวดย่อย และหมวดย่อยชั้น 3 ได้จากหน้านี้"}
      </div>

      <section style={box}>
        <h2 style={sectionTitle}>เพิ่มหมวดหลัก</h2>
        <input
          value={newMain}
          onChange={(e) => setNewMain(e.target.value)}
          placeholder="เช่น สัตว์เลี้ยง"
          style={input}
        />
        <button onClick={addMain} style={btn} disabled={saving}>
          + เพิ่มหมวดหลัก
        </button>
      </section>

      <section style={box}>
        <h2 style={sectionTitle}>เพิ่มหมวดย่อย</h2>

        <select
          value={selectedMain}
          onChange={(e) => {
            setSelectedMain(e.target.value);
            setSelectedSub("");
          }}
          style={input}
        >
          <option value="">เลือกหมวดหลัก</option>
          {categories.map((main) => (
            <option key={main.id} value={main.id}>
              {main.name}
            </option>
          ))}
        </select>

        <input
          value={newSub}
          onChange={(e) => setNewSub(e.target.value)}
          placeholder="เช่น แมว"
          style={input}
        />

        <button onClick={addSub} style={btn} disabled={saving}>
          + เพิ่มหมวดย่อย
        </button>
      </section>

      <section style={box}>
        <h2 style={sectionTitle}>เพิ่มหมวดย่อยชั้น 3</h2>

        <select
          value={selectedMain}
          onChange={(e) => {
            setSelectedMain(e.target.value);
            setSelectedSub("");
          }}
          style={input}
        >
          <option value="">เลือกหมวดหลัก</option>
          {categories.map((main) => (
            <option key={main.id} value={main.id}>
              {main.name}
            </option>
          ))}
        </select>

        <select
          value={selectedSub}
          onChange={(e) => setSelectedSub(e.target.value)}
          style={input}
        >
          <option value="">เลือกหมวดย่อย</option>
          {(selectedMainNode?.children || []).map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>

        <input
          value={newLeaf}
          onChange={(e) => setNewLeaf(e.target.value)}
          placeholder="เช่น FIP"
          style={input}
        />

        <button onClick={addLeaf} style={btn} disabled={saving}>
          + เพิ่มหมวดย่อยชั้น 3
        </button>
      </section>

      <section style={box}>
        <h2 style={sectionTitle}>โครงสร้าง Catalog</h2>

        {categories.length === 0 ? (
          <div style={{ color: "#6b7280" }}>ยังไม่มีหมวดสินค้า</div>
        ) : (
          categories.map((main) => (
            <div key={main.id} style={treeBlock}>
              <div style={rowStyle}>
                {editing?.level === "main" && editing.mainId === main.id ? (
                  <>
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      style={editInput}
                    />
                    <button onClick={saveEdit} style={saveBtn} disabled={saving}>
                      บันทึก
                    </button>
                    <button onClick={cancelEdit} style={cancelBtn} disabled={saving}>
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <strong style={{ fontSize: 22 }}>📁 {main.name}</strong>
                    <div style={actionWrap}>
                      <button
                        onClick={() => startEditMain(main.id, main.name)}
                        style={editBtn}
                        disabled={saving}
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => deleteMain(main.id)}
                        style={deleteBtn}
                        disabled={saving}
                      >
                        ลบ
                      </button>
                    </div>
                  </>
                )}
              </div>

              {(main.children || []).length === 0 ? (
                <div style={{ marginLeft: 24, marginTop: 10, color: "#6b7280" }}>
                  ยังไม่มีหมวดย่อย
                </div>
              ) : null}

              {(main.children || []).map((sub) => (
                <div key={sub.id} style={{ marginLeft: 24, marginTop: 10 }}>
                  <div style={rowStyle}>
                    {editing?.level === "sub" &&
                    editing.mainId === main.id &&
                    editing.subId === sub.id ? (
                      <>
                        <input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          style={editInput}
                        />
                        <button onClick={saveEdit} style={saveBtn} disabled={saving}>
                          บันทึก
                        </button>
                        <button onClick={cancelEdit} style={cancelBtn} disabled={saving}>
                          ยกเลิก
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 20 }}>└ {sub.name}</span>
                        <div style={actionWrap}>
                          <button
                            onClick={() => startEditSub(main.id, sub.id, sub.name)}
                            style={editBtn}
                            disabled={saving}
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => deleteSub(main.id, sub.id)}
                            style={deleteBtn}
                            disabled={saving}
                          >
                            ลบ
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {(sub.children || []).length === 0 ? (
                    <div style={{ marginLeft: 24, marginTop: 10, color: "#6b7280" }}>
                      ยังไม่มีหมวดย่อยชั้น 3
                    </div>
                  ) : null}

                  {(sub.children || []).map((leaf) => (
                    <div
                      key={leaf.id}
                      style={{ marginLeft: 24, marginTop: 10, marginBottom: 6 }}
                    >
                      <div style={rowStyle}>
                        {editing?.level === "leaf" &&
                        editing.mainId === main.id &&
                        editing.subId === sub.id &&
                        editing.leafId === leaf.id ? (
                          <>
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              style={editInput}
                            />
                            <button onClick={saveEdit} style={saveBtn} disabled={saving}>
                              บันทึก
                            </button>
                            <button onClick={cancelEdit} style={cancelBtn} disabled={saving}>
                              ยกเลิก
                            </button>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 18 }}>└ {leaf.name}</span>
                            <div style={actionWrap}>
                              <button
                                onClick={() =>
                                  startEditLeaf(main.id, sub.id, leaf.id, leaf.name)
                                }
                                style={editBtn}
                                disabled={saving}
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => deleteLeaf(main.id, sub.id, leaf.id)}
                                style={deleteBtn}
                                disabled={saving}
                              >
                                ลบ
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))
        )}
      </section>

      <section style={box}>
        <h2 style={sectionTitle}>ตัวอย่างค่าที่จะถูกเลือกไปใช้ในหน้าสินค้า</h2>
        <div style={previewBox}>
          <div>หมวดหลัก: {selectedMainNode?.name || "-"}</div>
          <div>หมวดย่อย: {selectedSubNode?.name || "-"}</div>
        </div>
      </section>
    </div>
  );
}

const box: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 20,
  marginTop: 20,
  background: "#fff",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  marginTop: 0,
  marginBottom: 12,
};

const input: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  marginTop: 10,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
  background: "#fff",
};

const btn: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 16px",
  borderRadius: 10,
  background: "#111827",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};

const treeBlock: React.CSSProperties = {
  border: "1px solid #f1f5f9",
  borderRadius: 14,
  padding: 16,
  marginTop: 12,
  background: "#fafafa",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const actionWrap: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const editInput: React.CSSProperties = {
  flex: 1,
  minWidth: 240,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  fontSize: 16,
};

const editBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "#2563eb",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};

const deleteBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "#dc2626",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};

const saveBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "#059669",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};

const cancelBtn: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  background: "#6b7280",
  color: "#fff",
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
};

const navBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  background: "#fff",
  color: "#333",
  textDecoration: "none",
  fontWeight: 700,
  border: "1px solid #ddd",
};

const previewBox: React.CSSProperties = {
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: 14,
  color: "#374151",
  lineHeight: 1.8,
};