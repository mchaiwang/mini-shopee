"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  images?: string[];
  shortDescription: string;
  descriptionLong?: string;
  careNote?: string;
  category: string;
  stock: number;
  reviewUrl?: string;
};

type CartItem = Product & {
  qty: number;
};

type ReviewRecord = {
  id: string;
  userId: string;
  title: string;
  slug: string;
  category: string;
  petProfile?: {
    name?: string;
    type?: string;
    age?: string;
    weight?: string;
  };
  story?: string;
  productIds?: number[];
  status?: "pending" | "published" | "rejected";
  reviewLink?: string;
  callToAction?: string;
  adCaption?: string;
  createdAt?: string;
  updatedAt?: string;
  rating?: number;
  orderId?: string;
  reviewType?: string;
  resultSummary?: string;
  usedDays?: string;
  creatorName?: string;
  customerName?: string;
};

type ProductReview = {
  id: string;
  orderId?: string;
  productId?: number | string;
  productName?: string;
  userId?: string;
  userName?: string;
  rating?: number;
  usage?: string;
  quality?: string;
  shipping?: string;
  comment?: string;
  images?: string[];
  verifiedPurchase?: boolean;
  likes?: number;
  createdAt?: string;
};

function getCookieValue(name: string) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
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

function formatThaiDate(date?: string) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("th-TH");
  } catch {
    return "-";
  }
}

function renderStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating || 0)));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function ProductSlugPageInner() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(640);

  const slugParam = decodeURIComponent(String(params?.slug || ""));
  const refReview = String(searchParams?.get("refReview") || "").trim();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState("");
  const [sourceReview, setSourceReview] = useState<ReviewRecord | null>(null);
  const [buyerReviews, setBuyerReviews] = useState<ProductReview[]>([]);
  const [reviewFilter, setReviewFilter] = useState("all");
  const [qty, setQty] = useState(1);

  const getProductImages = (item: Product | null) => {
    if (!item) return [];
    const list = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
    const merged = [...list];

    if (item.image && !merged.includes(item.image)) {
      merged.unshift(item.image);
    }

    return merged.filter(Boolean).slice(0, 6);
  };

  const loadProduct = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/products", { cache: "no-store" });
      const data = await res.json();

      const products: Product[] = Array.isArray(data?.products)
        ? data.products
        : [];

      const normalizedProducts = products.map((item) => {
        const imgs = Array.isArray(item.images) ? item.images.filter(Boolean) : [];
        const cover = imgs[0] || item.image || "/no-image.png";
        return {
          ...item,
          image: cover,
          images: imgs.length > 0 ? imgs : [cover],
        };
      });

      setAllProducts(normalizedProducts);

      const found =
        normalizedProducts.find(
          (item) =>
            decodeURIComponent(String(item.slug || "")).trim() === slugParam
        ) || null;

      setProduct(found);

      if (found) {
        const imgs = getProductImages(found);
        setSelectedImage(imgs[0] || found.image || "/no-image.png");
      }
    } catch (error) {
      console.error("loadProduct error:", error);
      setProduct(null);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSourceReview = async () => {
    if (!refReview) {
      setSourceReview(null);
      return;
    }

    try {
      const res = await fetch("/api/reviews", { cache: "no-store" });
      const data = await res.json();

      const reviews: ReviewRecord[] = Array.isArray(data?.reviews)
        ? data.reviews
        : [];

      const found =
        reviews.find((item) => String(item.id || "") === refReview) || null;

      setSourceReview(found);
    } catch (error) {
      console.error("loadSourceReview error:", error);
      setSourceReview(null);
    }
  };


const normalizeReviewText = (value?: string | number) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[()\[\]{}\"'“”‘’.,:;|/\\_-]/g, "");
};

const loadBuyerReviews = async (currentProduct: Product) => {
  try {
    const res = await fetch("/api/product-reviews", {
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    const reviews: ProductReview[] = Array.isArray(data?.reviews)
      ? data.reviews
      : [];

    const productId = normalizeReviewText(currentProduct.id);
    const productSlug = normalizeReviewText(currentProduct.slug);
    const productName = normalizeReviewText(currentProduct.name);

    const exactMatched = reviews.filter((review) => {
      const reviewProductId = normalizeReviewText(review.productId);
      const reviewProductName = normalizeReviewText(review.productName);

      return (
        reviewProductId === productId ||
        reviewProductId === productSlug ||
        reviewProductName === productName
      );
    });

    const softMatched =
      exactMatched.length > 0
        ? exactMatched
        : reviews.filter((review) => {
            const reviewProductName = normalizeReviewText(review.productName);

            if (!reviewProductName || !productName) return false;

            return (
              reviewProductName.includes(productName) ||
              productName.includes(reviewProductName)
            );
          });

    const finalMatched = softMatched.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    console.log("product review matching", {
      productId: currentProduct.id,
      productSlug: currentProduct.slug,
      productName: currentProduct.name,
      totalReviews: reviews.length,
      matchedReviews: finalMatched.length,
      reviews,
    });

    setBuyerReviews(finalMatched);
  } catch (error) {
    console.error("loadBuyerReviews error:", error);
    setBuyerReviews([]);
  }
};

  useEffect(() => {
    loadProduct();
  }, [slugParam]);

useEffect(() => {
  loadSourceReview();
}, [refReview]);

  useEffect(() => {
    if (!refReview) return;

    try {
      localStorage.setItem("refReview", refReview);
      localStorage.setItem(
        "reviewAttribution",
        JSON.stringify({
          refReview,
          reviewId: refReview,
          savedAt: new Date().toISOString(),
          source: "product-slug-page",
          productSlug: slugParam,
        })
      );
    } catch (error) {
      console.error("save refReview error:", error);
    }
  }, [refReview, slugParam]);

  useEffect(() => {
    setQty(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    loadBuyerReviews(product);
  }, [product?.id, product?.slug, product?.name]);
  const addToCart = (
    item: Product,
    redirectToHomeCart = false,
    quantityToAdd = qty
  ) => {
    try {
      const safeQty = Math.max(1, Number(quantityToAdd || 1));
      const cartKey = getCartStorageKey();
      const raw = localStorage.getItem(cartKey);
      const cart: CartItem[] = raw ? JSON.parse(raw) : [];

      const found = cart.find(
        (cartItem) => Number(cartItem.id) === Number(item.id)
      );

      let nextCart: CartItem[];

      if (found) {
        nextCart = cart.map((cartItem) =>
          Number(cartItem.id) === Number(item.id)
            ? { ...cartItem, qty: Number(cartItem.qty || 0) + safeQty }
            : cartItem
        );
      } else {
        nextCart = [...cart, { ...item, qty: safeQty }];
      }

      localStorage.setItem(cartKey, JSON.stringify(nextCart));

      if (redirectToHomeCart) {
        router.push("/?fromCartAdd=1");
        return;
      }

      alert("เพิ่มสินค้าลงตะกร้าแล้ว");
    } catch (error) {
      console.error("addToCart error:", error);
      alert("เพิ่มสินค้าไม่สำเร็จ");
    }
  };

  const buyNow = (item: Product) => {
    addToCart(item, false, qty);
    router.push("/checkout");
  };

  const productImages = useMemo(() => getProductImages(product), [product]);

  const creatorDisplayName = useMemo(() => {
    if (!sourceReview) return "";

    if (String(sourceReview.creatorName || "").trim()) {
      return String(sourceReview.creatorName).trim();
    }

    if (String(sourceReview.customerName || "").trim()) {
      return String(sourceReview.customerName).trim();
    }

    return "ผู้ใช้งาน";
  }, [sourceReview]);

  const reviewStats = useMemo(() => {
    const total = buyerReviews.length;
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const withMedia = buyerReviews.filter((item) => (item.images || []).length > 0).length;

    for (const review of buyerReviews) {
      const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 5))));
      counts[rating] += 1;
    }

    const sum = buyerReviews.reduce((acc, item) => acc + Number(item.rating || 0), 0);
    const average = total > 0 ? sum / total : Number(sourceReview?.rating || 5);

    return {
      total,
      counts,
      withMedia,
      average,
    };
  }, [buyerReviews, sourceReview]);

  const averageRating = useMemo(() => {
    return Number(reviewStats.average || 5);
  }, [reviewStats]);

  const filteredBuyerReviews = useMemo(() => {
    if (reviewFilter === "media") {
      return buyerReviews.filter((item) => (item.images || []).length > 0);
    }

    const ratingNumber = Number(reviewFilter);
    if (!Number.isNaN(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5) {
      return buyerReviews.filter(
        (item) => Math.round(Number(item.rating || 5)) === ratingNumber
      );
    }

    return buyerReviews;
  }, [buyerReviews, reviewFilter]);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((item) => Number(item.id) !== Number(product.id))
      .filter(
        (item) =>
          item.category === product.category ||
          String(item.name || "").toLowerCase().includes(String(product.category || "").toLowerCase())
      )
      .slice(0, 8);
  }, [allProducts, product]);

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f5f5",
          padding: "24px 12px 110px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 16,
              padding: 24,
            }}
          >
            กำลังโหลดสินค้า...
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f5f5",
          padding: "24px 12px 110px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#222",
                marginBottom: 10,
              }}
            >
              ไม่พบสินค้า
            </div>

            <div
              style={{
                color: "#666",
                marginBottom: 16,
                lineHeight: 1.7,
              }}
            >
              slug ที่ส่งมาไม่ตรงกับสินค้าในระบบ
            </div>

            <button
              onClick={() => router.push("/")}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "none",
                background: "#ee4d2d",
                color: "#fff",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              กลับหน้าร้าน
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f5f5",
        padding: "20px 12px 40px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 13,
            color: "#666",
            marginBottom: 14,
          }}
        >
          หน้าแรก &gt; {product.category || "สินค้า"} &gt; {product.name}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            onClick={() => router.push("/")}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#333",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← กลับหน้าร้าน
          </button>

          {refReview ? (
            <div
              style={{
                background: "#fff7e6",
                color: "#d46b08",
                border: "1px solid #ffd591",
                borderRadius: 999,
                padding: "10px 14px",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              มาจากลิงก์รีวิว: {refReview}
            </div>
          ) : null}
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(320px, 420px) minmax(0, 1fr)",
              gap: 0,
            }}
          >
            <section
              style={{
                padding: isMobile ? 14 : 20,
                borderRight: isMobile ? "none" : "1px solid #f2f2f2",
                borderBottom: isMobile ? "1px solid #f2f2f2" : "none",
                background: "#fff",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#fff",
                  marginBottom: 12,
                }}
              >
                <img
                  src={selectedImage || product.image || "/no-image.png"}
                  alt={product.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    background: "#fff",
                  }}
                />
              </div>

              {productImages.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(4, 1fr)"
                      : "repeat(5, 1fr)",
                    gap: isMobile ? 6 : 8,
                  }}
                >
                  {productImages.map((img, index) => (
                    <button
                      key={`${img}-${index}`}
                      onClick={() => setSelectedImage(img)}
                      style={{
                        padding: 0,
                        border:
                          selectedImage === img
                            ? "2px solid #ee4d2d"
                            : "1px solid #ddd",
                        borderRadius: 8,
                        overflow: "hidden",
                        background: "#fff",
                        cursor: "pointer",
                        aspectRatio: "1 / 1",
                        transition: "all 0.18s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 18px rgba(0,0,0,0.10)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <img
                        src={img}
                        alt={`${product.name}-${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </button>
                  ))}
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => router.push(`/chat/product/${product.id}`)}
                  style={{
                    height: 44,
                    padding: "0 18px",
                    borderRadius: 8,
                    border: "1px solid #1677ff",
                    background: "#eff6ff",
                    color: "#1677ff",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: 14,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 18px rgba(22,119,255,0.16)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  แชทปรึกษาเจ้าของสินค้า
                </button>

                {product.reviewUrl ? (
                  <a
                    href={product.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      height: 44,
                      padding: "0 18px",
                      borderRadius: 8,
                      border: "1px solid #f59e0b",
                      background: "#fff7ed",
                      color: "#d97706",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      fontWeight: 800,
                      fontSize: 14,
                      transition: "all 0.18s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow =
                        "0 8px 18px rgba(245,158,11,0.18)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    🔥 รีวิวขายดีจาก Shopee
                  </a>
                ) : null}
              </div>
            </section>

            <section style={{ padding: isMobile ? 14 : 24 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    background: "#ee4d2d",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 800,
                    padding: "4px 8px",
                    borderRadius: 4,
                  }}
                >
                  ร้านแนะนำ
                </span>

                <span
                  style={{
                    background: "#fff1ee",
                    color: "#ee4d2d",
                    border: "1px solid #ffd6cc",
                    borderRadius: 999,
                    padding: "5px 10px",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {product.category || "สินค้า"}
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? 18 : 24,
                  lineHeight: 1.4,
                  color: "#222",
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                {product.name}
              </h1>

              <div
                style={{
                  display: "flex",
                  gap: isMobile ? 10 : 18,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 14,
                  fontSize: isMobile ? 13 : 14,
                }}
              >
                <span style={{ color: "#ee4d2d", fontWeight: 800 }}>
                  {averageRating.toFixed(1)}
                </span>
                <span style={{ color: "#ee4d2d" }}>{renderStars(averageRating)}</span>
                <span style={{ color: "#666" }}>
                  รีวิว {reviewStats.total}
                </span>
                <span style={{ color: "#666" }}>
                  ขายแล้ว {Math.max(12, Number(product.id) * 3)}
                </span>
              </div>

              <div
                style={{
                  background: "#fafafa",
                  borderRadius: 8,
                  padding: isMobile ? "12px 14px" : "18px 20px",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "end",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: "#ee4d2d",
                    fontWeight: 900,
                    fontSize: isMobile ? 24 : 34,
                    lineHeight: 1,
                  }}
                >
                  ฿{Number(product.price || 0).toFixed(2)}
                </span>
              </div>

              {refReview ? (
                <div
                  style={{
                    marginBottom: 16,
                    background: "#f6ffed",
                    border: "1px solid #b7eb8f",
                    color: "#389e0d",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    lineHeight: 1.6,
                    fontWeight: 700,
                  }}
                >
                  ซื้อผ่านครีเอเตอร์: {creatorDisplayName}
                </div>
              ) : null}

              <div
                style={{
                  display: "grid",
                  gap: 14,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "120px 1fr",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div style={{ color: "#757575", paddingTop: 8 }}>การจัดส่ง</div>
                  <div
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#333",
                      background: "#fff",
                    }}
                  >
                    ส่งจากในประเทศ • ค่าส่งเริ่มต้น ฿0 - ฿39
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "120px 1fr",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: "#757575" }}>จำนวน</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        overflow: "hidden",
                        background: "#fff",
                      }}
                    >
                      <button
                        onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                        style={qtyButtonStyle}
                      >
                        -
                      </button>
                      <div
                        style={{
                          width: 52,
                          textAlign: "center",
                          fontWeight: 700,
                          fontSize: 15,
                        }}
                      >
                        {qty}
                      </div>
                      <button
                        onClick={() =>
                          setQty((prev) =>
                            Math.min(Math.max(1, Number(product.stock || 1)), prev + 1)
                          )
                        }
                        style={qtyButtonStyle}
                      >
                        +
                      </button>
                    </div>

                    <span style={{ color: "#757575", fontSize: 14 }}>
                      มีสินค้าทั้งหมด {product.stock} ชิ้น
                    </span>
                  </div>
                </div>
              </div>

              <section
                style={{
                  marginBottom: 24,
                  borderTop: "10px solid #fafafa",
                  paddingTop: 24,
                }}
              >
                <div
                  style={{
                    background: "#f7f7f7",
                    padding: "14px 18px",
                    fontWeight: 900,
                    fontSize: 22,
                    marginBottom: 18,
                    color: "#333",
                  }}
                >
                  รายละเอียดสินค้า
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "160px 1fr",
                    rowGap: 12,
                    columnGap: 18,
                    marginBottom: 22,
                    fontSize: 15,
                    lineHeight: 1.7,
                  }}
                >
                  <div style={{ color: "#888" }}>หมวดหมู่</div>
                  <div style={{ color: "#333" }}>{product.category || "-"}</div>

                  <div style={{ color: "#888" }}>คลังสินค้า</div>
                  <div style={{ color: "#333" }}>{product.stock} ชิ้น</div>
                </div>

                <div
                  style={{
                    lineHeight: 1.9,
                    fontSize: 15,
                    color: "#333",
                    whiteSpace: "pre-line",
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: 12,
                    padding: "16px 18px",
                  }}
                >
                  {product.descriptionLong || product.shortDescription || "-"}
                </div>

                {product.careNote ? (
                  <div
                    style={{
                      marginTop: 14,
                      lineHeight: 1.9,
                      fontSize: 15,
                      color: "#5b4638",
                      whiteSpace: "pre-line",
                      background: "#fff8ef",
                      border: "1px solid #ffe0bd",
                      borderRadius: 12,
                      padding: "16px 18px",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#c46e36",
                        marginBottom: 8,
                      }}
                    >
                      คำแนะนำการดูแล
                    </div>
                    {product.careNote}
                  </div>
                ) : null}
              </section>

              <div
                style={{
                  display: isMobile ? "grid" : "flex",
                  gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
                  gap: isMobile ? 8 : 12,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => addToCart(product, false)}
                  disabled={product.stock <= 0}
                  style={{
                    minWidth: isMobile ? 0 : 190,
                    width: "100%",
                    height: isMobile ? 44 : 48,
                    borderRadius: 8,
                    border: "1px solid #ee4d2d",
                    background: product.stock <= 0 ? "#f5f5f5" : "#fff1ee",
                    color: product.stock <= 0 ? "#aaa" : "#ee4d2d",
                    cursor: product.stock <= 0 ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    fontSize: isMobile ? 13 : 15,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (product.stock <= 0) return;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 10px 18px rgba(238,77,45,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {product.stock <= 0 ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
                </button>

                <button
                  onClick={() => buyNow(product)}
                  disabled={product.stock <= 0}
                  style={{
                    minWidth: isMobile ? 0 : 220,
                    width: "100%",
                    height: isMobile ? 44 : 48,
                    borderRadius: 8,
                    border: "none",
                    background: product.stock <= 0 ? "#d9d9d9" : "#ee4d2d",
                    color: "#fff",
                    cursor: product.stock <= 0 ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    fontSize: isMobile ? 13 : 15,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (product.stock <= 0) return;
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 22px rgba(238,77,45,0.24)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  ซื้อเลย
                </button>

                <button
                  onClick={() => router.push(`/chat/product/${product.id}`)}
                  style={{
                    minWidth: isMobile ? 0 : 150,
                    width: "100%",
                    gridColumn: isMobile ? "1 / span 2" : undefined,
                    height: isMobile ? 42 : 48,
                    borderRadius: 8,
                    border: "1px solid #1677ff",
                    background: "#eff6ff",
                    color: "#1677ff",
                    cursor: "pointer",
                    fontWeight: 800,
                    fontSize: isMobile ? 13 : 15,
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 12px 22px rgba(22,119,255,0.16)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  แชทปรึกษาเจ้าของสินค้า
                </button>
              </div>
            </section>
          </div>
        </div>

        {sourceReview ? (
          <section
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 20,
              marginBottom: 18,
              boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                background: "#fafafa",
                borderRadius: 4,
                padding: "12px 14px",
                fontWeight: 800,
                color: "#555",
                marginBottom: 16,
              }}
            >
              รีวิวจากเคสที่พาเข้ามาสินค้านี้
            </div>

            <div
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 16,
                background: "#fff",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: "#222",
                      marginBottom: 4,
                    }}
                  >
                    {creatorDisplayName}
                  </div>
                  <div
                    style={{
                      color: "#ee4d2d",
                      fontSize: 15,
                      letterSpacing: 1,
                      marginBottom: 4,
                    }}
                  >
                    {renderStars(Number(sourceReview.rating || 5))}
                  </div>
                  <div style={{ fontSize: 12, color: "#888" }}>
                    {formatThaiDate(sourceReview.createdAt)}
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#222",
                  marginBottom: 8,
                }}
              >
                {sourceReview.title}
              </div>

              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "#333",
                  marginBottom: sourceReview.resultSummary ? 10 : 0,
                }}
              >
                {sourceReview.resultSummary ||
                  sourceReview.adCaption ||
                  sourceReview.story ||
                  "-"}
              </div>

              {product.reviewUrl ? (
                <div style={{ marginTop: 12 }}>
                  <a
                    href={product.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none",
                      height: 42,
                      padding: "0 16px",
                      background: "#fff7ed",
                      color: "#d97706",
                      border: "1px solid #fdba74",
                      borderRadius: 8,
                      fontWeight: 800,
                    }}
                  >
                    ดูรีวิว
                  </a>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 20,
            marginBottom: 18,
            boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: "#222",
              marginBottom: 16,
            }}
          >
            คะแนนของสินค้า
          </div>

          <div
            style={{
              border: "1px solid #f5e7df",
              background: "#fffaf7",
              padding: 22,
              display: "grid",
              gridTemplateColumns: "150px 1fr",
              gap: 20,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#ee4d2d", fontSize: 34, fontWeight: 500 }}>
                {averageRating.toFixed(1)} <span style={{ fontSize: 18 }}>เต็ม 5</span>
              </div>
              <div style={{ color: "#ee4d2d", fontSize: 24, letterSpacing: 1 }}>
                {renderStars(averageRating)}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                { key: "all", label: `ทั้งหมด (${reviewStats.total})` },
                { key: "5", label: `5 ดาว (${reviewStats.counts[5]})` },
                { key: "4", label: `4 ดาว (${reviewStats.counts[4]})` },
                { key: "3", label: `3 ดาว (${reviewStats.counts[3]})` },
                { key: "2", label: `2 ดาว (${reviewStats.counts[2]})` },
                { key: "1", label: `1 ดาว (${reviewStats.counts[1]})` },
                { key: "media", label: `มีรูปภาพ (${reviewStats.withMedia})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setReviewFilter(tab.key)}
                  style={{
                    minHeight: 38,
                    padding: "0 18px",
                    background: reviewFilter === tab.key ? "#fff1ee" : "#fff",
                    border: reviewFilter === tab.key ? "1px solid #ee4d2d" : "1px solid #e5e7eb",
                    color: reviewFilter === tab.key ? "#ee4d2d" : "#333",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBuyerReviews.length === 0 ? (
            <div
              style={{
                border: "1px dashed #ddd",
                borderRadius: 8,
                padding: "24px 16px",
                color: "#777",
              }}
            >
              ยังไม่มีรีวิวจากผู้ซื้อสำหรับตัวกรองนี้
            </div>
          ) : (
            <div style={{ display: "grid" }}>
              {filteredBuyerReviews.map((review) => (
                <div
                  key={review.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px 1fr",
                    gap: 14,
                    padding: "22px 0",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      background: "linear-gradient(135deg,#ffd6cc,#fff1ee)",
                      display: "grid",
                      placeItems: "center",
                      color: "#ee4d2d",
                      fontWeight: 900,
                    }}
                  >
                    {String(review.userName || "ผู้ซื้อ").slice(0, 1).toUpperCase()}
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, color: "#333", marginBottom: 4 }}>
                      {review.userName || "ผู้ซื้อ"}
                    </div>
                    <div style={{ color: "#ee4d2d", letterSpacing: 1, marginBottom: 4 }}>
                      {renderStars(Number(review.rating || 5))}
                    </div>
                    <div style={{ color: "#888", fontSize: 12, marginBottom: 12 }}>
                      {formatThaiDate(review.createdAt)}
                      {review.verifiedPurchase ? " | ✓ ซื้อสินค้าจริง" : ""}
                    </div>

                    <div style={{ color: "#666", lineHeight: 1.8, marginBottom: 10 }}>
                      <div>การใช้งาน: {review.usage || "-"}</div>
                      <div>คุณภาพ: {review.quality || "-"}</div>
                      <div>การจัดส่ง: {review.shipping || "-"}</div>
                    </div>

                    <div style={{ color: "#222", lineHeight: 1.8, marginBottom: 12 }}>
                      {review.comment || "-"}
                    </div>

                    {(review.images || []).length > 0 ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                        {(review.images || []).slice(0, 8).map((img, index) => (
                          <img
                            key={`${review.id}-${index}`}
                            src={img}
                            alt={`review-${index + 1}`}
                            style={{
                              width: 82,
                              height: 82,
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        ))}
                      </div>
                    ) : null}

                    <div style={{ color: "#9ca3af", fontSize: 13 }}>
                      👍 {Number(review.likes || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 20,
            marginBottom: 18,
            boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              background: "#fafafa",
              borderRadius: 4,
              padding: "12px 14px",
              fontWeight: 800,
              color: "#555",
              marginBottom: 16,
            }}
          >
            ลูกค้ายังดูสินค้าเหล่านี้
          </div>

          {relatedProducts.length === 0 ? (
            <div
              style={{
                border: "1px dashed #ddd",
                borderRadius: 8,
                padding: "24px 16px",
                color: "#777",
              }}
            >
              ยังไม่มีสินค้าที่เกี่ยวข้อง
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 14,
              }}
            >
              {relatedProducts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => router.push(`/product/${item.slug}`)}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    overflow: "hidden",
                    background: "#fff",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = "#ee4d2d";
                    e.currentTarget.style.boxShadow =
                      "0 12px 24px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "#eee";
                    e.currentTarget.style.boxShadow =
                      "0 1px 2px rgba(0,0,0,0.03)";
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      background: "#fff",
                      borderBottom: "1px solid #f5f5f5",
                    }}
                  >
                    <img
                      src={item.image || "/no-image.png"}
                      alt={item.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        display: "block",
                        background: "#fff",
                      }}
                    />
                  </div>

                  <div style={{ padding: 12 }}>
                    <div
                      style={{
                        minHeight: 40,
                        color: "#222",
                        fontSize: 14,
                        lineHeight: 1.4,
                        marginBottom: 8,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {item.name}
                    </div>

                    <div
                      style={{
                        color: "#ee4d2d",
                        fontWeight: 800,
                        fontSize: 20,
                        marginBottom: 8,
                      }}
                    >
                      ฿{Number(item.price || 0).toFixed(2)}
                    </div>

                    <div
                      style={{
                        color: "#888",
                        fontSize: 12,
                      }}
                    >
                      คงเหลือ {item.stock}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

    </main>
  );
}

export default function ProductSlugPage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
      <ProductSlugPageInner />
    </Suspense>
  );
}

const qtyButtonStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  border: "none",
  background: "#fff",
  cursor: "pointer",
  fontSize: 20,
  lineHeight: 1,
};
