"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";

type TileItem = {
  image: string;
  label: string;
};

type ProductInfo = {
  id?: string | number;
  category?: string;
  stock?: number;

  slug?: string;
  name: string;
  image: string;
  price: number;
  shortDescription: string;
  descriptionLong: string[];
  careNote: string;
  reviewLink: string;
  reviewId: string;
  creatorName?: string;
};
function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

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

function extractRefReviewFromLink(link?: string) {
  if (!link) return "";

  try {
    const url = new URL(link, window.location.origin);
    return String(url.searchParams.get("refReview") || "").trim();
  } catch {
    return "";
  }
}

export default function BrochurePosterClient({
  headline,
  tiles,
  creatorCode = "1124",
  productInfo,
}: {
  headline: string;
  tiles: TileItem[];
  creatorCode?: string;
  productInfo?: ProductInfo;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showProductPage, setShowProductPage] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  const handleSaveImage = async () => {
    if (!captureRef.current || saving) return;

    try {
      setSaving(true);

      const canvas = await html2canvas(captureRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f4f4f5",
      });

      const link = document.createElement("a");
      link.download = `brochure-${Date.now()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch (error) {
      console.error("save jpg error:", error);
      alert("สร้างไฟล์ JPG ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleBuyFromReview = () => {
    if (!productInfo?.id || !productInfo?.name) {
      alert("ไม่พบข้อมูลสินค้าที่เชื่อมกับรีวิวนี้");
      return;
    }

    try {
      setAddingToCart(true);

      const refReview =
        String(productInfo.reviewId || "").trim() ||
        extractRefReviewFromLink(productInfo.reviewLink);

      if (!refReview) {
        alert("ไม่พบรหัสรีวิวสำหรับผูกคอมมิชชั่น");
        return;
      }

      const cartKey = getCartStorageKey();
      const rawCart = localStorage.getItem(cartKey);
      const currentCart = rawCart ? JSON.parse(rawCart) : [];
      const cart = Array.isArray(currentCart) ? currentCart : [];

      const nextItem = {
        id: productInfo.id,
        slug: productInfo.slug || "",
        name: productInfo.name,
        price: Number(productInfo.price || 0),
        image: productInfo.image || "/no-image.png",
        category: productInfo.category || "",
        stock: Number(productInfo.stock || 0),
        shortDescription: productInfo.shortDescription || "",
        qty: 1,
        refReview,
        creatorName: productInfo.creatorName || "ครีเอเตอร์",
      };

      const foundIndex = cart.findIndex((item: any) => {
        return (
          String(item?.id) === String(nextItem.id) &&
          String(item?.refReview || "") === String(refReview)
        );
      });

      if (foundIndex >= 0) {
        cart[foundIndex] = {
          ...cart[foundIndex],
          qty: Number(cart[foundIndex]?.qty || 0) + 1,
          refReview,
          creatorName: nextItem.creatorName,
        };
      } else {
        cart.push(nextItem);
      }

      localStorage.setItem(cartKey, JSON.stringify(cart));
      localStorage.setItem("refReview", refReview);
      localStorage.setItem(
        "reviewAttribution",
        JSON.stringify({
          refReview,
          reviewId: refReview,
          reviewLink: productInfo.reviewLink || "",
          creatorName: productInfo.creatorName || "",
          savedAt: new Date().toISOString(),
        })
      );

      window.dispatchEvent(new Event("storage"));
      window.location.href = "/?fromCartAdd=1";
    } catch (error) {
      console.error("buyFromReview error:", error);
      alert("เพิ่มสินค้าลงตะกร้าไม่สำเร็จ");
    } finally {
      setAddingToCart(false);
    }
  };

  const safeTiles = Array.isArray(tiles) ? tiles.slice(0, 6) : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e5e7eb",
        padding: "20px 12px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto 16px",
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleSaveImage}
          disabled={saving}
          style={{
            border: "none",
            background: saving ? "#9ca3af" : "#16a34a",
            color: "#fff",
            borderRadius: 999,
            padding: "12px 22px",
            fontSize: 16,
            fontWeight: 800,
            cursor: saving ? "not-allowed" : "pointer",
            boxShadow: "0 8px 18px rgba(22,163,74,0.22)",
          }}
        >
          {saving ? "กำลังสร้าง JPG..." : "📸 บันทึกเป็นใบปลิว JPG"}
        </button>

        <button
          onClick={() => setShowProductPage((v) => !v)}
          style={{
            background: "#111827",
            color: "#fff",
            border: "none",
            padding: "12px 18px",
            borderRadius: 999,
            fontWeight: 900,
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(17,24,39,0.18)",
          }}
        >
          {showProductPage ? "↩ กลับหน้ารีวิว" : "📘 ข้อมูลสินค้าที่ใช้ในรีวิว"}
        </button>
      </div>

      <div
        ref={captureRef}
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "0 auto",
          background: "linear-gradient(180deg, #ecfdf5 0%, #ffffff 18%)",
          borderRadius: 24,
          padding: 16,
          boxShadow: "0 16px 40px rgba(0,0,0,0.12)",
          border: "1px solid #bbf7d0",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
            border: "1px solid #bbf7d0",
            borderRadius: 20,
            padding: "16px 18px",
            marginBottom: 14,
            color: "#065f46",
            boxShadow: "0 8px 20px rgba(16,185,129,0.12)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "#dcfce7",
              border: "1px solid #86efac",
              color: "#166534",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 900,
              marginBottom: 10,
            }}
          >
            💚 เคสจริง มีแนวทางดูแล
          </div>

          <div
            style={{
              fontSize: 30,
              lineHeight: 1.22,
              fontWeight: 900,
              color: "#064e3b",
              textAlign: "center",
              wordBreak: "break-word",
            }}
          >
            {headline}
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 15,
              lineHeight: 1.55,
              color: "#047857",
              fontWeight: 800,
            }}
          >
            www.fipแมว.com
          </div>
        </div>

        {!showProductPage ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
            }}
          >
            {safeTiles.map((item, index) => {
              const isProduct = index === 5;

              return (
                <div
                  key={`${item.image}-${item.label}-${index}`}
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    overflow: "hidden",
                    border: isProduct
                      ? "2px solid #f59e0b"
                      : "1px solid #e5e7eb",
                    boxShadow: isProduct
                      ? "0 10px 24px rgba(245,158,11,0.18)"
                      : "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      background: isProduct ? "#fff7ed" : "#f9fafb",
                      minHeight: 250,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 8,
                    }}
                  >
                    <img
                      src={item.image || "/no-image.png"}
                      alt={item.label}
                      style={{
                        width: "100%",
                        height: 230,
                        objectFit: "contain",
                        objectPosition: "center",
                        display: "block",
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        background: isProduct ? "#f59e0b" : "#065f46",
                        color: "#fff",
                        borderRadius: 999,
                        padding: "5px 10px",
                        fontSize: 12,
                        fontWeight: 900,
                        boxShadow: "0 6px 14px rgba(0,0,0,0.18)",
                      }}
                    >
                      {isProduct ? "สินค้าแนะนำ" : `STEP ${index + 1}`}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "10px 10px 12px",
                      borderTop: "1px solid #f3f4f6",
                      background: "#fff",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 20,
                        lineHeight: 1.25,
                        fontWeight: 900,
                        color: "#111827",
                        textAlign: "center",
                        minHeight: 50,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        wordBreak: "break-word",
                      }}
                    >
                      {index + 1}. {item.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: "#fff",
              borderRadius: 22,
              padding: 20,
              border: "1px solid #fed7aa",
              boxShadow: "0 10px 24px rgba(245,158,11,0.12)",
            }}
          >
            <img
              src={productInfo?.image || "/no-image.png"}
              alt={productInfo?.name || "product"}
              style={{
                width: "100%",
                maxHeight: 320,
                objectFit: "contain",
                borderRadius: 16,
                background: "#fff",
              }}
            />

            <h2
              style={{
                fontSize: 28,
                lineHeight: 1.25,
                margin: "16px 0 8px",
                color: "#111827",
              }}
            >
              {productInfo?.name || "สินค้าที่ใช้ในรีวิว"}
            </h2>

            <div
              style={{
                fontWeight: 900,
                fontSize: 28,
                marginBottom: 12,
                color: "#ee4d2d",
              }}
            >
              ฿{Number(productInfo?.price || 0).toLocaleString()}
            </div>

            <p
              style={{
                color: "#334155",
                fontSize: 15,
                lineHeight: 1.7,
                fontWeight: 700,
              }}
            >
              {productInfo?.shortDescription || ""}
            </p>

            {productInfo?.descriptionLong?.length ? (
              <ul
                style={{
                  paddingLeft: 20,
                  color: "#0f172a",
                  lineHeight: 1.65,
                  fontWeight: 700,
                }}
              >
                {productInfo.descriptionLong.map((x, i) => (
                  <li key={`${x}-${i}`}>{x}</li>
                ))}
              </ul>
            ) : null}

            {productInfo?.careNote ? (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 16,
                  color: "#9a3412",
                  fontWeight: 800,
                  lineHeight: 1.6,
                }}
              >
                {productInfo.careNote}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleBuyFromReview}
              disabled={addingToCart}
              style={{
                display: "inline-block",
                marginTop: 18,
                background: addingToCart ? "#9ca3af" : "#ee4d2d",
                color: "#fff",
                padding: "12px 18px",
                borderRadius: 999,
                fontWeight: 900,
                border: "none",
                cursor: addingToCart ? "not-allowed" : "pointer",
                boxShadow: addingToCart
                  ? "none"
                  : "0 10px 20px rgba(238,77,45,0.18)",
              }}
            >
              {addingToCart ? "กำลังหยิบลงตะกร้า..." : "🛒 ซื้อจากรีวิวนี้"}
            </button>
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            padding: "14px 16px",
            textAlign: "center",
            background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)",
            border: "1px solid #bbf7d0",
            boxShadow: "0 8px 20px rgba(16,185,129,0.12)",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: "#065f46",
              marginBottom: 4,
            }}
          >
            ยังมีโอกาสดีขึ้นได้ครับ 💚
          </div>

          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#065f46",
              fontWeight: 700,
            }}
          >
            เข้าเว็บ &quot;fipแมว.com&quot; ค้นหาคำว่า &quot;
            {creatorCode || "1124"}&quot;
            <br />
            เพื่อดูประสบการณ์และแนวทางดูแลจากเคสจริงเพิ่มเติม
          </div>
        </div>
      </div>
    </div>
  );
}
