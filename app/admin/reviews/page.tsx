"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ReviewSlide = {
  key?: string;
  img?: string;
  text?: string;
};

type ReviewRecord = {
  id: string;
  userId?: string;
  productId?: number | string;
  productIds?: Array<number | string>;
  title?: string;
  slug?: string;
  category?: string;
  creatorName?: string;
  customerName?: string;
  reviewType?: string;
  slides?: ReviewSlide[];
  productBundleName?: string;
  verifiedPurchase?: boolean;
  status?: "pending" | "published" | "rejected" | string;
  views?: number;
  clicks?: number;
  ordersCount?: number;
  commissionTotal?: number;
  commissionRate?: number;
  commissionOwnerUserId?: string;
  reviewLink?: string;
  createdAt?: string;
  updatedAt?: string;
  orderId?: string;
  rating?: number;
  headline?: string;
  shortDescription?: string;
  problem?: string;
  method?: string;
  result?: string;
  disclaimer?: string;
};

function formatThaiDate(date?: string) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString("th-TH");
  } catch {
    return "-";
  }
}

function renderStars(rating?: number) {
  const safe = Math.max(0, Math.min(5, Number(rating || 0)));
  return "★".repeat(safe) + "☆".repeat(5 - safe);
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadReviews = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reviews", { cache: "no-store" });
      const data = await res.json();
      const nextReviews = Array.isArray(data?.reviews) ? data.reviews : [];
      setReviews(nextReviews);
    } catch (error) {
      console.error("loadReviews error:", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const q = keyword.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchStatus =
        statusFilter === "all" ? true : String(review.status || "") === statusFilter;

      const haystack = [
        review.id,
        review.title,
        review.creatorName,
        review.customerName,
        review.category,
        review.productBundleName,
        review.slug,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchKeyword = q ? haystack.includes(q) : true;

      return matchStatus && matchKeyword;
    });
  }, [reviews, keyword, statusFilter]);

  const handleDeleteReview = async (review: ReviewRecord) => {
    const ok = window.confirm(
      `ต้องการลบรีวิวนี้ใช่ไหม?\n\n${review.title || review.id}\n\nเมื่อลบแล้วจะไม่แสดงในระบบ`
    );
    if (!ok) return;

    try {
      setDeletingId(review.id);

      const res = await fetch(`/api/reviews?id=${encodeURIComponent(review.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "ลบรีวิวไม่สำเร็จ");
      }

      setReviews((prev) => prev.filter((item) => item.id !== review.id));
      alert("ลบรีวิวเรียบร้อยแล้ว");
    } catch (error: any) {
      console.error("delete review error:", error);
      alert(error?.message || "เกิดข้อผิดพลาดในการลบรีวิว");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "32px auto", padding: "0 16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 40, fontWeight: 800, margin: 0 }}>จัดการรีวิว</h1>
          <p style={{ marginTop: 8, color: "#6b7280", fontSize: 18 }}>
            ตรวจสอบรูปรีวิว ดูโบร์ชัวร์ และลบรีวิวที่ไม่ต้องการ
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

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 16,
          marginBottom: 18,
          display: "grid",
          gridTemplateColumns: "1.4fr 220px 180px",
          gap: 12,
        }}
      >
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="ค้นหาจากชื่อรีวิว, creator, หมวด, รหัสรีวิว"
          style={inputStyle}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="all">ทุกสถานะ</option>
          <option value="published">published</option>
          <option value="pending">pending</option>
          <option value="rejected">rejected</option>
        </select>

        <button onClick={loadReviews} style={primaryButton}>
          รีเฟรช
        </button>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          padding: 16,
          marginBottom: 18,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <StatBox label="ทั้งหมด" value={reviews.length} />
        <StatBox
          label="published"
          value={reviews.filter((r) => r.status === "published").length}
        />
        <StatBox
          label="pending"
          value={reviews.filter((r) => r.status === "pending").length}
        />
        <StatBox
          label="rejected"
          value={reviews.filter((r) => r.status === "rejected").length}
        />
        <StatBox label="หลังกรอง" value={filteredReviews.length} />
      </div>

      {loading ? (
        <div style={emptyBox}>กำลังโหลดรีวิว...</div>
      ) : filteredReviews.length === 0 ? (
        <div style={emptyBox}>ไม่พบรีวิว</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {filteredReviews.map((review) => {
            const cover = review.slides?.[0]?.img || "/no-image.png";

            return (
              <div
                key={review.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "220px minmax(0, 1fr)",
                    gap: 0,
                  }}
                >
                  <div
                    style={{
                      background: "#f3f4f6",
                      minHeight: 220,
                      position: "relative",
                    }}
                  >
                    <img
                      src={cover}
                      alt={review.title || review.id}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </div>

                  <div style={{ padding: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 24,
                            fontWeight: 800,
                            color: "#111827",
                            marginBottom: 8,
                          }}
                        >
                          {review.title || "-"}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            marginBottom: 8,
                          }}
                        >
                          <Badge text={`ID: ${review.id}`} />
                          <Badge text={`สถานะ: ${review.status || "-"}`} />
                          <Badge text={`ดาว: ${renderStars(review.rating)}`} />
                          {review.verifiedPurchase ? (
                            <Badge text="ซื้อจริง" tone="green" />
                          ) : null}
                        </div>

                        <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.8 }}>
                          <div>Creator: {review.creatorName || "-"}</div>
                          <div>ลูกค้า: {review.customerName || "-"}</div>
                          <div>หมวด: {review.category || "-"}</div>
                          <div>สินค้า: {review.productBundleName || "-"}</div>
                          <div>สร้างเมื่อ: {formatThaiDate(review.createdAt)}</div>
                          <div>อัปเดตล่าสุด: {formatThaiDate(review.updatedAt)}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link href={`/brochure/${review.id}`} style={darkButton}>
                          ดูโบร์ชัวร์
                        </Link>

                        {review.reviewLink ? (
                          <Link href={review.reviewLink} style={ghostButton}>
                            ดูหน้าสินค้า
                          </Link>
                        ) : null}

                        <button
                          onClick={() => handleDeleteReview(review)}
                          disabled={deletingId === review.id}
                          style={{
                            ...dangerButton,
                            opacity: deletingId === review.id ? 0.7 : 1,
                            cursor: deletingId === review.id ? "not-allowed" : "pointer",
                          }}
                        >
                          {deletingId === review.id ? "กำลังลบ..." : "ลบรีวิวนี้"}
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: 12,
                        marginTop: 14,
                      }}
                    >
                      <InfoCard
                        title="คำอธิบายสั้น"
                        text={
                          review.shortDescription ||
                          review.headline ||
                          review.slides?.[0]?.text ||
                          "-"
                        }
                      />
                      <InfoCard
                        title="ปัญหา"
                        text={review.problem || review.slides?.[1]?.text || "-"}
                      />
                      <InfoCard
                        title="ผลลัพธ์"
                        text={review.result || review.slides?.[4]?.text || "-"}
                      />
                    </div>

                    {Array.isArray(review.slides) && review.slides.length > 0 ? (
                      <div
                        style={{
                          marginTop: 14,
                          display: "grid",
                          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        {review.slides.slice(0, 5).map((slide, index) => (
                          <div
                            key={`${review.id}-${slide.key || index}`}
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 12,
                              overflow: "hidden",
                              background: "#fff",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                aspectRatio: "1 / 1",
                                background: "#f3f4f6",
                              }}
                            >
                              <img
                                src={slide.img || "/no-image.png"}
                                alt={slide.text || `slide-${index + 1}`}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            </div>

                            <div
                              style={{
                                padding: 8,
                                fontSize: 12,
                                lineHeight: 1.5,
                                color: "#4b5563",
                                minHeight: 54,
                              }}
                            >
                              {slide.text || `ภาพที่ ${index + 1}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        minWidth: 140,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#111827" }}>{value}</div>
    </div>
  );
}

function Badge({
  text,
  tone = "gray",
}: {
  text: string;
  tone?: "gray" | "green";
}) {
  const styles =
    tone === "green"
      ? {
          color: "#166534",
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
        }
      : {
          color: "#374151",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
        };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        fontWeight: 700,
        ...styles,
      }}
    >
      {text}
    </span>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div
      style={{
        background: "#fafafa",
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 46,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  padding: "0 14px",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};

const primaryButton: React.CSSProperties = {
  height: 46,
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  fontSize: 15,
  cursor: "pointer",
};

const darkButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
};

const ghostButton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#111827",
  fontWeight: 700,
  fontSize: 14,
};

const dangerButton: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
};

const emptyBox: React.CSSProperties = {
  background: "#fff",
  border: "1px dashed #d1d5db",
  borderRadius: 18,
  padding: "36px 20px",
  textAlign: "center",
  color: "#6b7280",
  fontSize: 18,
};