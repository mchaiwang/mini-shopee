"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type OrderItem = {
  id?: string | number;
  name?: string;
  title?: string;
  qty?: number;
  quantity?: number;
  price?: number;
};

type Order = {
  id: string;
  userId?: string;
  ownerId?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  note?: string;
  items?: OrderItem[];
  total?: number;
  paymentMethod?: string;
  slip?: string;
  status?: string;
  createdAt?: string;
};

type Product = {
  id: number;
  name: string;
  slug?: string;
  image?: string;
  category?: string;
  price?: number;
};

type CurrentUser = {
  id?: string;
  email?: string;
  name?: string;
  displayName?: string;
  creatorDisplayName?: string; 
  role?: string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
  permissions?: {
    canSubmitReview?: boolean;
    canReceiveCommission?: boolean;
  };
  creatorPayment?: {
    promptPay?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
};

function CreatorNewReviewPageInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [title, setTitle] = useState("");
  const [adCaption, setAdCaption] = useState("");
  const [story, setStory] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [callToAction, setCallToAction] = useState("ซื้อจากลิงก์นี้");
  const [petType, setPetType] = useState("");
  const [petName, setPetName] = useState("");
  const [petAge, setPetAge] = useState("");
  const [petWeight, setPetWeight] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [day1Text, setDay1Text] = useState("");
  const [day3Text, setDay3Text] = useState("");
  const [day7Text, setDay7Text] = useState("");

  const orderProductOptions = useMemo(() => {
    if (!order?.items?.length) return [];

    return order.items.map((item, index) => {
      const rawId = item.id;
      const matchedProduct = products.find(
        (p) => String(p.id) === String(rawId)
      );

      return {
        key: `${rawId ?? "item"}-${index}`,
        productId: matchedProduct ? String(matchedProduct.id) : "",
        label:
          matchedProduct?.name ||
          item.name ||
          item.title ||
          `สินค้า ${index + 1}`,
      };
    });
  }, [order, products]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => String(p.id) === String(selectedProductId)) || null;
  }, [products, selectedProductId]);

  function isCreatorUser(user: CurrentUser | null) {
    if (!user) return false;

    return (
      user.creatorEnabled === true ||
      user.creatorStatus === "approved" ||
      user.permissions?.canSubmitReview === true
    );
  }

  const previewReviewLink = useMemo(() => {
    if (!selectedProduct?.slug) return "";
    return `/product/${selectedProduct.slug}?refReview=review-preview`;
  }, [selectedProduct]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const [authRes, ordersRes, productsRes] = await Promise.all([
          fetch("/api/auth/me", {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/orders", {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/products", {
            cache: "no-store",
            credentials: "include",
          }),
        ]);

        if (!authRes.ok) {
          alert("กรุณาเข้าสู่ระบบก่อน");
          window.location.href = "/login";
          return;
        }

        const authData = await authRes.json().catch(() => null);
        const me = authData?.user || null;
        setCurrentUser(me);

        if (!isCreatorUser(me)) {
          alert("หน้านี้สำหรับครีเอเตอร์ที่ได้รับสิทธิ์แล้ว");
          window.location.href = "/profile";
          return;
        }

        const ordersData = await ordersRes.json().catch(() => null);
        const allOrders: Order[] = Array.isArray(ordersData)
          ? ordersData
          : ordersData?.orders || [];

        const productsData = await productsRes.json().catch(() => null);
        const allProducts: Product[] = Array.isArray(productsData?.products)
          ? productsData.products
          : [];
        setProducts(allProducts);

        const foundOrder =
          allOrders.find((item) => String(item.id) === String(orderId)) || null;

        if (!foundOrder) {
          alert("ไม่พบออเดอร์ที่ต้องการรีวิว");
          window.location.href = "/orders";
          return;
        }

        const orderUserId = String(foundOrder.userId || foundOrder.ownerId || "");
        const meId = String(me?.id || "");

        const orderEmail = String(foundOrder.email || "")
          .trim()
          .toLowerCase();
        const meEmail = String(me?.email || "")
          .trim()
          .toLowerCase();

        const isOwner =
          (meId && orderUserId && meId === orderUserId) ||
          (meEmail && orderEmail && meEmail === orderEmail);

        if (!isOwner) {
          alert("คุณไม่มีสิทธิ์รีวิวออเดอร์นี้");
          window.location.href = "/orders";
          return;
        }

        if (
          foundOrder.status !== "จัดส่งแล้ว" &&
          foundOrder.status !== "สำเร็จแล้ว"
        ) {
          alert("สามารถรีวิวได้เฉพาะออเดอร์ที่จัดส่งแล้วหรือสำเร็จแล้ว");
          window.location.href = "/orders";
          return;
        }

        setOrder(foundOrder);

        const firstMatchedProductId =
          foundOrder.items
            ?.map((item) => {
              const matched = allProducts.find(
                (product) => String(product.id) === String(item.id)
              );
              return matched ? String(matched.id) : "";
            })
            .find(Boolean) || "";

        setSelectedProductId(firstMatchedProductId);
      } catch (error) {
        console.error(error);
        alert("โหลดหน้าสร้างรีวิวครีเอเตอร์ไม่สำเร็จ");
        window.location.href = "/orders";
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [orderId]);

  async function handleSubmit() {
    if (!order || !currentUser) return;

    if (!selectedProductId || !title.trim() || !story.trim()) {
      alert("กรุณากรอกข้อมูลสำคัญให้ครบ");
      return;
    }

    if (!selectedProduct?.slug) {
      alert("ไม่พบ slug ของสินค้า จึงยังสร้างลิงก์ซื้อไม่ได้");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        reviewType: "creator_video",
        orderId: order.id,
        productId: Number(selectedProductId),
        userId: currentUser.id || "",
        userEmail: currentUser.email || "",
        creatorName:
  currentUser.creatorDisplayName ||
  currentUser.displayName ||
  currentUser.name ||
  "ครีเอเตอร์",
        title: title.trim(),
        story: story.trim(),
        adCaption: adCaption.trim(),
        videoUrl: videoUrl.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        callToAction: callToAction.trim() || "ซื้อจากลิงก์นี้",
        productSlug: selectedProduct.slug,
        petType: petType.trim(),
        petName: petName.trim(),
        petAge: petAge.trim(),
        petWeight: petWeight.trim(),
        symptoms: symptoms
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        timeline: [
          { day: 1, text: day1Text.trim() },
          { day: 3, text: day3Text.trim() },
          { day: 7, text: day7Text.trim() },
        ].filter((item) => item.text),
      };

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "ส่งรีวิวไม่สำเร็จ");
        return;
      }

      alert("ส่งรีวิวครีเอเตอร์เรียบร้อยแล้ว");
      window.location.href = "/orders";
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการส่งรีวิว");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
        กำลังโหลดหน้าสร้างรีวิวครีเอเตอร์...
      </div>
    );
  }

  if (!currentUser || !order) {
    return null;
  }

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: 16 }}>
      <div
        style={{
          background:
            "linear-gradient(135deg, #7c3aed 0%, #a855f7 55%, #ec4899 100%)",
          borderRadius: 24,
          padding: 24,
          color: "#fff",
          boxShadow: "0 12px 28px rgba(168,85,247,0.22)",
          marginBottom: 22,
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 900,
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          สร้างรีวิวครีเอเตอร์
        </h1>
        <div style={{ marginTop: 8, fontSize: 16, opacity: 0.96 }}>
          รีวิวแบบคลิป + ลิงก์ซื้อสินค้าในระบบร้าน + คอมมิชชั่นอัตโนมัติ
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionTitleStyle}>ข้อมูลออเดอร์</div>
        <div style={{ color: "#334155", lineHeight: 1.9 }}>
          <div>
            <strong>หมายเลขออเดอร์:</strong> #{order.id}
          </div>
          <div>
            <strong>สถานะ:</strong> {order.status || "-"}
          </div>
          <div>
           <strong>ครีเอเตอร์:</strong>{" "}
{currentUser.creatorDisplayName ||
  currentUser.displayName ||
  currentUser.name ||
  "-"}
          </div>
          <div>
            <strong>พร้อมเพย์:</strong>{" "}
            {currentUser.creatorPayment?.promptPay || "-"}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionTitleStyle}>รายละเอียดรีวิวครีเอเตอร์</div>

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={labelStyle}>เลือกสินค้าที่ต้องการรีวิว</div>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- เลือกสินค้า --</option>
              {orderProductOptions.map((item) => (
                <option
                  key={item.key}
                  value={item.productId || item.key}
                  disabled={!item.productId}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={labelStyle}>หัวข้อรีวิว</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น แชร์เคสจริงหลังใช้งานต่อเนื่อง"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>คำโปรย / ประโยคโฆษณา</div>
            <input
              value={adCaption}
              onChange={(e) => setAdCaption(e.target.value)}
              placeholder="เช่น ดูเคสจริงก่อนตัดสินใจซื้อ"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>ลิงก์ mp4 หรือวิดีโอ</div>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="เช่น /uploads/reviews/review-001.mp4"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>รูปปก thumbnail</div>
            <input
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="เช่น /uploads/reviews/review-001.jpg"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>ข้อความบนปุ่มซื้อ</div>
            <input
              value={callToAction}
              onChange={(e) => setCallToAction(e.target.value)}
              placeholder="เช่น ซื้อจากลิงก์นี้"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>ลิงก์ซื้อที่จะสร้างให้อัตโนมัติ</div>
            <input
              value={previewReviewLink}
              readOnly
              placeholder="ระบบจะสร้างลิงก์ให้อัตโนมัติ"
              style={{
                ...inputStyle,
                background: "#f8fafc",
                color: "#475569",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <div style={labelStyle}>ประเภทสัตว์</div>
              <input
                value={petType}
                onChange={(e) => setPetType(e.target.value)}
                placeholder="เช่น แมว"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>ชื่อน้อง</div>
              <input
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="เช่น มูมู่"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>อายุ</div>
              <input
                value={petAge}
                onChange={(e) => setPetAge(e.target.value)}
                placeholder="เช่น 8 เดือน"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>น้ำหนัก</div>
              <input
                value={petWeight}
                onChange={(e) => setPetWeight(e.target.value)}
                placeholder="เช่น 3.1 กก."
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <div style={labelStyle}>อาการที่พบ (คั่นด้วย , )</div>
            <input
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="เช่น ซึม, ไม่กินอาหาร, น้ำในท้อง"
              style={inputStyle}
            />
          </div>

          <div>
            <div style={labelStyle}>เรื่องราวรีวิว / บทบรรยาย</div>
            <textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="เล่าประสบการณ์ใช้งานจริงและสิ่งที่อยากให้ผู้อ่านเข้าใจ"
              style={{
                ...inputStyle,
                minHeight: 150,
                resize: "vertical",
                paddingTop: 14,
                paddingBottom: 14,
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <div style={labelStyle}>ไทม์ไลน์ Day 1</div>
              <input
                value={day1Text}
                onChange={(e) => setDay1Text(e.target.value)}
                placeholder="อาการวันแรก"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>ไทม์ไลน์ Day 3</div>
              <input
                value={day3Text}
                onChange={(e) => setDay3Text(e.target.value)}
                placeholder="ผลที่เริ่มเห็น"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>ไทม์ไลน์ Day 7</div>
              <input
                value={day7Text}
                onChange={(e) => setDay7Text(e.target.value)}
                placeholder="สรุปการเปลี่ยนแปลง"
                style={inputStyle}
              />
            </div>
          </div>

          {selectedProduct ? (
            <div
              style={{
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fcfcfd",
                padding: 16,
                display: "flex",
                gap: 14,
                alignItems: "center",
              }}
            >
              <img
                src={selectedProduct.image || "/no-image.png"}
                alt={selectedProduct.name}
                style={{
                  width: 84,
                  height: 84,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                }}
              />
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {selectedProduct.name}
                </div>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  {selectedProduct.category || "-"}
                </div>
                <div style={{ color: "#64748b", marginTop: 4 }}>
                  slug: {selectedProduct.slug || "-"}
                </div>
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 6,
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                height: 52,
                padding: "0 20px",
                borderRadius: 16,
                border: "none",
                background: saving
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                color: "#fff",
                fontWeight: 900,
                fontSize: 17,
                cursor: saving ? "not-allowed" : "pointer",
                boxShadow: saving
                  ? "none"
                  : "0 12px 24px rgba(168,85,247,0.18)",
              }}
            >
              {saving ? "กำลังส่งรีวิว..." : "ส่งรีวิวครีเอเตอร์"}
            </button>

            <a
              href="/orders"
              style={{
                height: 52,
                padding: "0 20px",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#111827",
                fontWeight: 900,
                fontSize: 17,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              กลับไปหน้าออเดอร์
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreatorNewReviewPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <CreatorNewReviewPageInner />
    </Suspense>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef2f6",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  marginBottom: 16,
  color: "#0f172a",
};

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#0f172a",
  marginBottom: 8,
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