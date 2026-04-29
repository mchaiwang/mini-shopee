"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type ProfileForm = {
  name: string;
  phone: string;
  address: {
    recipientName: string;
    phone: string;
    line1: string;
    subdistrict: string;
    district: string;
    province: string;
    postalCode: string;
    note: string;
  };
};

type CurrentUser = {
  id?: string;
  email?: string;
  role?: string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
  creatorDisplayName?: string;
  creatorPayment?: {
    promptPay?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
};

type Order = {
  id: string;
  userId?: string;
  ownerId?: string;
  email?: string;
  status?: string;
  items?: Array<{
    id?: string | number;
    name?: string;
    title?: string;
  }>;
};

type PaymentMethod = "promptpay" | "bank";

const BANK_OPTIONS = [
  "กสิกรไทย",
  "กรุงเทพ",
  "กรุงไทย",
  "ไทยพาณิชย์",
  "กรุงศรีอยุธยา",
  "ทหารไทยธนชาต",
  "ออมสิน",
  "ธ.ก.ส.",
  "ยูโอบี",
  "ซีไอเอ็มบี ไทย",
];

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  if (!found) return "";
  return decodeURIComponent(found.substring(name.length + 1));
}

function getCreatorDisplayNameFromAuthCookie() {
  try {
    const rawAuth = getCookieValue("auth");
    if (!rawAuth) return "";
    const auth = JSON.parse(rawAuth);
    return String(auth?.creatorDisplayName || "").trim();
  } catch {
    return "";
  }
}
export default function ProfilePage() {
  const isMobile = useIsMobile(640);

  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    address: {
      recipientName: "",
      phone: "",
      line1: "",
      subdistrict: "",
      district: "",
      province: "",
      postalCode: "",
      note: "",
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingCreator, setApplyingCreator] = useState(false);
  const [editingCreator, setEditingCreator] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [creatorPayment, setCreatorPayment] = useState({
    displayName: "",
    promptPay: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("promptpay");

  const canApplyCreator = useMemo(() => {
    if (!currentUser?.id) return false;

    return orders.some(
      (o) =>
        o.userId === currentUser.id &&
        (o.status === "จัดส่งแล้ว" || o.status === "สำเร็จแล้ว")
    );
  }, [orders, currentUser]);

  const isCreatorApproved = useMemo(() => {
    return (
      currentUser?.creatorEnabled === true ||
      currentUser?.creatorStatus === "approved"
    );
  }, [currentUser]);

  const resolvedCreatorDisplayName = useMemo(() => {
    return (
      String(currentUser?.creatorDisplayName || "").trim() ||
      String(creatorPayment.displayName || "").trim() ||
      getCreatorDisplayNameFromAuthCookie() ||
      "-"
    );
  }, [currentUser?.creatorDisplayName, creatorPayment.displayName]);

  const applyCreator = async () => {
    if (!canApplyCreator) {
      alert("ต้องมีออเดอร์ที่จัดส่งแล้วก่อน ถึงสมัครได้");
      return;
    }

    if (!creatorPayment.displayName.trim()) {
      alert("กรุณากรอกชื่อที่จะแสดง");
      return;
    }

    if (paymentMethod === "promptpay") {
      if (!creatorPayment.promptPay.trim()) {
        alert("กรุณากรอกพร้อมเพย์");
        return;
      }
    }

    if (paymentMethod === "bank") {
      if (!creatorPayment.bankName.trim()) {
        alert("กรุณาเลือกธนาคาร");
        return;
      }
      if (!creatorPayment.accountName.trim()) {
        alert("กรุณากรอกชื่อบัญชี");
        return;
      }
      if (!creatorPayment.accountNumber.trim()) {
        alert("กรุณากรอกเลขบัญชี");
        return;
      }
    }

    try {
      setApplyingCreator(true);

      const payload = {
        creatorDisplayName: creatorPayment.displayName.trim(),
        promptPay:
          paymentMethod === "promptpay"
            ? creatorPayment.promptPay.trim()
            : "",
        bankName:
          paymentMethod === "bank"
            ? creatorPayment.bankName.trim()
            : "",
        accountName:
          paymentMethod === "bank"
            ? creatorPayment.accountName.trim()
            : "",
        accountNumber:
          paymentMethod === "bank"
            ? creatorPayment.accountNumber.trim()
            : "",
      };

      const res = await fetch("/api/creator/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "สมัครครีเอเตอร์ไม่สำเร็จ");
        return;
      }

      alert(data?.message || "สมัครครีเอเตอร์สำเร็จ");

      const [authRes, profileRes] = await Promise.all([
        fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/profile", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const authData = await authRes.json().catch(() => null);
      const profileData = await profileRes.json().catch(() => null);

      const me = authData?.user || null;
      const profileUser = profileData?.user || null;
      const cookieCreatorDisplayName = getCreatorDisplayNameFromAuthCookie();

      const mergedUser: CurrentUser | null = me
        ? {
            ...me,
            creatorDisplayName:
              String(me?.creatorDisplayName || "").trim() ||
              String(profileUser?.creatorDisplayName || "").trim() ||
              payload.creatorDisplayName ||
              cookieCreatorDisplayName ||
              "",
            creatorPayment: {
              promptPay:
                me?.creatorPayment?.promptPay ||
                profileUser?.creatorPayment?.promptPay ||
                payload.promptPay,
              bankName:
                me?.creatorPayment?.bankName ||
                profileUser?.creatorPayment?.bankName ||
                payload.bankName,
              accountName:
                me?.creatorPayment?.accountName ||
                profileUser?.creatorPayment?.accountName ||
                payload.accountName,
              accountNumber:
                me?.creatorPayment?.accountNumber ||
                profileUser?.creatorPayment?.accountNumber ||
                payload.accountNumber,
            },
          }
        : null;

      setCurrentUser(mergedUser);

      setCreatorPayment((prev) => ({
        ...prev,
        displayName:
          String(mergedUser?.creatorDisplayName || "").trim() ||
          String(profileUser?.creatorDisplayName || "").trim() ||
          payload.creatorDisplayName ||
          cookieCreatorDisplayName ||
          prev.displayName,
        promptPay:
          mergedUser?.creatorPayment?.promptPay ||
          profileUser?.creatorPayment?.promptPay ||
          prev.promptPay,
        bankName:
          mergedUser?.creatorPayment?.bankName ||
          profileUser?.creatorPayment?.bankName ||
          prev.bankName,
        accountName:
          mergedUser?.creatorPayment?.accountName ||
          profileUser?.creatorPayment?.accountName ||
          prev.accountName,
        accountNumber:
          mergedUser?.creatorPayment?.accountNumber ||
          profileUser?.creatorPayment?.accountNumber ||
          prev.accountNumber,
      }));

      if (mergedUser?.creatorPayment?.promptPay) {
        setPaymentMethod("promptpay");
      } else if (
        mergedUser?.creatorPayment?.bankName ||
        mergedUser?.creatorPayment?.accountNumber
      ) {
        setPaymentMethod("bank");
      }

      window.dispatchEvent(new Event("auth-changed"));
    } catch {
      alert("สมัครครีเอเตอร์ไม่สำเร็จ");
    } finally {
      setApplyingCreator(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, authRes, ordersRes] = await Promise.all([
          fetch("/api/profile", { cache: "no-store", credentials: "include" }),
          fetch("/api/auth/me", { cache: "no-store", credentials: "include" }),
          fetch("/api/orders", { cache: "no-store", credentials: "include" }),
        ]);

        const authData = await authRes.json().catch(() => null);
        const me = authData?.user || null;

        if (!authRes.ok || !me) {
          alert("กรุณาเข้าสู่ระบบก่อน");
          location.href = "/login";
          return;
        }

        const profileData = await profileRes.json().catch(() => null);
        const profileUser = profileData?.user || null;
        const cookieCreatorDisplayName = getCreatorDisplayNameFromAuthCookie();

        const mergedUser: CurrentUser = {
          ...me,
          creatorDisplayName:
            String(me?.creatorDisplayName || "").trim() ||
            String(profileUser?.creatorDisplayName || "").trim() ||
            cookieCreatorDisplayName ||
            "",
          creatorPayment: {
            promptPay:
              me?.creatorPayment?.promptPay ||
              profileUser?.creatorPayment?.promptPay ||
              "",
            bankName:
              me?.creatorPayment?.bankName ||
              profileUser?.creatorPayment?.bankName ||
              "",
            accountName:
              me?.creatorPayment?.accountName ||
              profileUser?.creatorPayment?.accountName ||
              "",
            accountNumber:
              me?.creatorPayment?.accountNumber ||
              profileUser?.creatorPayment?.accountNumber ||
              "",
          },
        };

        setCurrentUser(mergedUser);

        if (profileRes.ok && profileUser) {
          setForm({
            name: profileUser.name || "",
            phone: profileUser.phone || "",
            address: {
              recipientName: profileUser.address?.recipientName || "",
              phone: profileUser.address?.phone || "",
              line1: profileUser.address?.line1 || "",
              subdistrict: profileUser.address?.subdistrict || "",
              district: profileUser.address?.district || "",
              province: profileUser.address?.province || "",
              postalCode: profileUser.address?.postalCode || "",
              note: profileUser.address?.note || "",
            },
          });
        }

        setCreatorPayment({
          displayName:
            String(mergedUser?.creatorDisplayName || "").trim() ||
            String(profileUser?.creatorDisplayName || "").trim() ||
            cookieCreatorDisplayName ||
            "",
          promptPay: mergedUser?.creatorPayment?.promptPay || "",
          bankName: mergedUser?.creatorPayment?.bankName || "",
          accountName: mergedUser?.creatorPayment?.accountName || "",
          accountNumber: mergedUser?.creatorPayment?.accountNumber || "",
        });

        if (mergedUser?.creatorPayment?.promptPay) {
          setPaymentMethod("promptpay");
        } else if (
          mergedUser?.creatorPayment?.bankName ||
          mergedUser?.creatorPayment?.accountNumber
        ) {
          setPaymentMethod("bank");
        }

        const ordersData = await ordersRes.json().catch(() => null);
        const orderList: Order[] = Array.isArray(ordersData)
          ? ordersData
          : ordersData?.orders || [];
        setOrders(orderList);
      } catch {
        alert("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const saveProfile = async () => {
    try {
      setSaving(true);

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert("บันทึกข้อมูลเรียบร้อย");
      } else {
        alert(data?.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      alert("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1100,
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
          กำลังโหลดข้อมูล...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: isMobile ? 10 : 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: isMobile ? 20 : 34,
                fontWeight: 900,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              บัญชี / ที่อยู่ / ครีเอเตอร์
            </h1>
            <div
              style={{
                marginTop: isMobile ? 4 : 8,
                fontSize: isMobile ? 12 : 16,
                opacity: 0.96,
                lineHeight: 1.4,
              }}
            >
              จัดการข้อมูลบัญชี ที่อยู่จัดส่ง และสถานะครีเอเตอร์
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: isMobile ? 6 : 10,
              flexWrap: "wrap",
            }}
          >
            <a
              href="/"
              style={{
                height: isMobile ? 36 : 44,
                padding: isMobile ? "0 12px" : "0 16px",
                borderRadius: isMobile ? 10 : 14,
                background: "#ffffff",
                color: "#334155",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                boxShadow: "0 8px 18px rgba(255,255,255,0.16)",
                whiteSpace: "nowrap",
              }}
            >
              ← กลับหน้าแรก
            </a>

            <a
              href="/account/finance"
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 14,
                background: "#0f172a",
                color: "#fff",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                boxShadow: "0 8px 18px rgba(15,23,42,0.18)",
                whiteSpace: "nowrap",
              }}
            >
              รีวิวครีเอเตอร์
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #eef2f6",
          borderRadius: isMobile ? 18 : 24,
          padding: isMobile ? 16 : 24,
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
          แก้ไขข้อมูลบัญชี
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <input
            placeholder="ชื่อบัญชี"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
          />

          <input
            placeholder="เบอร์โทรหลัก"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={inputStyle}
          />

          <div
            style={{
              marginTop: 6,
              marginBottom: 2,
              fontSize: 18,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            ข้อมูลผู้รับและที่อยู่จัดส่ง
          </div>

          <input
            placeholder="ชื่อผู้รับ"
            value={form.address.recipientName}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, recipientName: e.target.value },
              })
            }
            style={inputStyle}
          />

          <input
            placeholder="เบอร์โทรผู้รับ"
            value={form.address.phone}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, phone: e.target.value },
              })
            }
            style={inputStyle}
          />

          <textarea
            placeholder="ที่อยู่ เช่น บ้านเลขที่ หมู่ ถนน"
            value={form.address.line1}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, line1: e.target.value },
              })
            }
            style={{
              ...inputStyle,
              minHeight: 110,
              resize: "vertical",
              paddingTop: 14,
              paddingBottom: 14,
            }}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 14,
            }}
          >
            <input
              placeholder="ตำบล / แขวง"
              value={form.address.subdistrict}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, subdistrict: e.target.value },
                })
              }
              style={inputStyle}
            />

            <input
              placeholder="อำเภอ / เขต"
              value={form.address.district}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, district: e.target.value },
                })
              }
              style={inputStyle}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 180px",
              gap: 14,
            }}
          >
            <input
              placeholder="จังหวัด"
              value={form.address.province}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, province: e.target.value },
                })
              }
              style={inputStyle}
            />

            <input
              placeholder="รหัสไปรษณีย์"
              value={form.address.postalCode}
              onChange={(e) =>
                setForm({
                  ...form,
                  address: { ...form.address, postalCode: e.target.value },
                })
              }
              style={inputStyle}
            />
          </div>

          <textarea
            placeholder="หมายเหตุเพิ่มเติม เช่น โทรก่อนส่ง"
            value={form.address.note}
            onChange={(e) =>
              setForm({
                ...form,
                address: { ...form.address, note: e.target.value },
              })
            }
            style={{
              ...inputStyle,
              minHeight: 90,
              resize: "vertical",
              paddingTop: 14,
              paddingBottom: 14,
            }}
          />

          <button
            onClick={saveProfile}
            disabled={saving}
            style={{
              height: 52,
              borderRadius: 16,
              border: "none",
              background: saving
                ? "#cbd5e1"
                : "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 17,
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 12px 24px rgba(238,77,45,0.20)",
              marginTop: 6,
            }}
          >
            {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #eef2f6",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
          marginTop: 22,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 900,
            marginBottom: 12,
            color: "#0f172a",
          }}
        >
          สมัครครีเอเตอร์
        </div>

        {isCreatorApproved ? (
          <div
            style={{
              borderRadius: 16,
              background: "#ecfdf5",
              border: "1px solid #86efac",
              color: "#166534",
              padding: 18,
              fontWeight: 800,
              lineHeight: 1.8,
            }}
          >
            ✅ บัญชีนี้เป็นครีเอเตอร์แล้ว
            <br />
            ชื่อที่แสดง: {resolvedCreatorDisplayName}
          </div>
        ) : !canApplyCreator ? (
          <div
            style={{
              borderRadius: 16,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              color: "#9a3412",
              padding: 18,
              fontWeight: 800,
              lineHeight: 1.7,
            }}
          >
            ต้องมีอย่างน้อย 1 ออเดอร์ที่สถานะเป็น “จัดส่งแล้ว” หรือ “สำเร็จแล้ว”
            ก่อน จึงจะสมัครเป็นครีเอเตอร์ได้
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                color: "#475569",
                lineHeight: 1.7,
                marginBottom: 4,
              }}
            >
              เมื่อสมัครสำเร็จ ระบบจะเปิดสิทธิ์ให้คุณสร้างรีวิวครีเอเตอร์ได้
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setPaymentMethod("promptpay")}
                style={segmentedButtonStyle(paymentMethod === "promptpay")}
              >
                พร้อมเพย์
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("bank")}
                style={segmentedButtonStyle(paymentMethod === "bank")}
              >
                โอนธนาคาร
              </button>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 18,
                padding: 18,
                display: "grid",
                gap: 14,
              }}
            >
              <input
                placeholder="ชื่อครีเอเตอร์ เช่น ฟาร์มลุงแดง"
                value={creatorPayment.displayName}
                onChange={(e) =>
                  setCreatorPayment({
                    ...creatorPayment,
                    displayName: e.target.value,
                  })
                }
                style={inputStyle}
              />

              {paymentMethod === "promptpay" ? (
                <input
                  placeholder="เบอร์พร้อมเพย์"
                  value={creatorPayment.promptPay}
                  onChange={(e) =>
                    setCreatorPayment({
                      ...creatorPayment,
                      promptPay: e.target.value,
                      bankName: "",
                      accountName: "",
                      accountNumber: "",
                    })
                  }
                  style={inputStyle}
                />
              ) : (
                <>
                  <select
                    value={creatorPayment.bankName}
                    onChange={(e) =>
                      setCreatorPayment({
                        ...creatorPayment,
                        promptPay: "",
                        bankName: e.target.value,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">เลือกธนาคาร</option>
                    {BANK_OPTIONS.map((bank) => (
                      <option key={bank} value={bank}>
                        {bank}
                      </option>
                    ))}
                  </select>

                  <input
                    placeholder="ชื่อบัญชี"
                    value={creatorPayment.accountName}
                    onChange={(e) =>
                      setCreatorPayment({
                        ...creatorPayment,
                        accountName: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />

                  <input
                    placeholder="เลขบัญชี"
                    value={creatorPayment.accountNumber}
                    onChange={(e) =>
                      setCreatorPayment({
                        ...creatorPayment,
                        accountNumber: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </>
              )}

              <button
                onClick={applyCreator}
                disabled={applyingCreator}
                style={{
                  height: 52,
                  borderRadius: 16,
                  border: "none",
                  background: applyingCreator
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                  color: "#fff",
                  fontWeight: 900,
                  fontSize: 17,
                  cursor: applyingCreator ? "not-allowed" : "pointer",
                  boxShadow: applyingCreator
                    ? "none"
                    : "0 12px 24px rgba(168,85,247,0.18)",
                  marginTop: 6,
                }}
              >
                {applyingCreator ? "กำลังสมัคร..." : "สมัครเป็นครีเอเตอร์"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 14,
  border: "1px solid #e4e7ec",
  fontSize: 16,
  outline: "none",
  background: "#fff",
  color: "#111827",
  boxShadow: "0 1px 2px rgba(15,23,42,0.02)",
};

function segmentedButtonStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 48,
    borderRadius: 14,
    border: active ? "2px solid #ee4d2d" : "1px solid #d0d5dd",
    background: active ? "#fff1ee" : "#fff",
    color: active ? "#ee4d2d" : "#334155",
    fontWeight: 900,
    fontSize: 15,
    cursor: "pointer",
    boxShadow: active ? "0 8px 18px rgba(238,77,45,0.10)" : "none",
  };
}