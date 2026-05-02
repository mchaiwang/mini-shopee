"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type Mode = "login" | "register" | "verifyOtp" | "forgotPassword" | "resetPassword";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";
  const isMobile = useIsMobile(820);

  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    otp: "",
    newPassword: "",
  });

  const titleMap: Record<Mode, string> = {
    login: "ยินดีต้อนรับกลับ",
    register: "สร้างบัญชีผู้ใช้",
    verifyOtp: "ยืนยัน OTP",
    forgotPassword: "ลืมรหัสผ่าน",
    resetPassword: "ตั้งรหัสผ่านใหม่",
  };

  const subtitleMap: Record<Mode, string> = {
    login: "เข้าสู่ระบบเพื่อดำเนินการต่อ",
    register: "กรอกข้อมูลเพื่อสมัครสมาชิกใหม่",
    verifyOtp: "กรอกรหัส OTP 6 หลักที่ส่งไปยังอีเมล",
    forgotPassword: "กรอกอีเมลเพื่อรับรหัส OTP สำหรับรีเซตรหัสผ่าน",
    resetPassword: "กรอก OTP และรหัสผ่านใหม่",
  };

  async function handleSubmit() {
    try {
      setLoading(true);

      if (mode === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          alert(data?.error || "เข้าสู่ระบบไม่สำเร็จ");
          return;
        }

        window.dispatchEvent(new Event("auth-changed"));
        setTimeout(() => {
          location.href = nextUrl;
        }, 300);
        return;
      }

      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          alert(data?.error || "สมัครไม่สำเร็จ");
          return;
        }

        setDevOtp(data?.devOtp || "");
        alert("สมัครสำเร็จ กรุณากรอก OTP เพื่อยืนยันอีเมล");
        setMode("verifyOtp");
        return;
      }

      if (mode === "verifyOtp") {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, otp: form.otp }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          alert(data?.error || "OTP ไม่ถูกต้อง");
          return;
        }

        alert("ยืนยันอีเมลสำเร็จ กรุณาเข้าสู่ระบบ");
        setDevOtp("");
        setMode("login");
        return;
      }

      if (mode === "forgotPassword") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          alert(data?.error || "ส่ง OTP ไม่สำเร็จ");
          return;
        }

        setDevOtp(data?.devOtp || "");
        alert("ส่ง OTP แล้ว กรุณากรอก OTP และรหัสผ่านใหม่");
        setMode("resetPassword");
        return;
      }

      if (mode === "resetPassword") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: form.email,
            otp: form.otp,
            newPassword: form.newPassword,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          alert(data?.error || "รีเซตรหัสผ่านไม่สำเร็จ");
          return;
        }

        alert("ตั้งรหัสผ่านใหม่สำเร็จ กรุณาเข้าสู่ระบบ");
        setDevOtp("");
        setMode("login");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        background: "linear-gradient(180deg, #fff7f5 0%, #fff 35%, #fafafa 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: isMobile ? 12 : 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? 460 : 980,
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
          gap: isMobile ? 0 : 24,
          alignItems: "stretch",
        }}
      >
        {!isMobile && (
          <div
            style={{
              borderRadius: 28,
              background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 55%, #ff9b76 100%)",
              color: "#fff",
              padding: 36,
              boxShadow: "0 18px 40px rgba(238,77,45,0.22)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: 560,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: "rgba(255,255,255,0.18)",
                display: "grid",
                placeItems: "center",
                fontSize: 34,
                marginBottom: 22,
              }}
            >
              🐾
            </div>

            <h1 style={{ fontSize: 36, lineHeight: 1.2, fontWeight: 900, margin: 0 }}>
              💸 ทางเลือกที่ช่วย “ลดภาระ”
            </h1>

            <div style={{ marginTop: 16, fontSize: 17, lineHeight: 1.85, opacity: 0.96 }}>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>
                หนึ่งในสิ่งที่ทำให้หลายคนลังเล คือ “ค่าใช้จ่าย”
              </div>

              <div>
                fipแมว.com จึงตั้งใจเป็นอีกทางเลือกหนึ่ง
                <br />
                ที่ช่วยให้เจ้าของแมวสามารถเข้าถึงแนวทางการดูแลได้ง่ายขึ้น
              </div>
            </div>

            <div style={{ marginTop: 26, display: "grid", gap: 12 }}>
              <div style={featureRow}>
                <span style={featureDot}>✓</span>
                <span>มีข้อมูลเปรียบเทียบ</span>
              </div>
              <div style={featureRow}>
                <span style={featureDot}>✓</span>
                <span>มีแนวทางจากผู้ใช้จริง</span>
              </div>
              <div style={featureRow}>
                <span style={featureDot}>✓</span>
                <span>ช่วยตัดสินใจได้อย่างมีข้อมูล</span>
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "1px solid #eef2f6",
            borderRadius: isMobile ? 20 : 28,
            boxShadow: "0 12px 32px rgba(15,23,42,0.07)",
            padding: isMobile ? 18 : 28,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            minHeight: isMobile ? "auto" : 560,
          }}
        >
          <div
            style={{
              display: "flex",
              marginBottom: 22,
              background: "#fff7f5",
              padding: 6,
              borderRadius: 16,
              border: "1px solid #ffd9cf",
              gap: 6,
            }}
          >
            <button onClick={() => setMode("login")} style={tabStyle(mode === "login")}>
              เข้าสู่ระบบ
            </button>
            <button onClick={() => setMode("register")} style={tabStyle(mode === "register")}>
              สมัครสมาชิก
            </button>
          </div>

          <h2 style={{ margin: "0 0 8px", fontSize: isMobile ? 22 : 30, fontWeight: 900 }}>
            {titleMap[mode]}
          </h2>

          <div style={{ color: "#64748b", marginBottom: 18, fontSize: 15 }}>
            {subtitleMap[mode]}
          </div>

          {devOtp && (
            <div style={otpDevBoxStyle}>
              OTP ทดสอบ: <b>{devOtp}</b>
            </div>
          )}

          {mode === "register" && (
            <input
              placeholder="ชื่อ"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          )}

          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={inputStyle}
          />

          {(mode === "login" || mode === "register") && (
            <input
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={inputStyle}
            />
          )}

          {(mode === "verifyOtp" || mode === "resetPassword") && (
            <input
              placeholder="OTP 6 หลัก"
              value={form.otp}
              onChange={(e) =>
                setForm({
                  ...form,
                  otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                })
              }
              style={inputStyle}
            />
          )}

          {mode === "resetPassword" && (
            <input
              placeholder="รหัสผ่านใหม่"
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              style={inputStyle}
            />
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 16,
              border: "none",
              background: loading ? "#cbd5e1" : "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 900,
              fontSize: 17,
              boxShadow: loading ? "none" : "0 12px 24px rgba(238,77,45,0.20)",
              marginTop: 6,
            }}
          >
            {loading
              ? "กำลังดำเนินการ..."
              : mode === "login"
              ? "เข้าสู่ระบบ"
              : mode === "register"
              ? "สมัครสมาชิก"
              : mode === "verifyOtp"
              ? "ยืนยัน OTP"
              : mode === "forgotPassword"
              ? "ส่ง OTP"
              : "ตั้งรหัสผ่านใหม่"}
          </button>

          {mode === "login" && (
            <button type="button" onClick={() => setMode("forgotPassword")} style={linkButtonStyle}>
              ลืมรหัสผ่าน?
            </button>
          )}

          {(mode === "verifyOtp" || mode === "forgotPassword" || mode === "resetPassword") && (
            <button type="button" onClick={() => setMode("login")} style={linkButtonStyle}>
              กลับไปเข้าสู่ระบบ
            </button>
          )}

          <div style={{ marginTop: 16, color: "#64748b", fontSize: 14, textAlign: "center" }}>
            {mode === "login"
              ? "ยังไม่มีบัญชี? กดที่ สมัครสมาชิก"
              : mode === "register"
              ? "มีบัญชีอยู่แล้ว? กดที่ เข้าสู่ระบบ"
              : "ตรวจสอบอีเมลของคุณ หรือใช้ OTP ทดสอบที่แสดงในหน้านี้"}
          </div>
        </div>
      </div>
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    height: 46,
    borderRadius: 12,
    border: "none",
    background: active ? "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)" : "transparent",
    color: active ? "#fff" : "#9a3412",
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: active ? "0 10px 20px rgba(238,77,45,0.18)" : "none",
  };
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

const linkButtonStyle: React.CSSProperties = {
  marginTop: 10,
  border: "none",
  background: "transparent",
  color: "#ee4d2d",
  fontWeight: 800,
  cursor: "pointer",
};

const otpDevBoxStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: 12,
  borderRadius: 12,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  color: "#9a3412",
  fontWeight: 800,
};

const featureRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  fontSize: 16,
  fontWeight: 700,
};

const featureDot: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "rgba(255,255,255,0.18)",
  fontSize: 13,
  fontWeight: 900,
  flexShrink: 0,
};


export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <LoginPageInner />
    </Suspense>
  );
}