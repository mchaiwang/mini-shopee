"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

function LoginPageInner() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/";
  const isMobile = useIsMobile(820); // ซ่อน promo เร็วหน่อยเพราะ panel แนวนอนต้องการพื้นที่

  const [mode, setMode] = useState<"login" | "register">("login");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async () => {
    if (mode === "login") {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        window.dispatchEvent(new Event("auth-changed"));

        setTimeout(() => {
          location.href = nextUrl;
        }, 300);
      } else {
        alert(data?.error || "เข้าสู่ระบบไม่สำเร็จ");
      }
    }

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok) {
        alert("สมัครสำเร็จแล้ว กรุณา Login");
        setMode("login");
      } else {
        alert(data?.error || "สมัครไม่สำเร็จ");
      }
    }
  };

  return (
    <div
      style={{
        minHeight: "calc(100vh - 80px)",
        background:
          "linear-gradient(180deg, #fff7f5 0%, #fff 35%, #fafafa 100%)",
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
        {/* left promo - ซ่อนบนมือถือ */}
        {!isMobile && (
        <div
          style={{
            borderRadius: 28,
            background:
              "linear-gradient(135deg, #ee4d2d 0%, #ff7337 55%, #ff9b76 100%)",
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
              backdropFilter: "blur(6px)",
            }}
          >
            🌿
          </div>

          <h1
            style={{
              fontSize: 42,
              lineHeight: 1.12,
              fontWeight: 900,
              margin: 0,
            }}
          >
            Herbal Store
          </h1>

          <div
            style={{
              marginTop: 14,
              fontSize: 18,
              lineHeight: 1.75,
              opacity: 0.96,
              maxWidth: 460,
            }}
          >
            เข้าสู่ระบบเพื่อสั่งซื้อสินค้า จัดการที่อยู่จัดส่ง
            และติดตามคำสั่งซื้อได้สะดวกยิ่งขึ้น
          </div>

          <div
            style={{
              marginTop: 26,
              display: "grid",
              gap: 12,
              maxWidth: 420,
            }}
          >
            <div style={featureRow}>
              <span style={featureDot}>✓</span>
              <span>บันทึกข้อมูลผู้รับและที่อยู่จัดส่งอัตโนมัติ</span>
            </div>
            <div style={featureRow}>
              <span style={featureDot}>✓</span>
              <span>ตรวจสอบสถานะคำสั่งซื้อได้ทันที</span>
            </div>
            <div style={featureRow}>
              <span style={featureDot}>✓</span>
              <span>ชำระเงินและอัปโหลดสลิปได้สะดวก</span>
            </div>
          </div>
        </div>
        )}

        {/* mini header สำหรับมือถือ */}
        {isMobile && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 4px",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                color: "#fff",
                boxShadow: "0 6px 14px rgba(238,77,45,0.24)",
                flexShrink: 0,
              }}
            >
              🌿
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#0f172a",
                  lineHeight: 1.2,
                }}
              >
                Herbal Store
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  marginTop: 2,
                }}
              >
                สมุนไพรไทย รีวิวจริง
              </div>
            </div>
          </div>
        )}

        {/* right form */}
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
          {/* toggle */}
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
            <button
              onClick={() => setMode("login")}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                border: "none",
                background:
                  mode === "login"
                    ? "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)"
                    : "transparent",
                color: mode === "login" ? "#fff" : "#9a3412",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow:
                  mode === "login"
                    ? "0 10px 20px rgba(238,77,45,0.18)"
                    : "none",
              }}
            >
              เข้าสู่ระบบ
            </button>

            <button
              onClick={() => setMode("register")}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 12,
                border: "none",
                background:
                  mode === "register"
                    ? "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)"
                    : "transparent",
                color: mode === "register" ? "#fff" : "#9a3412",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow:
                  mode === "register"
                    ? "0 10px 20px rgba(238,77,45,0.18)"
                    : "none",
              }}
            >
              สมัครสมาชิก
            </button>
          </div>

          <h2
            style={{
              margin: "0 0 8px",
              fontSize: isMobile ? 22 : 30,
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {mode === "login" ? "ยินดีต้อนรับกลับ" : "สร้างบัญชีผู้ใช้"}
          </h2>

          <div
            style={{
              color: "#64748b",
              marginBottom: isMobile ? 14 : 18,
              fontSize: isMobile ? 13 : 15,
            }}
          >
            {mode === "login"
              ? "เข้าสู่ระบบเพื่อดำเนินการต่อ"
              : "กรอกข้อมูลเพื่อสมัครสมาชิกใหม่"}
          </div>

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

          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={inputStyle}
          />

          <button
            onClick={handleSubmit}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 16,
              border: "none",
              background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: 17,
              boxShadow: "0 12px 24px rgba(238,77,45,0.20)",
              marginTop: 6,
            }}
          >
            {mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>

          <div
            style={{
              marginTop: 16,
              color: "#64748b",
              fontSize: 14,
              textAlign: "center",
            }}
          >
            {mode === "login"
              ? "ยังไม่มีบัญชี? กดที่ สมัครสมาชิก"
              : "มีบัญชีอยู่แล้ว? กดที่ เข้าสู่ระบบ"}
          </div>
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