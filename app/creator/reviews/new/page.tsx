"use client";

import { Suspense, ChangeEvent, useEffect, useMemo, useState } from "react";
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
  payoutAccount?: {
    promptPay?: string;
    accountName?: string;
    bankName?: string;
    accountNumber?: string;
    status?: string;
  };
  creatorPayment?: {
    promptPay?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
};

type ReviewSlide = {
  key: string;
  img: string;
  text: string;
};

type CreatorReview = {
  id: string;
  userId?: string;
  productId?: number;
  productIds?: number[];
  title?: string;
  creatorName?: string;
  reviewType?: string;
  reviewLink?: string;
  callToAction?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  slides?: ReviewSlide[];
};

type SlideForm = {
  key: string;
  label: string;
  image: string;
  text: string;
  uploading: boolean;
};

type ReviewTitleItem = {
  id: string;
  label: string;
  active: boolean;
  sortOrder?: number;
};

const BASE_SLIDES: SlideForm[] = [
  {
    key: "before",
    label: "ภาพที่ 1 : ก่อนรักษา",
    image: "",
    text: "",
    uploading: false,
  },
  {
    key: "problem",
    label: "ภาพที่ 2 : อาการ / ปัญหา",
    image: "",
    text: "",
    uploading: false,
  },
  {
    key: "step",
    label: "ภาพที่ 3 : วิธีดูแล / วิธีใช้",
    image: "",
    text: "",
    uploading: false,
  },
  {
    key: "result",
    label: "ภาพที่ 4 : ผลลัพธ์ระหว่างทาง",
    image: "",
    text: "",
    uploading: false,
  },
  {
    key: "after",
    label: "ภาพที่ 5 : หลังดีขึ้น / หลังหาย",
    image: "",
    text: "",
    uploading: false,
  },
];

function createEmptySlides(): SlideForm[] {
  return BASE_SLIDES.map((item) => ({ ...item }));
}

function normalizeReviewTitles(input: any): ReviewTitleItem[] {
  const rawItems = Array.isArray(input)
    ? input
    : Array.isArray(input?.items)
    ? input.items
    : Array.isArray(input?.reviewTitles)
    ? input.reviewTitles
    : [];

  return rawItems
    .map((item: any, index: number) => ({
      id: String(item?.id || `review-title-${index}`),
      label: String(item?.label || "").trim(),
      active:
        typeof item?.active === "boolean"
          ? item.active
          : String(item?.status || "").toLowerCase() !== "inactive",
      sortOrder:
        typeof item?.sortOrder === "number"
          ? item.sortOrder
          : Number(item?.sortOrder || 0),
    }))
    .filter((item: ReviewTitleItem) => item.label);
}

function CreatorNewReviewPageInner() {
  const searchParams = useSearchParams();
 const reviewId = searchParams.get("reviewId") || "";
const orderId = searchParams.get("orderId") || "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMyReviews, setLoadingMyReviews] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [myReviews, setMyReviews] = useState<CreatorReview[]>([]);
  const [reviewTitles, setReviewTitles] = useState<ReviewTitleItem[]>([]);

  const [editingReviewId, setEditingReviewId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<SlideForm[]>(createEmptySlides());

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
    return (
      products.find((p) => String(p.id) === String(selectedProductId)) || null
    );
  }, [products, selectedProductId]);

  const activeReviewTitles = useMemo(() => {
    return reviewTitles
      .filter((item) => item.active)
      .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
  }, [reviewTitles]);

  function isCreatorUser(user: CurrentUser | null) {
    if (!user) return false;

    return (
      user.creatorEnabled === true ||
      user.creatorStatus === "approved" ||
      user.permissions?.canSubmitReview === true
    );
  }

  function buildReviewLink(
    product: Product | null | undefined,
    reviewId?: string
  ) {
    if (!product?.slug) return "";
    if (!reviewId) return `/product/${product.slug}`;
    return `/product/${product.slug}?refReview=${reviewId}`;
  }

  function resetForm() {
    setEditingReviewId("");
    setTitle("");
    setSlides(createEmptySlides());

    const firstMatchedProductId =
      order?.items
        ?.map((item) => {
          const matched = products.find(
            (product) => String(product.id) === String(item.id)
          );
          return matched ? String(matched.id) : "";
        })
        .find(Boolean) || "";

    setSelectedProductId(firstMatchedProductId);
  }

  function updateSlide(index: number, field: "image" | "text", value: string) {
    setSlides((prev) =>
      prev.map((slide, i) =>
        i === index ? { ...slide, [field]: value } : slide
      )
    );
  }

  function setSlideUploading(index: number, uploading: boolean) {
    setSlides((prev) =>
      prev.map((slide, i) => (i === index ? { ...slide, uploading } : slide))
    );
  }

  async function uploadImageFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success || !data?.url) {
      throw new Error(data?.message || "อัปโหลดรูปไม่สำเร็จ");
    }

    return String(data.url);
  }

  async function handleSelectImage(
    index: number,
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSlideUploading(index, true);
      const url = await uploadImageFile(file);
      updateSlide(index, "image", url);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setSlideUploading(index, false);
      e.target.value = "";
    }
  }

  function fillFormFromReview(review: CreatorReview) {
    setEditingReviewId(review.id || "");
    setTitle(review.title || "");

    const pid =
      String(review.productId || "") ||
      String(review.productIds?.[0] || "");
    setSelectedProductId(pid);

    const nextSlides = createEmptySlides().map((base, index) => {
      const source = review.slides?.[index];
      return {
        ...base,
        image: source?.img || "",
        text: source?.text || "",
      };
    });

    setSlides(nextSlides);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadMyReviews(userId: string) {
    try {
      setLoadingMyReviews(true);

      const res = await fetch("/api/reviews", {
        cache: "no-store",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);
      const allReviews: CreatorReview[] = Array.isArray(data?.reviews)
        ? data.reviews
        : [];

      const mine = allReviews
        .filter((item) => String(item.userId || "") === String(userId))
        .filter((item) => item.reviewType === "creator_slide")
        .sort((a, b) => {
          const aTime = new Date(a.createdAt || 0).getTime();
          const bTime = new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });

      setMyReviews(mine);
    } catch (error) {
      console.error(error);
      setMyReviews([]);
    } finally {
      setLoadingMyReviews(false);
    }
  }

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const [authRes, ordersRes, productsRes, reviewTitlesRes, reviewsRes] =
          await Promise.all([
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
            fetch("/api/review-titles", {
              cache: "no-store",
              credentials: "include",
            }),
            fetch("/api/reviews", {
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
          alert("หน้านี้สำหรับครีเอเตอร์ที่ได้รับอนุมัติแล้ว");
          window.location.href = "/orders";
          return;
        }

        const ordersData = await ordersRes.json().catch(() => null);
        const allOrders: Order[] = Array.isArray(ordersData)
          ? ordersData
          : Array.isArray(ordersData?.orders)
          ? ordersData.orders
          : [];

        const productsData = await productsRes.json().catch(() => null);
        const allProducts: Product[] = Array.isArray(productsData?.products)
          ? productsData.products
          : Array.isArray(productsData)
          ? productsData
          : [];
        setProducts(allProducts);

        const reviewTitlesData = await reviewTitlesRes.json().catch(() => null);
        const normalizedTitles = normalizeReviewTitles(reviewTitlesData);
        setReviewTitles(normalizedTitles);

        const reviewsData = await reviewsRes.json().catch(() => null);
        const allReviews: CreatorReview[] = Array.isArray(reviewsData?.reviews)
          ? reviewsData.reviews
          : [];

        if (reviewId) {
          const foundReview =
            allReviews.find((item) => String(item.id) === String(reviewId)) ||
            null;

          if (!foundReview) {
            alert("ไม่พบรีวิวที่ต้องการแก้ไข");
            window.location.href = "/account/finance";
            return;
          }

          if (me?.id && String(foundReview.userId || "") !== String(me.id)) {
            alert("คุณไม่มีสิทธิ์แก้ไขรีวิวนี้");
            window.location.href = "/account/finance";
            return;
          }

          fillFormFromReview(foundReview);
          setEditingReviewId(foundReview.id);

          setOrder({
            id: foundReview.id,
            userId: foundReview.userId || "",
            ownerId: foundReview.userId || "",
            items: [
              {
                id: foundReview.productId || foundReview.productIds?.[0] || "",
              },
            ],
            status: "สำเร็จแล้ว",
          } as Order);

          setSelectedProductId(
            String(foundReview.productId || foundReview.productIds?.[0] || "")
          );
        } else if (orderId) {
          const foundOrder =
            allOrders.find((item) => String(item.id) === String(orderId)) ||
            null;

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
          setEditingReviewId("");

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
        } else {
          alert("ไม่พบข้อมูลสำหรับสร้างหรือแก้ไขรีวิว");
          window.location.href = "/orders";
          return;
        }

        if (me?.id) {
          await loadMyReviews(String(me.id));
        }
      } catch (error) {
        console.error(error);
        alert("โหลดหน้าสร้างรีวิวครีเอเตอร์ไม่สำเร็จ");
        window.location.href = "/orders";
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [reviewId, orderId]);

  async function handleDeleteReview(reviewId: string) {
    const confirmed = window.confirm("ต้องการลบรีวิวนี้ใช่ไหม");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "ลบรีวิวไม่สำเร็จ");
        return;
      }

      if (editingReviewId === reviewId) {
        resetForm();
      }

      if (currentUser?.id) {
        await loadMyReviews(String(currentUser.id));
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบรีวิว");
    }
  }

  async function handleSubmit() {
    if (!order || !currentUser) return;

    if (!selectedProductId) {
      alert("กรุณาเลือกสินค้าที่ต้องการรีวิว");
      return;
    }

    if (!title.trim()) {
      alert("กรุณาเลือกหัวข้อรีวิว");
      return;
    }

    const hasEmptySlide = slides.some(
      (slide) => !slide.image.trim() || !slide.text.trim()
    );

    if (hasEmptySlide) {
      alert("กรุณากรอกรูปและข้อความให้ครบทั้ง 5 หัวข้อ");
      return;
    }

    try {
      setSaving(true);

      const product = products.find(
        (p) => String(p.id) === String(selectedProductId)
      );

      const payload = {
        id: editingReviewId || undefined,
        reviewType: "creator_slide",
        orderId: order.id,
        productId: Number(selectedProductId),
        userId: currentUser.id || "",
        userEmail: currentUser.email || "",
        title: title.trim(),
        creatorName:
          currentUser.creatorDisplayName ||
          currentUser.displayName ||
          currentUser.name ||
          currentUser.email ||
          "ครีเอเตอร์",
          creatorCode:
  String((currentUser as any).creatorCode || "").trim(),
        slides: slides.map((slide) => ({
          key: slide.key,
          img: slide.image.trim(),
          text: slide.text.trim(),
        })),
        callToAction: "ซื้อจากรีวิวนี้",
        reviewLink: buildReviewLink(product),
      };

      const isEditing = Boolean(editingReviewId);

      const res = await fetch("/api/reviews", {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "บันทึกรีวิวไม่สำเร็จ");
        return;
      }

      alert(isEditing ? "แก้ไขรีวิวเรียบร้อยแล้ว" : "ส่งรีวิวเรียบร้อยแล้ว");

      resetForm();

      if (currentUser?.id) {
        await loadMyReviews(String(currentUser.id));
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการบันทึกรีวิว");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
        กำลังโหลดหน้าสร้างรีวิวครีเอเตอร์...
      </div>
    );
  }

  if (!currentUser || !order) {
    return null;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: 16 }}>
      <div style={heroStyle}>
        <h1 style={heroTitleStyle}>
          {editingReviewId ? "แก้ไขรีวิว 5 ภาพ" : "สร้างรีวิว 5 ภาพ"}
        </h1>
        <div style={heroSubTitleStyle}>
          อัปโหลดรูปจากเครื่องได้ทันที และใช้ชื่อปุ่มซื้อแบบตายตัวในระบบ
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
            {currentUser.payoutAccount?.promptPay ||
              currentUser.creatorPayment?.promptPay ||
              "-"}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionTitleStyle}>
          {editingReviewId ? "แก้ไขรีวิวของฉัน" : "สร้างรีวิวใหม่"}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
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
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- เลือกหัวข้อรีวิว --</option>
              {activeReviewTitles.map((item) => (
                <option key={item.id} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div style={hintBoxStyle}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>
              โครงสร้างภาพรีวิวมาตรฐาน
            </div>
            <div>1. ก่อนรักษา</div>
            <div>2. อาการ / ปัญหา</div>
            <div>3. วิธีดูแล / วิธีใช้</div>
            <div>4. ผลลัพธ์ระหว่างทาง</div>
            <div>5. หลังดีขึ้น / หลังหาย</div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            {slides.map((slide, index) => (
              <div key={slide.key} style={slideCardStyle}>
                <div style={slideTitleStyle}>{slide.label}</div>

                <div style={slideGridStyle}>
                  <div>
                    <div style={labelStyle}>ข้อความบรรยายบนสไลด์</div>
                    <input
                      value={slide.text}
                      onChange={(e) =>
                        updateSlide(index, "text", e.target.value)
                      }
                      placeholder="เช่น 7 วันเริ่มดีขึ้น"
                      style={inputStyle}
                      maxLength={80}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        marginTop: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <label style={uploadButtonStyle}>
                        {slide.uploading ? "กำลังอัปโหลด..." : "เลือกรูปจากเครื่อง"}
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) => handleSelectImage(index, e)}
                          disabled={slide.uploading}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => updateSlide(index, "image", "")}
                        style={miniGhostButtonStyle}
                      >
                        ลบรูป
                      </button>
                    </div>
                  </div>

                  <div>
                    {slide.image ? (
                      <img
                        src={slide.image}
                        alt={slide.label}
                        style={previewImageStyle}
                      />
                    ) : (
                      <div style={emptyPreviewStyle}>ยังไม่มีรูป</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedProduct ? (
            <div style={productCardStyle}>
              <img
                src={selectedProduct.image || "/no-image.png"}
                alt={selectedProduct.name}
                style={productImageStyle}
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

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleSubmit}
              disabled={saving}
              style={{
                ...primaryButtonStyle,
                background: saving
                  ? "#cbd5e1"
                  : "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                boxShadow: saving
                  ? "none"
                  : "0 12px 24px rgba(168,85,247,0.18)",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "กำลังบันทึก..."
                : editingReviewId
                ? "บันทึกการแก้ไข"
                : "ส่งรีวิวครีเอเตอร์"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              style={secondaryButtonStyle}
            >
              ล้างฟอร์ม
            </button>

            <a href="/orders" style={linkButtonStyle}>
              กลับไปหน้าออเดอร์
            </a>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={sectionTitleStyle}>รีวิวของฉัน</div>

        {loadingMyReviews ? (
          <div style={emptyBoxStyle}>กำลังโหลดรีวิวของครีเอเตอร์...</div>
        ) : myReviews.length === 0 ? (
          <div style={emptyBoxStyle}>ยังไม่มีรีวิวของครีเอเตอร์คนนี้</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {myReviews.map((review) => {
              const linkedProduct = products.find(
                (p) =>
                  String(p.id) ===
                  String(review.productId || review.productIds?.[0] || "")
              );

              return (
                <div key={review.id} style={myReviewCardStyle}>
                  <div style={myReviewTopStyle}>
                    <div>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 18,
                          color: "#0f172a",
                        }}
                      >
                        {review.title || "-"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          marginTop: 6,
                          fontSize: 14,
                        }}
                      >
                        สินค้า: {linkedProduct?.name || "-"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          marginTop: 4,
                          fontSize: 13,
                        }}
                      >
                        สถานะ: {review.status || "-"} • วันที่:{" "}
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString("th-TH")
                          : "-"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => fillFormFromReview(review)}
                        style={miniEditButtonStyle}
                      >
                        แก้ไข
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteReview(review.id)}
                        style={miniDeleteButtonStyle}
                      >
                        ลบ
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                      gap: 10,
                      marginTop: 14,
                    }}
                  >
                    {(review.slides || []).map((slide, index) => (
                      <div key={`${review.id}-${slide.key}-${index}`}>
                        <div style={miniPreviewWrapStyle}>
                          <img
                            src={slide.img || "/no-image.png"}
                            alt={slide.text || `slide-${index + 1}`}
                            style={miniPreviewImageStyle}
                          />
                        </div>
                        <div style={miniPreviewTextStyle}>
                          {slide.text || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
export default function CreatorNewReviewPage() {
  return (
    <Suspense fallback={<div style={{padding:20}}>Loading...</div>}>
      <CreatorNewReviewPageInner />
    </Suspense>
  );
}

const heroStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 55%, #ec4899 100%)",
  borderRadius: 24,
  padding: 24,
  color: "#fff",
  boxShadow: "0 12px 28px rgba(168,85,247,0.22)",
  marginBottom: 22,
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  margin: 0,
  lineHeight: 1.15,
};

const heroSubTitleStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 16,
  opacity: 0.96,
};

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

const hintBoxStyle: React.CSSProperties = {
  borderRadius: 18,
  background: "#fff7ed",
  border: "1px solid #fdba74",
  padding: 16,
  color: "#9a3412",
  lineHeight: 1.8,
};

const slideCardStyle: React.CSSProperties = {
  borderRadius: 20,
  border: "1px solid #e5e7eb",
  background: "#fcfcfd",
  padding: 16,
};

const slideTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 18,
  color: "#0f172a",
  marginBottom: 14,
};

const slideGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1.05fr",
  gap: 14,
  alignItems: "start",
};

const uploadButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "none",
  background: "#ee4d2d",
  color: "#fff",
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const miniGhostButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #dbe4ee",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
};

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  height: 220,
  objectFit: "cover",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  display: "block",
  background: "#fff",
};

const emptyPreviewStyle: React.CSSProperties = {
  width: "100%",
  height: 220,
  borderRadius: 14,
  border: "1px dashed #cbd5e1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  background: "#f8fafc",
};

const productCardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#fcfcfd",
  padding: 16,
  display: "flex",
  gap: 14,
  alignItems: "center",
};

const productImageStyle: React.CSSProperties = {
  width: 84,
  height: 84,
  objectFit: "cover",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 52,
  padding: "0 20px",
  borderRadius: 16,
  border: "none",
  color: "#fff",
  fontWeight: 900,
  fontSize: 17,
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 52,
  padding: "0 20px",
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  fontWeight: 900,
  fontSize: 17,
  cursor: "pointer",
};

const linkButtonStyle: React.CSSProperties = {
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
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px dashed #d5d9e0",
  borderRadius: 16,
  padding: 20,
  color: "#64748b",
  background: "#fff",
};

const myReviewCardStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  background: "#fff",
  padding: 16,
};

const myReviewTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const miniEditButtonStyle: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const miniDeleteButtonStyle: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const miniPreviewWrapStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "4 / 5",
  borderRadius: 12,
  overflow: "hidden",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const miniPreviewImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const miniPreviewTextStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: "#334155",
  marginTop: 6,
};