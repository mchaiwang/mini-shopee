"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type CartItem = {
  id?: string | number;
  name?: string;
  title?: string;
  price?: number;
  qty?: number;
  quantity?: number;
  image?: string;
};

type ProfileResponse = {
  user?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      recipientName?: string;
      phone?: string;
      line1?: string;
      subdistrict?: string;
      district?: string;
      province?: string;
      postalCode?: string;
      note?: string;
    };
  };
};

type PaymentMethod = "bank_transfer" | "cod";

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return "";
  return decodeURIComponent(found.substring(name.length + 1));
}

function getCurrentUserIdFromCookie() {
  try {
    const rawAuth = getCookieValue("auth");
    if (!rawAuth) return "";
    const auth = JSON.parse(rawAuth);
    return String(auth?.id || "").trim();
  } catch {
    return "";
  }
}

function getCartStorageKey() {
  const userId = getCurrentUserIdFromCookie();
  return userId ? `cart_${userId}` : "cart_guest";
}

function normalizeCartItems(items: unknown): CartItem[] {
  if (!Array.isArray(items)) return [];

  const normalized = items
    .map((item) => {
      const row = item as CartItem;
      return {
        ...row,
        id: row.id,
        name: row.name,
        title: row.title,
        image: row.image,
        price: Number(row.price || 0),
        qty: Number(row.qty || row.quantity || 1),
      };
    })
    .filter((item) => (item.name || item.title) && Number(item.qty || 0) > 0);

  // รวมรายการซ้ำ id เดียวกันกันตะกร้าซ้อน
  const map = new Map<string, CartItem>();

  for (const item of normalized) {
    const key = String(item.id ?? item.name ?? item.title ?? Math.random());
    const existing = map.get(key);

    if (existing) {
      existing.qty = Number(existing.qty || 0) + Number(item.qty || 0);
      map.set(key, existing);
    } else {
      map.set(key, { ...item });
    }
  }

  return Array.from(map.values());
}

export default function CheckoutPage() {
  const router = useRouter();
  const isMobile = useIsMobile(640);

  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    note: "",
  });

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [slip, setSlip] = useState<string>("");
  const [slipName, setSlipName] = useState<string>("");

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const price = Number(item.price || 0);
      const qty = Number(item.qty || item.quantity || 1);
      return sum + price * qty;
    }, 0);
  }, [cart]);

  function setField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadCart() {
    try {
      const key = getCartStorageKey();
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = normalizeCartItems(parsed);
      setCart(normalized);
    } catch (error) {
      console.error("loadCart error:", error);
      setCart([]);
    }
  }

  async function loadProfileToForm() {
    try {
      const res = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: ProfileResponse = await res.json();

      if (!res.ok || !data.user) {
        setLoggedIn(false);
        setLoginEmail("");
        return;
      }

      setLoggedIn(true);

      const u = data.user;
      const fullAddress = [
        u.address?.line1,
        u.address?.subdistrict,
        u.address?.district,
        u.address?.province,
        u.address?.postalCode,
      ]
        .filter(Boolean)
        .join(" ");

      setLoginName(u.name || "ผู้ใช้");
      setLoginEmail(u.email || "");

      setForm((prev) => ({
        ...prev,
        name: prev.name || u.address?.recipientName || u.name || "",
        phone: prev.phone || u.address?.phone || u.phone || "",
        address: prev.address || fullAddress,
        note: prev.note || u.address?.note || "",
      }));
    } catch (err) {
      console.error("loadProfileToForm error:", err);
      setLoggedIn(false);
      setLoginEmail("");
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      await loadCart();
      await loadProfileToForm();
      if (mounted) setLoading(false);
    }

    init();

    const refreshCart = () => loadCart();
    const refreshProfile = () => {
      loadProfileToForm();
      loadCart();
    };

    window.addEventListener("storage", refreshCart);
    window.addEventListener("cart-updated", refreshCart as EventListener);
    window.addEventListener("auth-changed", refreshProfile);

    return () => {
      mounted = false;
      window.removeEventListener("storage", refreshCart);
      window.removeEventListener("cart-updated", refreshCart as EventListener);
      window.removeEventListener("auth-changed", refreshProfile);
    };
  }, []);

  function handleSlipChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSlipName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setSlip(result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function placeOrder() {
    if (!form.name.trim()) {
      alert("กรุณากรอกชื่อผู้รับ");
      return;
    }

    if (!form.phone.trim()) {
      alert("กรุณากรอกเบอร์โทร");
      return;
    }

    if (!form.address.trim()) {
      alert("กรุณากรอกที่อยู่จัดส่ง");
      return;
    }

    if (!cart.length) {
      alert("ไม่มีสินค้าในตะกร้า");
      return;
    }

    if (paymentMethod === "bank_transfer" && !slip) {
      alert("กรุณาแนบหลักฐานการโอนเงิน");
      return;
    }

    try {
      setPlacing(true);

      let refReview = "";
      try {
        refReview = localStorage.getItem("refReview") || "";
      } catch {}

      const payload = {
        items: cart,
        total: subtotal,
        paymentMethod,
        slip,
        slipName,
        status:
          paymentMethod === "cod"
            ? "รอยืนยันคำสั่งซื้อ"
            : "รอตรวจสอบสลิป",
        email: loginEmail,
        shippingAddress: {
          fullName: form.name.trim(),
          phone: form.phone.trim(),
          email: loginEmail,
          address: form.address.trim(),
          note: form.note.trim(),
        },
        fullName: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        refReview,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        alert(data?.message || data?.error || "สั่งซื้อไม่สำเร็จ");
        return;
      }

      const createdOrderId = data?.order?.id || "";
      if (createdOrderId) {
        sessionStorage.setItem("latestOrderId", createdOrderId);
      }

      try {
        localStorage.removeItem("refReview");
      } catch {}

      try {
        const key = getCartStorageKey();
        localStorage.removeItem(key);
      } catch {}

      setCart([]);
      window.dispatchEvent(new Event("cart-updated"));

      alert("สั่งซื้อสำเร็จ");
      router.push("/orders?justOrdered=1");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดระหว่างสั่งซื้อ");
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "24px auto",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            borderRadius: 24,
            background: "#fff",
            border: "1px solid #eef2f6",
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
            padding: 28,
            color: "#64748b",
            fontWeight: 700,
          }}
        >
          กำลังโหลด...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: isMobile ? "12px auto" : "24px auto",
        padding: isMobile ? "0 10px 32px" : "0 16px 40px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #ee4d2d 0%, #ff7337 55%, #ff9b76 100%)",
          borderRadius: isMobile ? 18 : 26,
          padding: isMobile ? "16px 16px" : "24px 24px",
          color: "#fff",
          boxShadow: "0 12px 28px rgba(238,77,45,0.22)",
          marginBottom: isMobile ? 14 : 22,
        }}
      >
        <h1
          style={{
            fontSize: isMobile ? 22 : 34,
            fontWeight: 900,
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          ยืนยันคำสั่งซื้อ
        </h1>
        <div
          style={{
            marginTop: isMobile ? 6 : 8,
            fontSize: isMobile ? 13 : 16,
            opacity: 0.96,
            lineHeight: 1.4,
          }}
        >
          ตรวจสอบที่อยู่จัดส่ง วิธีชำระเงิน และสรุปรายการก่อนกดยืนยัน
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.45fr 0.95fr",
          gap: isMobile ? 14 : 22,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: isMobile ? 14 : 18 }}>
          <div
            style={{
              border: "1px solid #eef2f6",
              borderRadius: isMobile ? 18 : 24,
              padding: isMobile ? 16 : 22,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 900,
                marginBottom: isMobile ? 12 : 16,
                color: "#0f172a",
              }}
            >
              ข้อมูลจัดส่ง
            </div>

            {loggedIn && (
              <div
                style={{
                  marginBottom: 16,
                  padding: "13px 15px",
                  borderRadius: 14,
                  border: "1px solid #a7f3d0",
                  background: "#ecfdf5",
                  color: "#047857",
                  fontWeight: 800,
                }}
              >
                ล็อกอินแล้ว: {loginName}
              </div>
            )}

            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="ชื่อผู้รับ"
              style={inputStyle}
            />

            <input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="เบอร์โทร"
              style={inputStyle}
            />

            <textarea
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="ที่อยู่จัดส่ง"
              rows={4}
              style={{
                ...inputStyle,
                height: "auto",
                minHeight: 118,
                resize: "vertical",
                paddingTop: 14,
                paddingBottom: 14,
              }}
            />

            <textarea
              value={form.note}
              onChange={(e) => setField("note", e.target.value)}
              placeholder="หมายเหตุ"
              rows={3}
              style={{
                ...inputStyle,
                height: "auto",
                minHeight: 90,
                resize: "vertical",
                paddingTop: 14,
                paddingBottom: 14,
                marginBottom: 0,
              }}
            />
          </div>

          <div
            style={{
              border: "1px solid #eef2f6",
              borderRadius: isMobile ? 18 : 24,
              padding: isMobile ? 16 : 22,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                fontSize: isMobile ? 18 : 24,
                fontWeight: 900,
                marginBottom: isMobile ? 12 : 16,
                color: "#0f172a",
              }}
            >
              วิธีชำระเงิน
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 16,
                  border:
                    paymentMethod === "bank_transfer"
                      ? "2px solid #ee4d2d"
                      : "1px solid #e5e7eb",
                  borderRadius: 16,
                  cursor: "pointer",
                  background:
                    paymentMethod === "bank_transfer" ? "#fff7f5" : "#fff",
                  transition: "all 0.18s ease",
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => setPaymentMethod("bank_transfer")}
                  style={{ marginTop: 4, accentColor: "#ee4d2d" }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 17,
                      color: "#0f172a",
                    }}
                  >
                    สแกนจ่าย / โอนเงิน
                  </div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    แนบสลิปเพื่อให้ร้านตรวจสอบการชำระเงิน
                  </div>
                </div>
              </label>

              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 16,
                  border:
                    paymentMethod === "cod"
                      ? "2px solid #ee4d2d"
                      : "1px solid #e5e7eb",
                  borderRadius: 16,
                  cursor: "pointer",
                  background: paymentMethod === "cod" ? "#fff7f5" : "#fff",
                  transition: "all 0.18s ease",
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === "cod"}
                  onChange={() => setPaymentMethod("cod")}
                  style={{ marginTop: 4, accentColor: "#ee4d2d" }}
                />
                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 17,
                      color: "#0f172a",
                    }}
                  >
                    เก็บเงินปลายทาง
                  </div>
                  <div style={{ color: "#64748b", marginTop: 4 }}>
                    ชำระเงินเมื่อได้รับสินค้า
                  </div>
                </div>
              </label>
            </div>

            {paymentMethod === "bank_transfer" && (
              <div
                style={{
                  marginTop: 18,
                  padding: 18,
                  borderRadius: 18,
                  background: "#fffaf8",
                  border: "1px solid #ffe0d7",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    marginBottom: 10,
                    color: "#0f172a",
                    fontSize: 18,
                  }}
                >
                  บัญชีสำหรับโอนเงิน
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 6,
                    marginBottom: 16,
                    lineHeight: 1.75,
                    color: "#334155",
                  }}
                >
                  <div>ธนาคาร: กสิกรไทย</div>
                  <div>ชื่อบัญชี: Herbal Store</div>
                  <div>เลขที่บัญชี: 123-4-56789-0</div>
                </div>

                <div
                  style={{
                    width: 220,
                    height: 220,
                    border: "1px dashed #ffb9a5",
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background: "#fff",
                    marginBottom: 14,
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
                  }}
                >
                  <img
                    src="/qr-payment.jpg"
                    alt="QR Payment"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.style.display = "none";
                      const parent = img.parentElement;
                      if (parent && !parent.querySelector(".qr-fallback")) {
                        const div = document.createElement("div");
                        div.className = "qr-fallback";
                        div.style.padding = "16px";
                        div.style.textAlign = "center";
                        div.style.color = "#6b7280";
                        div.innerText =
                          "ใส่รูป QR ของร้านไว้ที่ /public/qr-payment.jpg";
                        parent.appendChild(div);
                      }
                    }}
                  />
                </div>

                <div
                  style={{
                    fontWeight: 800,
                    marginBottom: 8,
                    color: "#0f172a",
                  }}
                >
                  อัปโหลดสลิปการโอน
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSlipChange}
                  style={{
                    marginBottom: 12,
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid #ffd0c5",
                    background: "#fff",
                  }}
                />

                {slipName ? (
                  <div
                    style={{
                      color: "#475467",
                      marginBottom: 12,
                      fontWeight: 700,
                    }}
                  >
                    ไฟล์ที่เลือก: {slipName}
                  </div>
                ) : null}

                {slip ? (
                  <div
                    style={{
                      border: "1px solid #eef2f6",
                      borderRadius: 14,
                      padding: 10,
                      background: "#fff",
                      maxWidth: 320,
                      boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
                    }}
                  >
                    <img
                      src={slip}
                      alt="slip preview"
                      style={{
                        width: "100%",
                        height: "auto",
                        borderRadius: 10,
                        display: "block",
                      }}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #eef2f6",
            borderRadius: isMobile ? 18 : 24,
            padding: isMobile ? 16 : 22,
            background: "#fff",
            position: isMobile ? "static" : "sticky",
            top: isMobile ? "auto" : 24,
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              fontSize: isMobile ? 18 : 24,
              fontWeight: 900,
              marginBottom: isMobile ? 10 : 14,
              color: "#0f172a",
            }}
          >
            สรุปคำสั่งซื้อ
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 14 }}>
            {cart.length ? (
              cart.map((item, idx) => {
                const qty = Number(item.qty || item.quantity || 1);
                const name = item.name || item.title || `สินค้า #${idx + 1}`;
                const price = Number(item.price || 0);

                return (
                  <div
                    key={`${item.id || name}-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      border: "1px solid #f1f5f9",
                      borderRadius: 16,
                      padding: "14px 14px",
                      background: "#fffaf8",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#0f172a",
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          marginTop: 4,
                          fontSize: 14,
                        }}
                      >
                        x {qty}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 900,
                        color: "#111827",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ฿{(price * qty).toFixed(2)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ color: "#6b7280" }}>ยังไม่มีสินค้าในตะกร้า</div>
            )}
          </div>

          <div
            style={{
              borderTop: "1px dashed #e2e8f0",
              margin: isMobile ? "10px 0 12px" : "14px 0 16px",
              paddingTop: isMobile ? 10 : 14,
              fontSize: isMobile ? 20 : 26,
              fontWeight: 900,
              color: "#ee4d2d",
            }}
          >
            รวม: ฿{subtotal.toFixed(2)}
          </div>

          <div
            style={{
              marginBottom: isMobile ? 12 : 16,
              padding: isMobile ? "10px 12px" : "12px 14px",
              borderRadius: isMobile ? 12 : 14,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#ea580c",
              fontWeight: 800,
              fontSize: isMobile ? 13 : 15,
            }}
          >
            วิธีชำระเงิน:{" "}
            {paymentMethod === "bank_transfer"
              ? "สแกนจ่าย / โอนเงิน"
              : "เก็บเงินปลายทาง"}
          </div>

          <button
            onClick={placeOrder}
            disabled={placing || !cart.length}
            style={{
              width: "100%",
              height: isMobile ? 50 : 56,
              borderRadius: isMobile ? 14 : 16,
              border: "none",
              background:
                placing || !cart.length
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
              color: "#fff",
              fontSize: isMobile ? 16 : 20,
              fontWeight: 900,
              cursor: placing || !cart.length ? "not-allowed" : "pointer",
              boxShadow:
                placing || !cart.length
                  ? "none"
                  : "0 12px 24px rgba(238,77,45,0.20)",
            }}
          >
            {placing ? "กำลังบันทึก..." : "ยืนยันคำสั่งซื้อ"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 52,
  padding: "0 16px",
  borderRadius: 14,
  border: "1px solid #e4e7ec",
  outline: "none",
  fontSize: 16,
  marginBottom: 12,
  background: "#fff",
  color: "#111827",
  boxShadow: "0 1px 2px rgba(15,23,42,0.02)",
};