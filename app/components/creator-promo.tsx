"use client";

/**
 * Creator / Affiliate promotion components
 *
 * NOTE:
 * - ห้ามแก้ logic เดิม / login flow / order flow / payment flow
 * - components เหล่านี้เป็น "presentational" ทั้งหมด ไม่แตะ API ใด ๆ
 * - ใช้ inline style ตาม theme ของเว็บ (orange/brand) เพื่อให้กลมกลืน
 * - mobile-first และ responsive ด้วย CSS-in-JS + media query ผ่าน <style>
 */

import React from "react";

/* ----------------------------------------------------------- */
/* 1) Homepage Creator Banner — ใต้ hero / สินค้าเด่น           */
/* ----------------------------------------------------------- */
export function CreatorPromoBanner({
  href = "/profile",
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  return (
    <section
      className="creator-promo-banner"
      aria-label="สมัครครีเอเตอร์ เติบโตไปกับเรา"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #ee4d2d 0%, #ff7337 55%, #ffb072 100%)",
        color: "#fff",
        borderRadius: 22,
        padding: compact ? "18px 16px" : "22px 22px",
        marginBottom: compact ? 12 : 16,
        boxShadow: "0 18px 36px rgba(238,77,45,0.22)",
      }}
    >
      {/* glow blob */}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          right: -40,
          top: -40,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          left: -60,
          bottom: -60,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        className="creator-promo-banner__inner"
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(4px)",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.2,
              marginBottom: 10,
            }}
          >
            <span>🐾</span>
            <span>โปรแกรมครีเอเตอร์</span>
          </div>

          <h2
            className="creator-promo-banner__title"
            style={{
              margin: 0,
              fontSize: 22,
              lineHeight: 1.25,
              fontWeight: 900,
              letterSpacing: "-0.01em",
            }}
          >
            สมัครครีเอเตอร์ • เติบโตไปกับเรา
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              fontSize: 14,
              lineHeight: 1.6,
              opacity: 0.96,
            }}
          >
            แบ่งปันประสบการณ์ดูแลจากเคสจริง สร้างรีวิว แจกใบปลิว
            และรับคอมมิชชั่น <b>10%</b> จากยอดขายผ่านรีวิวของคุณ
          </p>

          <ul
            style={{
              margin: "12px 0 0",
              padding: 0,
              listStyle: "none",
              display: "grid",
              gap: 6,
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            <li style={liStyle}>✅ รีวิวช่วยสร้างโอกาสให้สัตว์เลี้ยงมีชีวิต</li>
            <li style={liStyle}>✅ แชร์ลง Facebook / TikTok / LINE ได้ทันที</li>
            <li style={liStyle}>✅ ไม่ต้องมีผู้ติดตามเยอะก็เริ่มได้</li>
            <li style={liStyle}>✅ ยิ่งแชร์ ยิ่งมีโอกาสสร้างรายได้</li>
          </ul>
        </div>

        <div
          className="creator-promo-banner__cta"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <a
            href={href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              color: "#ee4d2d",
              borderRadius: 999,
              padding: "12px 20px",
              fontWeight: 900,
              fontSize: 15,
              boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
              textDecoration: "none",
              transition: "transform 0.18s ease, box-shadow 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 14px 30px rgba(0,0,0,0.22)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 10px 24px rgba(0,0,0,0.18)";
            }}
          >
            สมัครครีเอเตอร์ <span aria-hidden="true">→</span>
          </a>

          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "rgba(255,255,255,0.95)",
            }}
          >
            ฟรี ไม่มีค่าสมัคร
          </span>
        </div>
      </div>

      {/* desktop layout via CSS */}
      <style>{`
        @media (min-width: 720px) {
          .creator-promo-banner__inner {
            grid-template-columns: 1.4fr auto !important;
            gap: 28px !important;
          }
          .creator-promo-banner__title {
            font-size: 26px !important;
          }
        }
      `}</style>
    </section>
  );
}

const liStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  lineHeight: 1.45,
};

/* ----------------------------------------------------------- */
/* 2) Profile — explanation card ก่อนปุ่มสมัคร creator         */
/* ----------------------------------------------------------- */
export function CreatorBenefitsCard() {
  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, #fff7f5 0%, #fff1ee 60%, #ffe7df 100%)",
        border: "1px solid #ffd0c5",
        borderRadius: 20,
        padding: 18,
        marginBottom: 14,
        boxShadow: "0 8px 20px rgba(238,77,45,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "linear-gradient(135deg, #ee4d2d 0%, #ff7a3d 100%)",
            color: "#fff",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            boxShadow: "0 6px 14px rgba(238,77,45,0.25)",
          }}
        >
          ✨
        </span>
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: "#9a3412",
          }}
        >
          เมื่อสมัครสำเร็จ คุณจะสามารถ:
        </div>
      </div>

      <ul
        style={{
          margin: 0,
          padding: 0,
          listStyle: "none",
          display: "grid",
          gap: 8,
          color: "#7c2d12",
          fontWeight: 700,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <li style={benefitItem}>
          <span style={dotStyle}>•</span>
          <span>สร้างรีวิวเคสจริงของตัวเอง</span>
        </li>
        <li style={benefitItem}>
          <span style={dotStyle}>•</span>
          <span>ระบบสร้างใบปลิวให้อัตโนมัติ</span>
        </li>
        <li style={benefitItem}>
          <span style={dotStyle}>•</span>
          <span>แชร์โค้ดครีเอเตอร์ของคุณได้</span>
        </li>
        <li style={benefitItem}>
          <span style={dotStyle}>•</span>
          <span>รับคอมมิชชั่น 10% จากยอดขายผ่านรีวิว</span>
        </li>
        <li style={benefitItem}>
          <span style={dotStyle}>•</span>
          <span>มีหน้ารวมผลงานรีวิวของตัวเอง</span>
        </li>
      </ul>

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px dashed #fdba74",
          fontSize: 13,
          color: "#9a3412",
          fontWeight: 800,
        }}
      >
        ❤️ ยิ่งแชร์ ยิ่งมีโอกาสสร้างรายได้
      </div>
    </div>
  );
}

const benefitItem: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
};

const dotStyle: React.CSSProperties = {
  color: "#ea580c",
  fontWeight: 900,
  marginTop: 0,
  flexShrink: 0,
};

/* ----------------------------------------------------------- */
/* 3) Review CTA — โชว์ใต้รีวิวสินค้า                          */
/* ----------------------------------------------------------- */
export function ReviewBecomeCreatorCTA({
  href = "/profile",
}: {
  href?: string;
}) {
  return (
    <section
      aria-label="ชวนเป็นครีเอเตอร์"
      style={{
        marginTop: 18,
        background: "#fff",
        border: "1px solid #ffd9d1",
        borderLeft: "4px solid #ee4d2d",
        borderRadius: 16,
        padding: 18,
        boxShadow: "0 10px 24px rgba(238,77,45,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 22 }}>💡</span>
        <div
          style={{
            fontSize: 16,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          รีวิวของคุณก็ช่วยคนอื่นได้เช่นกัน
        </div>
      </div>

      <p
        style={{
          margin: 0,
          color: "#475569",
          fontSize: 14,
          lineHeight: 1.7,
        }}
      >
        หากคุณเคยใช้สินค้าและมีประสบการณ์จริง สามารถสมัครเป็นครีเอเตอร์
        เพื่อสร้างรีวิวและรับคอมมิชชั่น <b style={{ color: "#ee4d2d" }}>10%</b>{" "}
        จากยอดขายผ่านรีวิวของคุณ
      </p>

      <div
        style={{
          marginTop: 10,
          color: "#9a3412",
          fontWeight: 800,
          fontSize: 13.5,
        }}
      >
        เติบโตไปกับเรา ❤️
      </div>

      <a
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
          color: "#fff",
          borderRadius: 999,
          padding: "11px 20px",
          fontSize: 14.5,
          fontWeight: 900,
          textDecoration: "none",
          boxShadow: "0 10px 22px rgba(238,77,45,0.22)",
          transition: "transform 0.18s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        เริ่มเป็นครีเอเตอร์ <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

/* ----------------------------------------------------------- */
/* 4) Brochure Page CTA — ตอนล่างสุดของหน้า brochure           */
/* ----------------------------------------------------------- */
export function BrochureCreatorCTA({
  href = "/profile",
}: {
  href?: string;
}) {
  return (
    <section
      aria-label="ชวนเป็นครีเอเตอร์จากใบปลิว"
      style={{
        marginTop: 16,
        borderRadius: 20,
        padding: 18,
        background:
          "linear-gradient(135deg, #fff7ed 0%, #ffedd5 60%, #fed7aa 100%)",
        border: "1px solid #fdba74",
        boxShadow: "0 12px 28px rgba(234,88,12,0.10)",
      }}
    >
      <div
        style={{
          fontSize: 17,
          fontWeight: 900,
          color: "#7c2d12",
          marginBottom: 8,
          lineHeight: 1.4,
        }}
      >
        อยากมีรายได้จากการแชร์ประสบการณ์ดูแลแมว?
      </div>

      <p
        style={{
          margin: 0,
          color: "#9a3412",
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.7,
        }}
      >
        สมัครครีเอเตอร์กับ <b>fipcatcare.com</b>
        <br />
        ระบบจะช่วยสร้างใบปลิว รีวิว และลิงก์ขายให้อัตโนมัติ
      </p>

      <div
        style={{
          marginTop: 12,
          padding: "10px 12px",
          background: "rgba(255,255,255,0.7)",
          border: "1px dashed #fdba74",
          borderRadius: 12,
          fontSize: 13,
          color: "#7c2d12",
          fontWeight: 800,
        }}
      >
        โพสรูปใบปลิวผ่าน:
        <br />
        Facebook • TikTok • LINE • กลุ่มแมว
      </div>

      <a
        href={href}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          marginTop: 14,
          background: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
          color: "#fff",
          borderRadius: 999,
          padding: "11px 20px",
          fontSize: 14.5,
          fontWeight: 900,
          textDecoration: "none",
          boxShadow: "0 10px 22px rgba(238,77,45,0.22)",
        }}
      >
        🐾 สมัครครีเอเตอร์ <span aria-hidden="true">→</span>
      </a>
    </section>
  );
}

/* ----------------------------------------------------------- */
/* 5) Creator Finance — Tip Card                               */
/* ----------------------------------------------------------- */
export function CreatorFinanceTipsCard() {
  const tips: Array<{ icon: string; text: string }> = [
    { icon: "📸", text: "รีวิวที่มีภาพก่อน/หลัง มักมียอดสั่งสูงกว่า" },
    { icon: "📣", text: "แชร์ลงหลายกลุ่มช่วยเพิ่มโอกาสขาย" },
    { icon: "🧾", text: "ใช้ใบปลิวจากระบบช่วยปิดการขายได้ง่ายขึ้น" },
    { icon: "💬", text: "ตอบแชทไว ลูกค้าตัดสินใจง่ายขึ้น" },
  ];

  return (
    <section
      aria-label="เทคนิคเพิ่มรายได้สำหรับครีเอเตอร์"
      style={{
        background: "#fff",
        border: "1px solid #fde68a",
        borderRadius: 18,
        padding: 18,
        marginBottom: 16,
        boxShadow: "0 8px 22px rgba(234,179,8,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 18,
            boxShadow: "0 8px 16px rgba(234,88,12,0.20)",
          }}
        >
          💡
        </span>
        <div
          style={{
            fontSize: 17,
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          เทคนิคเพิ่มรายได้
        </div>
      </div>

      <div
        className="creator-tips-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
        }}
      >
        {tips.map((tip, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              gap: 10,
              padding: 12,
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 12,
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: 18 }}>{tip.icon}</span>
            <span
              style={{
                color: "#92400e",
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {tip.text}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @media (min-width: 720px) {
          .creator-tips-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/* ----------------------------------------------------------- */
/* 6) Quick Action Buttons — โชว์เมื่อ creator approved         */
/* ----------------------------------------------------------- */
export function CreatorQuickActions({
  brochureHref = "/orders",
  shareHref = "/creator/reviews",
  earningsHref = "/account/finance",
}: {
  brochureHref?: string;
  shareHref?: string;
  earningsHref?: string;
}) {
  const items: Array<{
    href: string;
    label: string;
    emoji: string;
    bg: string;
    color: string;
    border: string;
  }> = [
    {
      href: brochureHref,
      label: "สร้างใบปลิว",
      emoji: "🖼️",
      bg: "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
      color: "#fff",
      border: "transparent",
    },
    {
      href: shareHref,
      label: "แชร์รีวิว",
      emoji: "📣",
      bg: "#fff7ed",
      color: "#ea580c",
      border: "#fdba74",
    },
    {
      href: earningsHref,
      label: "ดูรายได้",
      emoji: "💰",
      bg: "#ecfdf5",
      color: "#047857",
      border: "#86efac",
    },
  ];

  return (
    <div
      className="creator-quick-actions"
      style={{
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 10,
      }}
    >
      {items.map((item) => (
        <a
          key={item.label}
          href={item.href}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            padding: "14px 8px",
            borderRadius: 16,
            background: item.bg,
            color: item.color,
            border: `1px solid ${item.border}`,
            fontWeight: 900,
            fontSize: 13,
            textDecoration: "none",
            textAlign: "center",
            minHeight: 78,
            transition: "transform 0.18s ease, box-shadow 0.18s ease",
            boxShadow: "0 6px 14px rgba(15,23,42,0.05)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 10px 22px rgba(15,23,42,0.10)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 6px 14px rgba(15,23,42,0.05)";
          }}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>{item.emoji}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </div>
  );
}
