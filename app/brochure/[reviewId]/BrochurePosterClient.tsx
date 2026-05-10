"use client";

import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import QRCode from "react-qr-code";
import { BrochureCreatorCTA } from "@/app/components/creator-promo";
import { useToast } from "@/app/components/ToastProvider";

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
  descriptionLong: string;
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

function getCurrentPageUrl() {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function buildShareText(headline: string, creatorCode: string, currentUrl: string) {
  return [
    "ลองดูรีวิวนี้",
    headline,
    "",
    "เข้าเว็บ:",
    "https://fipcatcare.com",
    "",
    "พิมพ์รหัส:",
    creatorCode,
    "",
    currentUrl,
  ].join("\n");
}

function openNewWindow(url: string) {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
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
  const { showToast } = useToast();

  const captureRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showProductPage, setShowProductPage] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);


  const copyCurrentLink = async (successText = "✅ คัดลอกลิงก์แล้ว") => {
    const currentUrl = getCurrentPageUrl();

    if (!currentUrl) {
      showToast("error", "ไม่พบลิงก์สำหรับแชร์");
      return false;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = currentUrl;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        input.style.top = "-9999px";
        document.body.appendChild(input);
        input.focus();
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }

      showToast("success", successText);
      return true;
    } catch (error) {
      console.error("copy link error:", error);
      showToast("error", "คัดลอกลิงก์ไม่สำเร็จ");
      return false;
    }
  };

  const handleNativeShare = async () => {
    const currentUrl = getCurrentPageUrl();
    const shareText = buildShareText(headline, creatorCode, currentUrl);

    try {
      if (navigator?.share) {
        await navigator.share({
          title: headline || "ใบปลิวรีวิว",
          text: shareText,
          url: currentUrl,
        });
        return;
      }

      await copyCurrentLink("คัดลอกลิงก์แล้ว สามารถนำไปแชร์ต่อได้ครับ");
    } catch (error: any) {
      if (error?.name === "AbortError") return;
      console.error("native share error:", error);
      await copyCurrentLink("คัดลอกลิงก์แล้ว สามารถนำไปแชร์ต่อได้ครับ");
    }
  };

  const handleShareLine = () => {
    const currentUrl = getCurrentPageUrl();
    const shareText = buildShareText(headline, creatorCode, currentUrl);
    openNewWindow(`https://line.me/R/share?text=${encodeURIComponent(shareText)}`);
  };

  const handleShareFacebook = () => {
    const currentUrl = getCurrentPageUrl();
    openNewWindow(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`
    );
  };

  const handleShareMessenger = () => {
    const currentUrl = getCurrentPageUrl();

    try {
      window.location.href = `fb-messenger://share/?link=${encodeURIComponent(currentUrl)}`;

      window.setTimeout(() => {
        copyCurrentLink("คัดลอกลิงก์แล้ว หาก Messenger ไม่เปิด ให้วางลิงก์ได้เลยครับ");
      }, 1200);
    } catch (error) {
      console.error("messenger share error:", error);
      copyCurrentLink("คัดลอกลิงก์แล้ว สามารถนำไปส่งใน Messenger ได้ครับ");
    }
  };

  const handleDownloadQr = () => {
    const svg = document.getElementById("brochure-share-qr");

    if (!svg) {
      showToast("error", "ไม่พบ QR สำหรับดาวน์โหลด");
      return;
    }

    try {
      const serializer = new XMLSerializer();
      const svgText = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgText], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 900;
        canvas.height = 900;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          URL.revokeObjectURL(svgUrl);
          showToast("error", "ดาวน์โหลด QR ไม่สำเร็จ");
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 90, 90, 720, 720);

        const link = document.createElement("a");
        link.download = `qr-brochure-${Date.now()}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        URL.revokeObjectURL(svgUrl);
        showToast("success", "ดาวน์โหลด QR แล้ว");
      };

      image.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        showToast("error", "ดาวน์โหลด QR ไม่สำเร็จ");
      };

      image.src = svgUrl;
    } catch (error) {
      console.error("download qr error:", error);
      showToast("error", "ดาวน์โหลด QR ไม่สำเร็จ");
    }
  };

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
      showToast("error", "สร้างไฟล์ JPG ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const handleBuyFromReview = () => {
    if (!productInfo?.id || !productInfo?.name) {
      showToast("error", "ไม่พบข้อมูลสินค้าที่เชื่อมกับใบปลิวนี้");
      return;
    }

    try {
      setAddingToCart(true);

      const refReview =
        String(productInfo.reviewId || "").trim() ||
        extractRefReviewFromLink(productInfo.reviewLink);

      if (!refReview) {
        showToast("error", "ไม่พบรหัสใบปลิวสำหรับผูกคอมมิชชั่น");
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
      showToast("error", "เพิ่มสินค้าลงตะกร้าไม่สำเร็จ");
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

        <div
          style={{
            width: "100%",
            maxWidth: 720,
            display: "flex",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap",
            padding: "4px 0 2px",
          }}
        >
          <button
            type="button"
            onClick={handleNativeShare}
            style={{
              border: "none",
              background: "#8b5cf6",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(139,92,246,0.24)",
            }}
          >
            📲 แชร์เลย
          </button>

          <button
            type="button"
            onClick={handleShareLine}
            style={{
              border: "none",
              background: "#22c55e",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(34,197,94,0.24)",
            }}
          >
            🟢 LINE
          </button>

          <button
            type="button"
            onClick={handleShareFacebook}
            style={{
              border: "none",
              background: "#1877f2",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(24,119,242,0.24)",
            }}
          >
            🔵 Facebook
          </button>

          <button
            type="button"
            onClick={handleShareMessenger}
            style={{
              border: "none",
              background: "#06b6d4",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(6,182,212,0.24)",
            }}
          >
            💬 Messenger
          </button>

          <button
            type="button"
            onClick={() => copyCurrentLink()}
            style={{
              border: "none",
              background: "#6b7280",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(107,114,128,0.24)",
            }}
          >
            📋 คัดลอกลิงก์
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            style={{
              border: "none",
              background: "#111827",
              color: "#fff",
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              boxShadow: "0 8px 18px rgba(17,24,39,0.24)",
            }}
          >
            🔳 QR
          </button>
        </div>

        <button
          onClick={() => setShowProductPage((v) => !v)}
style={{
  background: "linear-gradient(135deg,#f97316,#ea580c)",
  color: "#fff",
  border: "none",
  padding: "12px 18px",
  borderRadius: 999,
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 8px 18px rgba(249,115,22,0.28)",
}}
        >
          {showProductPage ? "↩ กลับหน้าใบปลิว" : "📘 ข้อมูลสินค้าที่ใช้ในใบปลิว"}
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
           <div
  style={{
    marginTop: 10,
    fontSize: 20,
    fontWeight: 900,
    textAlign: "center",
  }}
>
  🔎 เข้าเว็บ <span style={{ color: "#16a34a" }}>fipcatcare.com</span><br />
  พิมพ์รหัสนี้ 👉 <span style={{ color: "#dc2626" }}>{creatorCode}</span>
</div>
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
              {productInfo?.name || "สินค้าที่ใช้ในใบปลิวนี้"}
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

            {productInfo?.descriptionLong ? (
  <div
    style={{
      marginTop: 12,
      color: "#0f172a",
      lineHeight: 1.65,
      fontWeight: 700,
      whiteSpace: "pre-line",
    }}
  >
    {productInfo.descriptionLong}
  </div>
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
              {addingToCart ? "กำลังหยิบลงตะกร้า..." : "🛒 ซื้อจากใบปลิวนี้"}
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
    marginTop: 12,
    textAlign: "center",
    color: "#065f46",
    lineHeight: 1.6,
  }}
>
  เข้าที่เว็บไซต์ fipcatcare.com<br />
  แล้วพิมพ์รหัส <span style={{ color: "#dc2626" }}>{creatorCode}</span>
  <br />
</div>
        </div>
      </div>

      {showQrModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15,23,42,0.62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onClick={() => setShowQrModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 380,
              background: "#fff",
              borderRadius: 28,
              padding: 22,
              textAlign: "center",
              boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
              border: "1px solid #e5e7eb",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 54,
                height: 54,
                borderRadius: 18,
                background: "#111827",
                color: "#fff",
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              🔳
            </div>

            <h3
              style={{
                margin: "0 0 6px",
                fontSize: 22,
                lineHeight: 1.25,
                color: "#111827",
                fontWeight: 900,
              }}
            >
              QR ใบปลิวรีวิว
            </h3>

            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                fontWeight: 800,
                lineHeight: 1.55,
                marginBottom: 16,
              }}
            >
              สแกนแล้วเข้าหน้านี้ทันที พร้อมรหัสครีเอเตอร์ {creatorCode}
            </div>

            <div
              style={{
                display: "inline-flex",
                padding: 16,
                background: "#fff",
                borderRadius: 22,
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
              }}
            >
              <QRCode
                id="brochure-share-qr"
                value={getCurrentPageUrl() || "https://fipcatcare.com"}
                size={220}
                level="M"
              />
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 18,
              }}
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{
                  border: "none",
                  background: "#e5e7eb",
                  color: "#111827",
                  borderRadius: 999,
                  padding: "11px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ปิด
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                style={{
                  border: "none",
                  background: "#111827",
                  color: "#fff",
                  borderRadius: 999,
                  padding: "11px 18px",
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: "0 10px 22px rgba(17,24,39,0.22)",
                }}
              >
                ดาวน์โหลด QR
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* CTA ชวนสมัครครีเอเตอร์ — ตอนล่างสุดของหน้าใบปลิว */}
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          margin: "16px auto 0",
        }}
      >
        <BrochureCreatorCTA href="/profile" />
      </div>
    </div>
  );
}
