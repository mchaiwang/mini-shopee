"use client";

import { useEffect, useMemo, useState } from "react";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import {
  CreatorBenefitsCard,
  CreatorQuickActions,
  CreatorPromoBanner,
} from "@/app/components/creator-promo";
import { useToast } from "@/app/components/ToastProvider";

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
  const { showToast } = useToast();

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
  if (!currentUser) return false;

  return orders.some((o) => {
    const isOwner =
      o.userId === currentUser.id ||
      o.email === currentUser.email;

    const isSuccess =
  o.status === "จัดส่งแล้ว" ||
  o.status === "ได้รับสินค้าแล้ว" ||
  o.status === "ได้รับของแล้ว" ||
  o.status === "สำเร็จแล้ว";

    return isOwner && isSuccess;
  });
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

  const successfulOrderCount = useMemo(() => {
    if (!currentUser) return 0;

    return orders.filter((o) => {
      const isOwner =
        o.userId === currentUser.id ||
        o.email === currentUser.email;

      const isSuccess =
        o.status === "จัดส่งแล้ว" ||
        o.status === "ได้รับสินค้าแล้ว" ||
        o.status === "ได้รับของแล้ว" ||
        o.status === "สำเร็จแล้ว";

      return isOwner && isSuccess;
    }).length;
  }, [orders, currentUser]);

  const creatorStatusText = useMemo(() => {
    if (isCreatorApproved) return "ครีเอเตอร์อนุมัติแล้ว";
    if (canApplyCreator) return "พร้อมสมัครครีเอเตอร์";
    return "รอเงื่อนไขการสั่งซื้อ";
  }, [isCreatorApproved, canApplyCreator]);

  const primaryAddressText = useMemo(() => {
    const parts = [
      form.address.line1,
      form.address.subdistrict,
      form.address.district,
      form.address.province,
      form.address.postalCode,
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : "ยังไม่ได้กรอกที่อยู่จัดส่ง";
  }, [form.address]);

  const applyCreator = async () => {
    if (!canApplyCreator) {
      showToast("success", "ต้องเคยสั่งสินค้าจริง และ ได้รับสินค้าแล้ว ก่อน ถึงสมัครได้");
      return;
    }

    if (!creatorPayment.displayName.trim()) {
      showToast("warning", "กรุณากรอกชื่อที่จะแสดง");
      return;
    }

    if (paymentMethod === "promptpay") {
      if (!creatorPayment.promptPay.trim()) {
        showToast("warning", "กรุณากรอกพร้อมเพย์");
        return;
      }
    }

    if (paymentMethod === "bank") {
      if (!creatorPayment.bankName.trim()) {
        showToast("warning", "กรุณาเลือกธนาคาร");
        return;
      }
      if (!creatorPayment.accountName.trim()) {
        showToast("warning", "กรุณากรอกชื่อบัญชี");
        return;
      }
      if (!creatorPayment.accountNumber.trim()) {
        showToast("warning", "กรุณากรอกเลขบัญชี");
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
        showToast("error", data?.message || "สมัครครีเอเตอร์ไม่สำเร็จ");
        return;
      }

      showToast("success", data?.message || "สมัครครีเอเตอร์สำเร็จ");

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
      showToast("error", "สมัครครีเอเตอร์ไม่สำเร็จ");
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
          showToast("warning", "กรุณาเข้าสู่ระบบก่อน");
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
        showToast("error", "โหลดข้อมูลไม่สำเร็จ");
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
        showToast("success", "บันทึกข้อมูลเรียบร้อย");
      } else {
        showToast("error", data?.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      showToast("error", "บันทึกไม่สำเร็จ");
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
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fff7f3 0%, #f8fafc 34%, #ffffff 100%)",
        padding: isMobile ? "10px 10px 34px" : "22px 16px 48px",
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, #ee4d2d 0%, #ff7337 48%, #ffad7a 100%)",
            borderRadius: isMobile ? 20 : 30,
            padding: isMobile ? "18px 16px" : "28px 30px",
            color: "#fff",
            boxShadow: "0 18px 42px rgba(238,77,45,0.22)",
            marginBottom: isMobile ? 14 : 18,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 220,
              height: 220,
              borderRadius: "50%",
              right: -70,
              top: -90,
              background: "rgba(255,255,255,0.18)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 160,
              height: 160,
              borderRadius: "50%",
              right: 120,
              bottom: -110,
              background: "rgba(255,255,255,0.12)",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: isMobile ? 12 : 18,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 420px" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 900,
                  marginBottom: 12,
                }}
              >
                👤 ศูนย์จัดการบัญชีลูกค้า
              </div>

              <h1
                style={{
                  fontSize: isMobile ? 24 : 38,
                  fontWeight: 950,
                  margin: 0,
                  lineHeight: 1.12,
                  letterSpacing: "-0.03em",
                }}
              >
                บัญชี / ที่อยู่ / ครีเอเตอร์
              </h1>

              <div
                style={{
                  marginTop: isMobile ? 8 : 10,
                  fontSize: isMobile ? 13 : 16,
                  opacity: 0.96,
                  lineHeight: 1.6,
                  maxWidth: 680,
                  fontWeight: 700,
                }}
              >
                ข้อมูลนี้ใช้สำหรับจัดส่งสินค้า ติดตามคำสั่งซื้อ และเปิดสิทธิ์สร้างรีวิวรับคอมมิชชั่น
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: isMobile ? 8 : 10,
                flexWrap: "wrap",
                justifyContent: isMobile ? "flex-start" : "flex-end",
              }}
            >
              <a
                href="/"
                style={{
                  height: isMobile ? 38 : 44,
                  padding: isMobile ? "0 12px" : "0 16px",
                  borderRadius: isMobile ? 12 : 14,
                  background: "#ffffff",
                  color: "#334155",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  boxShadow: "0 10px 24px rgba(255,255,255,0.18)",
                  whiteSpace: "nowrap",
                }}
              >
                ← กลับหน้าแรก
              </a>

              <a
                href="/account/finance"
                style={{
                  height: isMobile ? 38 : 44,
                  padding: isMobile ? "0 12px" : "0 16px",
                  borderRadius: isMobile ? 12 : 14,
                  background: "#0f172a",
                  color: "#fff",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
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
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? 10 : 14,
            marginBottom: isMobile ? 14 : 18,
          }}
        >
          <div style={summaryCardStyle("#fff7ed", "#fed7aa")}>
            <div style={summaryIconStyle}>🏷️</div>
            <div>
              <div style={summaryLabelStyle}>ชื่อบัญชี</div>
              <div style={summaryValueStyle}>{form.name || "ยังไม่ได้กรอก"}</div>
            </div>
          </div>

          <div style={summaryCardStyle("#f0fdf4", "#bbf7d0")}>
            <div style={summaryIconStyle}>📦</div>
            <div>
              <div style={summaryLabelStyle}>ข้อมูลจัดส่ง</div>
              <div style={summaryValueStyle}>
                {form.address.recipientName ? "พร้อมใช้จัดส่ง" : "ควรกรอกให้ครบ"}
              </div>
            </div>
          </div>

          <div style={summaryCardStyle("#eff6ff", "#bfdbfe")}>
            <div style={summaryIconStyle}>✅</div>
            <div>
              <div style={summaryLabelStyle}>ออเดอร์ที่เข้าเงื่อนไข</div>
              <div style={summaryValueStyle}>{successfulOrderCount} ออเดอร์</div>
            </div>
          </div>

          <div style={summaryCardStyle("#f5f3ff", "#ddd6fe")}>
            <div style={summaryIconStyle}>⭐</div>
            <div>
              <div style={summaryLabelStyle}>สถานะครีเอเตอร์</div>
              <div style={summaryValueStyle}>{creatorStatusText}</div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 340px",
            gap: isMobile ? 14 : 18,
            alignItems: "start",
          }}
        >
          <section
            style={{
              background: "#fff",
              border: "1px solid #eef2f6",
              borderRadius: isMobile ? 20 : 26,
              padding: isMobile ? 16 : 24,
              boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 26,
                    fontWeight: 950,
                    marginBottom: 6,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  แก้ไขข้อมูลบัญชี
                </div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: isMobile ? 13 : 14,
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  กรอกข้อมูลให้ครบ เพื่อให้ระบบออกใบจัดส่งและติดต่อกลับได้แม่นยำ
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#fff7ed",
                  color: "#c2410c",
                  border: "1px solid #fed7aa",
                  fontSize: 12,
                  fontWeight: 900,
                  whiteSpace: "nowrap",
                }}
              >
                ข้อมูลส่วนตัวปลอดภัย
              </div>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              <div style={formSectionHeaderStyle}>
                <span style={formSectionIconStyle}>1</span>
                ข้อมูลบัญชีหลัก
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 14,
                }}
              >
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>ชื่อบัญชี</span>
                  <input
                    placeholder="ชื่อบัญชี"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>เบอร์โทรหลัก</span>
                  <input
                    placeholder="เบอร์โทรหลัก"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    style={inputStyle}
                  />
                </label>
              </div>

              <div style={formSectionHeaderStyle}>
                <span style={formSectionIconStyle}>2</span>
                ข้อมูลผู้รับและที่อยู่จัดส่ง
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 14,
                }}
              >
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>ชื่อผู้รับ</span>
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
                </label>

                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>เบอร์โทรผู้รับ</span>
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
                </label>
              </div>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>บ้านเลขที่ / หมู่ / ถนน</span>
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
                    minHeight: 112,
                    resize: "vertical",
                    paddingTop: 14,
                    paddingBottom: 14,
                    lineHeight: 1.6,
                  }}
                />
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 14,
                }}
              >
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>ตำบล / แขวง</span>
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
                </label>

                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>อำเภอ / เขต</span>
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
                </label>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 180px",
                  gap: 14,
                }}
              >
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>จังหวัด</span>
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
                </label>

                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>รหัสไปรษณีย์</span>
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
                </label>
              </div>

              <label style={fieldWrapStyle}>
                <span style={fieldLabelStyle}>หมายเหตุสำหรับขนส่ง</span>
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
                    minHeight: 88,
                    resize: "vertical",
                    paddingTop: 14,
                    paddingBottom: 14,
                    lineHeight: 1.6,
                  }}
                />
              </label>

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  height: 54,
                  borderRadius: 16,
                  border: "none",
                  background: saving
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
                  color: "#fff",
                  fontWeight: 950,
                  fontSize: 17,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving
                    ? "none"
                    : "0 14px 28px rgba(238,77,45,0.22)",
                  marginTop: 6,
                }}
              >
                {saving ? "กำลังบันทึก..." : "บันทึกข้อมูลบัญชีและที่อยู่"}
              </button>
            </div>
          </section>

          <aside
            style={{
              display: "grid",
              gap: 14,
              position: isMobile ? "static" : "sticky",
              top: 18,
            }}
          >
            <div
              style={{
                background: "#0f172a",
                color: "#fff",
                borderRadius: 24,
                padding: 20,
                boxShadow: "0 16px 34px rgba(15,23,42,0.18)",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: 130,
                  height: 130,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.08)",
                  right: -44,
                  top: -50,
                }}
              />
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    fontSize: 13,
                    opacity: 0.82,
                    fontWeight: 800,
                    marginBottom: 8,
                  }}
                >
                  ภาพรวมบัญชี
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 950,
                    lineHeight: 1.25,
                    marginBottom: 12,
                  }}
                >
                  {form.name || "บัญชีของฉัน"}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: "#cbd5e1",
                  }}
                >
                  {currentUser?.email || "ยังไม่มีอีเมล"}
                  <br />
                  โทร: {form.phone || "-"}
                </div>
              </div>
            </div>

            <div style={sideCardStyle}>
              <div style={sideTitleStyle}>📍 ที่อยู่จัดส่งปัจจุบัน</div>
              <div
                style={{
                  color: "#475569",
                  lineHeight: 1.7,
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                ผู้รับ: {form.address.recipientName || "-"}
                <br />
                โทร: {form.address.phone || "-"}
                <br />
                {primaryAddressText}
              </div>
            </div>

            <div style={sideCardStyle}>
              <div style={sideTitleStyle}>⭐ สถานะครีเอเตอร์</div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: isCreatorApproved
                    ? "#ecfdf5"
                    : canApplyCreator
                    ? "#eff6ff"
                    : "#fff7ed",
                  border: isCreatorApproved
                    ? "1px solid #86efac"
                    : canApplyCreator
                    ? "1px solid #bfdbfe"
                    : "1px solid #fdba74",
                  color: isCreatorApproved
                    ? "#166534"
                    : canApplyCreator
                    ? "#1d4ed8"
                    : "#9a3412",
                  fontWeight: 900,
                  fontSize: 13,
                  marginBottom: 10,
                }}
              >
                {isCreatorApproved ? "✅" : canApplyCreator ? "🚀" : "⏳"}{" "}
                {creatorStatusText}
              </div>
              <div
                style={{
                  color: "#64748b",
                  lineHeight: 1.7,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {isCreatorApproved
                  ? `ชื่อที่แสดง: ${resolvedCreatorDisplayName}`
                  : canApplyCreator
                  ? "คุณมีออเดอร์เข้าเงื่อนไขแล้ว สามารถสมัครและรับคอมมิชชั่น 10% ได้"
                  : "เมื่อมีออเดอร์ที่จัดส่งแล้วหรือได้รับสินค้าแล้ว จะเปิดสิทธิ์สมัครครีเอเตอร์"}
              </div>
            </div>

            <div style={sideCardStyle}>
              <div style={sideTitleStyle}>💡 คำแนะนำ</div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  color: "#64748b",
                  lineHeight: 1.8,
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                <li>กรอกเบอร์โทรให้ตรงกับผู้รับสินค้า</li>
                <li>ตรวจรหัสไปรษณีย์ก่อนบันทึก</li>
                <li>สมัครครีเอเตอร์แล้วสร้างรีวิวเพื่อรับคอมมิชชั่น</li>
              </ul>
            </div>
          </aside>
        </div>

        {!isCreatorApproved ? (
          <div style={{ marginTop: 18 }}>
            <CreatorPromoBanner href="#apply-creator-section" compact={isMobile} />
          </div>
        ) : null}

        <div
          id="apply-creator-section"
          style={{
            background: "#fff",
            border: "1px solid #eef2f6",
            borderRadius: isMobile ? 20 : 26,
            padding: isMobile ? 16 : 24,
            boxShadow: "0 14px 34px rgba(15,23,42,0.06)",
            marginTop: 18,
            scrollMarginTop: 80,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: 950,
                  marginBottom: 6,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                }}
              >
                สมัครครีเอเตอร์
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: isMobile ? 13 : 14,
                  lineHeight: 1.6,
                  fontWeight: 700,
                }}
              >
                สร้างรีวิว แจกใบปลิว และรับคอมมิชชั่น 10% จากยอดขายผ่านรีวิวของคุณ
              </div>
            </div>

            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#475569",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              {creatorStatusText}
            </div>
          </div>

          {isCreatorApproved ? (
            <>
              <div
                style={{
                  borderRadius: 18,
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

              <CreatorQuickActions />
            </>
          ) : !canApplyCreator ? (
            <>
              <CreatorBenefitsCard />
              <div
                style={{
                  borderRadius: 18,
                  background: "#fff7ed",
                  border: "1px solid #fdba74",
                  color: "#9a3412",
                  padding: 18,
                  fontWeight: 800,
                  lineHeight: 1.7,
                }}
              >
                ต้องมีอย่างน้อย 1 ออเดอร์ที่สถานะเป็น “จัดส่งแล้ว” หรือ “ได้รับสินค้าแล้ว”
                ก่อน จึงจะสมัครเป็นครีเอเตอร์ได้
              </div>
            </>
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              <CreatorBenefitsCard />

              <div
                style={{
                  color: "#475569",
                  lineHeight: 1.7,
                  marginBottom: 4,
                  fontWeight: 700,
                }}
              >
                เมื่อสมัครสำเร็จ ระบบจะให้คอมมิสชั่น 10% ของยอดขายที่คลิ๊กซื้อจากรีวิว
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
                  borderRadius: 20,
                  padding: isMobile ? 14 : 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <label style={fieldWrapStyle}>
                  <span style={fieldLabelStyle}>ชื่อครีเอเตอร์ที่จะแสดง</span>
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
                </label>

                {paymentMethod === "promptpay" ? (
                  <label style={fieldWrapStyle}>
                    <span style={fieldLabelStyle}>เบอร์พร้อมเพย์</span>
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
                  </label>
                ) : (
                  <>
                    <label style={fieldWrapStyle}>
                      <span style={fieldLabelStyle}>ธนาคาร</span>
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
                    </label>

                    <label style={fieldWrapStyle}>
                      <span style={fieldLabelStyle}>ชื่อบัญชี</span>
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
                    </label>

                    <label style={fieldWrapStyle}>
                      <span style={fieldLabelStyle}>เลขบัญชี</span>
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
                    </label>
                  </>
                )}

                <button
                  onClick={applyCreator}
                  disabled={applyingCreator}
                  style={{
                    height: 54,
                    borderRadius: 16,
                    border: "none",
                    background: applyingCreator
                      ? "#cbd5e1"
                      : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                    color: "#fff",
                    fontWeight: 950,
                    fontSize: 17,
                    cursor: applyingCreator ? "not-allowed" : "pointer",
                    boxShadow: applyingCreator
                      ? "none"
                      : "0 14px 28px rgba(168,85,247,0.20)",
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
    </div>
  );
}


const summaryLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
  marginBottom: 4,
};

const summaryValueStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#0f172a",
  fontWeight: 950,
  lineHeight: 1.35,
};

const summaryIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
  fontSize: 20,
  flexShrink: 0,
};

function summaryCardStyle(background: string, borderColor: string): React.CSSProperties {
  return {
    background,
    border: `1px solid ${borderColor}`,
    borderRadius: 20,
    padding: 16,
    display: "flex",
    gap: 12,
    alignItems: "center",
    minHeight: 84,
    boxShadow: "0 10px 26px rgba(15,23,42,0.04)",
  };
}

const formSectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 17,
  fontWeight: 950,
  color: "#0f172a",
  paddingTop: 4,
};

const formSectionIconStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 999,
  background: "#ee4d2d",
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 950,
  boxShadow: "0 8px 18px rgba(238,77,45,0.18)",
};

const fieldWrapStyle: React.CSSProperties = {
  display: "grid",
  gap: 7,
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const sideCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef2f6",
  borderRadius: 22,
  padding: 18,
  boxShadow: "0 12px 30px rgba(15,23,42,0.055)",
};

const sideTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 950,
  color: "#0f172a",
  marginBottom: 10,
};


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