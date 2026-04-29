"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type Product = {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
  images?: string[];
  shortDescription: string;
  category: string;
  stock: number;
  reviewUrl?: string;
};

type CartItem = Product & {
  qty: number;
  refReview?: string;
  creatorName?: string;
};

type ReviewSlide = {
  key: string;
  img: string;
  text: string;
};

type ProductReview = {
  id: string;
  userId: string;
  title: string;
  slug: string;
  category: string;
  symptoms?: string[];
  petProfile?: {
    name?: string;
    type?: string;
    age?: string;
    weight?: string;
    creatorCode?: string;
  };
  productIds?: number[];
  productBundleName?: string;
  verifiedPurchase?: boolean;
  status?: "pending" | "published" | "rejected";
  views?: number;
  clicks?: number;
  ordersCount?: number;
  commissionTotal?: number;
  commissionRate?: number;
  commissionOwnerUserId?: string;
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
  creatorCode?: string;
  slides?: ReviewSlide[];
};

type ReviewFeedItem = {
  id: string;
  title: string;
  caption: string;
  productId: number;
  tag?: string;
  reviewLink?: string;
  slides: ReviewSlide[];
  creatorName?: string;
  creatorCode?: string;
searchText?: string;
};

function renderStars(rating: number) {
  const safeRating = Math.max(0, Math.min(5, rating));
  return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
}

function formatThaiDate(date?: string) {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("th-TH");
  } catch {
    return "-";
  }
}

function extractRefReviewFromLink(link?: string) {
  if (!link) return "";
  try {
    const full = link.startsWith("http")
      ? new URL(link)
      : new URL(link, "http://local.shop");
    return full.searchParams.get("refReview") || "";
  } catch {
    return "";
  }
}

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

function ProductReviewsSection({
  product,
  reviews,
}: {
  product: Product;
  reviews: ProductReview[];
}) {
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (
          reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
          totalReviews
        ).toFixed(1)
      : "0.0";

  return (
    <section
      style={{
        marginTop: 24,
        borderTop: "1px solid #f2f2f2",
        paddingTop: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#222",
              marginBottom: 6,
            }}
          >
            รีวิวจากลูกค้า
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#666",
            }}
          >
            {avgRating}/5 จาก {totalReviews} รีวิว สำหรับ {product.name}
          </div>
        </div>

        {product.reviewUrl ? (
          <a
            href={product.reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              background: "#ee4d2d",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            ดูรีวิวจาก Shopee
          </a>
        ) : (
          <div
            style={{
              background: "#f5f5f5",
              color: "#888",
              padding: "10px 14px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            ยังไม่มีลิงก์รีวิวภายนอก
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div
          style={{
            border: "1px dashed #ddd",
            borderRadius: 12,
            padding: "20px 16px",
            color: "#777",
            background: "#fff",
          }}
        >
          ยังไม่มีรีวิวของสินค้านี้
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 12,
          }}
        >
          {reviews.map((review, index) => {
            const displayName =
              String(review.creatorName || "").trim() ||
              String(review.customerName || "").trim() ||
              (review.petProfile?.name
                ? `เจ้าของน้อง${review.petProfile.name}`
                : `ลูกค้า ${review.userId?.slice(-4) || ""}`);

            return (
              <div
                key={`product-review-${review.id}-${index}`}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 14,
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
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
                      {displayName}
                    </div>

                    <div
                      style={{
                        color: "#ee4d2d",
                        fontSize: 15,
                        letterSpacing: 1,
                        marginBottom: 4,
                      }}
                    >
                      {renderStars(Number(review.rating || 5))}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "#888",
                        }}
                      >
                        {formatThaiDate(review.createdAt)}
                      </span>

                      {review.verifiedPurchase ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#16a34a",
                            background: "#f0fdf4",
                            border: "1px solid #bbf7d0",
                            borderRadius: 999,
                            padding: "3px 8px",
                          }}
                        >
                          ซื้อจริง
                        </span>
                      ) : null}

                      {review.petProfile?.type ? (
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#2563eb",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: 999,
                            padding: "3px 8px",
                          }}
                        >
                          {review.petProfile.type}
                        </span>
                      ) : null}
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
                  {review.title}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.7,
                    color: "#333",
                    marginBottom: review.resultSummary ? 8 : 0,
                  }}
                >
                  {review.resultSummary ||
                    review.adCaption ||
                    review.slides?.[0]?.text ||
                    "-"}
                </div>

                {review.resultSummary ? (
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: "#444",
                      background: "#fafafa",
                      border: "1px solid #eee",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}
                  >
                    <strong>สรุปผล:</strong> {review.resultSummary}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          fontSize: 13,
          color: "#777",
          lineHeight: 1.6,
        }}
      >
        รีวิวในส่วนนี้ดึงจากรีวิวที่ลูกค้าหรือครีเอเตอร์ส่งเข้ามาและได้รับการอนุมัติแล้ว
      </div>
    </section>
  );
}

export default function ShopClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didHydrateCartRef = useRef(false);
  const cartPersistReadyRef = useRef(false);
  const isMobile = useIsMobile(640);

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [reviewFeed, setReviewFeed] = useState<ReviewFeedItem[]>([]);
  const [showCartAddedBanner, setShowCartAddedBanner] = useState(false);
  const [cartAddedCreatorName, setCartAddedCreatorName] = useState("");
 const [reviewSearchInput, setReviewSearchInput] = useState("");
const [reviewSearch, setReviewSearch] = useState("");

const fromCartAdd = String(searchParams?.get("fromCartAdd") || "") === "1";

const prioritizedReviewFeed = useMemo(() => {
  const raw = reviewSearch.trim();
  const code = raw.replace(/\D/g, "").slice(0, 4);

  if (!raw) return reviewFeed;

  if (!/^\d{4}$/.test(code)) {
    return [];
  }

  return reviewFeed.filter((item) => {
    return String(item.creatorCode || "").trim() === code;
  });
}, [reviewFeed, reviewSearch]);

const searchResultText = useMemo(() => {
  const raw = reviewSearch.trim();
  const code = raw.replace(/\D/g, "").slice(0, 4);

  if (!raw) return "";

  if (!/^\d{4}$/.test(code)) {
    return "กรุณาใส่รหัสครีเอเตอร์ 4 หลักเท่านั้น";
  }

  if (prioritizedReviewFeed.length === 0) {
    return `ไม่พบรีวิวของรหัสครีเอเตอร์ "${code}"`;
  }

  return `พบรีวิวรหัสครีเอเตอร์ ${code} จำนวน ${prioritizedReviewFeed.length} รายการ`;
}, [reviewSearch, prioritizedReviewFeed]);

const getProductImages = (product: Product | null) => {
    if (!product) return [];
    const list = Array.isArray(product.images) ? product.images : [];
    const merged = [...list];

    if (product.image && !merged.includes(product.image)) {
      merged.unshift(product.image);
    }

    return merged.filter(Boolean).slice(0, 6);
  };

  const loadCartFromStorage = () => {
    try {
      const cartKey = getCartStorageKey();
      const savedCart = localStorage.getItem(cartKey);
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      const nextCart = Array.isArray(parsed)
        ? parsed.map((item) => ({
            ...item,
            qty: Number(item.qty || item.quantity || 1),
          }))
        : [];

      setCart(nextCart);
      didHydrateCartRef.current = true;
      return nextCart;
    } catch (error) {
      console.error("loadCartFromStorage error:", error);
      setCart([]);
      didHydrateCartRef.current = true;
      return [];
    }
  };

  const saveCartToStorage = (nextCart: CartItem[]) => {
    try {
      const cartKey = getCartStorageKey();
      localStorage.setItem(cartKey, JSON.stringify(nextCart));
    } catch (error) {
      console.error("saveCartToStorage error:", error);
    }
  };

  const loadProducts = async () => {
    const res = await fetch("/api/products", { cache: "no-store" });
    const data = await res.json();

    const normalized = Array.isArray(data.products)
      ? data.products.map((p: Product) => {
          const imgs = Array.isArray(p.images)
            ? p.images.filter(Boolean).slice(0, 6)
            : [];
          const cover = imgs[0] || p.image || "/no-image.png";

          return {
            ...p,
            image: cover,
            images: imgs.length > 0 ? imgs : [cover],
            reviewUrl: p.reviewUrl || "",
          };
        })
      : [];

    setProducts(normalized);
    return normalized;
  };

  const loadReviews = async () => {
    try {
      const res = await fetch("/api/reviews", { cache: "no-store" });
      const data = await res.json();
      const allReviews: ProductReview[] = Array.isArray(data?.reviews)
        ? data.reviews
        : [];

      const publishedReviews = allReviews.filter(
        (item) => item.status === "published"
      );

      setProductReviews(publishedReviews);

      const feedItems: ReviewFeedItem[] = publishedReviews
        .filter(
          (item) =>
            Array.isArray(item.productIds) &&
            item.productIds.length > 0 &&
            Array.isArray(item.slides) &&
            item.slides.length > 0
        )
        .map((item, index) => ({
          id: String(item.id || `review-${index}`),
          title: item.title || "รีวิวจากผู้ใช้จริง",
          caption:
            item.slides?.[0]?.text ||
            item.adCaption ||
            "กดเข้ามาดูประสบการณ์ใช้งานจากเคสจริง",
          productId: Number(item.productIds?.[0] || 0),
          tag: item.category || item.reviewType || "รีวิวจริง",
          reviewLink: `/brochure/${item.id}`,
          slides: Array.isArray(item.slides) ? item.slides.slice(0, 5) : [],
          creatorName:
            String(item.creatorName || "").trim() ||
            String(item.customerName || "").trim() ||
            (item.petProfile?.name
              ? `เจ้าของน้อง${item.petProfile.name}`
              : "ครีเอเตอร์"),
              creatorCode: String(item.creatorCode || "").trim(),
searchText: [
  item.id,
  item.title,
  item.category,
  item.productBundleName,
  item.creatorName,
  item.customerName,
  item.creatorCode,
  ...(item.slides || []).map((s) => s.text),
].filter(Boolean).join(" "),
        }))
        .filter((item) => item.productId > 0);

      setReviewFeed(feedItems);
    } catch (error) {
      console.error("loadReviews error:", error);
      setProductReviews([]);
      setReviewFeed([]);
    }
  };

  useEffect(() => {
    loadProducts();
    loadReviews();
    loadCartFromStorage();
  }, []);

  useEffect(() => {
    if (!didHydrateCartRef.current) return;

    if (!cartPersistReadyRef.current) {
      cartPersistReadyRef.current = true;
      return;
    }

    saveCartToStorage(cart);
  }, [cart]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const activeKey = getCartStorageKey();
      if (!e.key || e.key === activeKey) {
        loadCartFromStorage();
      }
    };

    const handleFocus = () => {
      loadCartFromStorage();
    };

    const handleAuthChanged = () => {
      cartPersistReadyRef.current = false;
      loadCartFromStorage();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("auth-changed", handleAuthChanged);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!fromCartAdd) return;

    loadCartFromStorage();
    setShowCartAddedBanner(true);

    const timer = window.setTimeout(() => {
      setShowCartAddedBanner(false);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [fromCartAdd]);

  const addToCart = (
    product: Product,
    options?: { refReview?: string; creatorName?: string }
  ) => {
    setCart((prev) => {
      const found = prev.find(
        (item) =>
          Number(item.id) === Number(product.id) &&
          String(item.refReview || "") === String(options?.refReview || "")
      );

      return found
        ? prev.map((item) =>
            Number(item.id) === Number(product.id) &&
            String(item.refReview || "") === String(options?.refReview || "")
              ? {
                  ...item,
                  qty: Number(item.qty || 0) + 1,
                  refReview: options?.refReview || item.refReview || "",
                  creatorName: options?.creatorName || item.creatorName || "",
                }
              : item
          )
        : [
            ...prev,
            {
              ...product,
              qty: 1,
              refReview: options?.refReview || "",
              creatorName: options?.creatorName || "",
            },
          ];
    });
  };

  const addProductFromReviewToCart = (review: ReviewFeedItem) => {
    const product = products.find(
      (item) => Number(item.id) === Number(review.productId)
    );

    if (!product) {
      alert("ไม่พบสินค้าที่เชื่อมกับรีวิวนี้");
      return;
    }

    const refReview = rememberReviewReferral(review.id, review.reviewLink);
    addToCart(product, {
      refReview,
      creatorName: review.creatorName || "ครีเอเตอร์",
    });
    setCartAddedCreatorName(review.creatorName || "ครีเอเตอร์");
    setShowCartAddedBanner(true);

    window.setTimeout(() => {
      setShowCartAddedBanner(false);
      setCartAddedCreatorName("");
    }, 2600);
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) =>
      prev.filter((item) => Number(item.id) !== Number(productId))
    );
  };

  const decreaseQty = (productId: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          Number(item.id) === Number(productId)
            ? { ...item, qty: Number(item.qty || 0) - 1 }
            : item
        )
        .filter((item) => Number(item.qty || 0) > 0)
    );
  };

  const increaseQty = (productId: number) => {
    setCart((prev) =>
      prev.map((item) =>
        Number(item.id) === Number(productId)
          ? { ...item, qty: Number(item.qty || 0) + 1 }
          : item
      )
    );
  };

  const totalQty = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [cart]);

  const goToCheckout = () => {
    if (cart.length === 0) {
      alert("กรุณาเพิ่มสินค้าก่อน");
      return;
    }

    router.push("/checkout");
  };

  const openProduct = (product: Product) => {
    router.push(`/product/${product.slug}`);
  };

  const rememberReviewReferral = (reviewId: string, reviewLink?: string) => {
    const extractedRef = extractRefReviewFromLink(reviewLink);
    const refReview = extractedRef || reviewId;

    try {
      localStorage.setItem("refReview", refReview);
      localStorage.setItem(
        "reviewAttribution",
        JSON.stringify({
          refReview,
          reviewId,
          reviewLink: reviewLink || "",
          savedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error("rememberReviewReferral error:", error);
    }

    return refReview;
  };

  const ProductCard = ({ product }: { product: Product }) => {
    const images = getProductImages(product);
    const coverImage = images[0] || "/no-image.png";

    return (
      <div
        onClick={() => openProduct(product)}
        style={{
          background: "#fff",
          border: "1px solid #f0f0f0",
          overflow: "hidden",
          cursor: "pointer",
          transition: "all 0.18s ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
          e.currentTarget.style.borderColor = "#ee4d2d";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
          e.currentTarget.style.borderColor = "#f0f0f0";
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            background: "#fff",
            position: "relative",
            overflow: "hidden",
            borderBottom: "1px solid #f5f5f5",
          }}
        >
          <img
            src={coverImage}
            alt={product.name}
            loading="lazy"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              background: "#fff",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(238,77,45,0.95)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              padding: "4px 8px",
              borderRadius: 999,
              maxWidth: "76%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.category || "สินค้า"}
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              background: "rgba(0,0,0,0.68)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 999,
            }}
          >
            {images.length} รูป
          </div>

          {product.stock <= 0 ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 20,
              }}
            >
              สินค้าหมด
            </div>
          ) : null}
        </div>

        <div style={{ padding: isMobile ? "10px 10px 12px" : "12px 12px 14px" }}>
          <div
            style={{
              fontSize: isMobile ? 13 : 14,
              lineHeight: 1.35,
              color: "#222",
              height: isMobile ? "36px" : "38px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              marginBottom: 6,
            }}
            title={product.name}
          >
            {product.name}
          </div>

          <div
            style={{
              color: "#666",
              fontSize: isMobile ? 11 : 12,
              lineHeight: 1.35,
              height: isMobile ? "30px" : "32px",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              marginBottom: 8,
            }}
            title={product.shortDescription}
          >
            {product.shortDescription}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "end",
              justifyContent: "space-between",
              gap: 6,
              marginBottom: isMobile ? 10 : 12,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#ee4d2d",
                fontWeight: 800,
                fontSize: isMobile ? 18 : 24,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              ฿{product.price.toFixed(2)}
            </div>

            <div
              style={{
                fontSize: isMobile ? 11 : 12,
                color: "#888",
                whiteSpace: "nowrap",
              }}
            >
              คงเหลือ {product.stock}
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              addToCart(product);
            }}
            disabled={product.stock <= 0}
            style={{
              width: "100%",
              height: isMobile ? 38 : 36,
              borderRadius: 6,
              border: "1px solid #ee4d2d",
              background: product.stock <= 0 ? "#f5f5f5" : "#fff1ee",
              color: product.stock <= 0 ? "#aaa" : "#ee4d2d",
              cursor: product.stock <= 0 ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: isMobile ? 13 : 14,
            }}
          >
            {product.stock <= 0 ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
          </button>
        </div>
      </div>
    );
  };

  const ReviewCard = ({ review }: { review: ReviewFeedItem }) => {
    const product = products.find((p) => p.id === review.productId);
    const [slideIndex, setSlideIndex] = useState(0);

    useEffect(() => {
      if (!review.slides.length) return;

      const timer = window.setInterval(() => {
        setSlideIndex((prev) =>
          prev + 1 >= review.slides.length ? 0 : prev + 1
        );
      }, 2500);

      return () => window.clearInterval(timer);
    }, [review.slides]);

    return (
      <div
        style={{
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.09)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)";
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "9 / 13",
            background: "#111",
            overflow: "hidden",
          }}
        >
          <img
            src={review.slides[slideIndex]?.img || "/no-image.png"}
            alt={review.title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(238,77,45,0.96)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              padding: "5px 9px",
              borderRadius: 999,
              maxWidth: "82%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {review.tag || "รีวิวจริง"}
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              padding: "14px 12px 12px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.84), rgba(0,0,0,0.08))",
              color: "#fff",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                lineHeight: 1.35,
                marginBottom: 6,
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              {review.title}
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                opacity: 0.95,
                marginBottom: 8,
                minHeight: 38,
              }}
            >
              {review.slides[slideIndex]?.text || review.caption}
            </div>

            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {review.slides.map((_, i) => (
                <span
                  key={`slide-dot-${review.id}-${i}`}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#fff",
                    opacity: i === slideIndex ? 1 : 0.35,
                    display: "inline-block",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              marginBottom: 8,
              lineHeight: 1.5,
              minHeight: 36,
            }}
          >
            {product
              ? `เชื่อมกับสินค้า: ${product.name}`
              : "ยังไม่ได้เชื่อมสินค้า"}
          </div>

          <div
            style={{
              fontSize: 13,
              color: "#ee4d2d",
              fontWeight: 800,
              marginBottom: 10,
              minHeight: 20,
            }}
          >
            ครีเอเตอร์: {review.creatorName || "ครีเอเตอร์"}{review.creatorCode ? ` • รหัส ${review.creatorCode}` : ""}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: isMobile ? 6 : 8,
            }}
          >
            <button
              onClick={() => {
                router.push(review.reviewLink || `/brochure/${review.id}`);
              }}
              style={{
                height: isMobile ? 36 : 40,
                borderRadius: 8,
                border: "none",
                background: "#111",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: isMobile ? 12 : 14,
              }}
            >
              ดูวิธีรักษา
            </button>
            <button
              onClick={() => addProductFromReviewToCart(review)}
              style={{
                height: isMobile ? 36 : 40,
                borderRadius: 8,
                border: "none",
                background: "#ee4d2d",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: isMobile ? 12 : 14,
              }}
            >
              ซื้อจากรีวิวนี้
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          background: "#f5f5f5",
          padding: isMobile ? "12px 10px 32px" : "20px 12px 40px",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          {showCartAddedBanner ? (
            <div
              style={{
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                color: "#389e0d",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 16,
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {cartAddedCreatorName
                ? `เพิ่มสินค้าลงตะกร้าแล้ว • ครีเอเตอร์รับคอมมิชชั่น: ${cartAddedCreatorName}`
                : "เพิ่มสินค้าลงตะกร้าแล้ว"}
            </div>
          ) : null}

          <div
            style={{
              background:
                "linear-gradient(90deg, #ee4d2d 0%, #ff7337 55%, #ff8f55 100%)",
              color: "#fff",
              borderRadius: 12,
              padding: isMobile ? "14px 14px" : "18px 18px",
              marginBottom: isMobile ? 12 : 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: isMobile ? 10 : 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? 20 : 28,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                }}
              >
                HERBAL STORE
              </h1>
              <div
                style={{
                  marginTop: isMobile ? 4 : 6,
                  opacity: 0.95,
                  fontSize: isMobile ? 12 : 14,
                  lineHeight: 1.4,
                }}
              >
                ดูรีวิวจริงก่อน แล้วค่อยเลือกสินค้าที่ใช้ในเคส
              </div>
            </div>

            <div
              style={{
                background: "#fff",
                color: "#ee4d2d",
                borderRadius: 999,
                padding: isMobile ? "8px 14px" : "10px 16px",
                fontWeight: 900,
                fontSize: isMobile ? 13 : 15,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              🛒 {totalQty} รายการ
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "minmax(0, 1fr) 340px",
              gap: isMobile ? 12 : 16,
              alignItems: "start",
            }}
          >
            <section>
              <div
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: "14px 14px 18px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#ee4d2d",
                    marginBottom: 14,
                    borderBottom: "2px solid #ee4d2d",
                    paddingBottom: 10,
                  }}
                >
                  🔥 รีวิวจากผู้ใช้จริง
                </div>

                
                <div
  style={{
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr auto auto",
    gridTemplateAreas: isMobile
      ? `"input" "buttons"`
      : `"input search clear"`,
    gap: 10,
    marginBottom: 14,
  }}
>
  <input
    value={reviewSearchInput}
    onChange={(e) => {
  const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
  setReviewSearchInput(onlyDigits);
}}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        setReviewSearch(reviewSearchInput.trim());
      }
    }}
    placeholder={isMobile ? "รหัสครีเอเตอร์ 4 หลัก" : "ใส่รหัสครีเอเตอร์ 4 หลัก เช่น 1124"}
    inputMode="numeric"
    style={{
      gridArea: "input",
      height: 44,
      borderRadius: 10,
      border: "1px solid #ddd",
      padding: "0 14px",
      fontSize: 16,
      outline: "none",
      width: "100%",
      minWidth: 0,
    }}
  />

  {isMobile ? (
    <div
      style={{
        gridArea: "buttons",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
      }}
    >
      <button
        onClick={() => {
          setReviewSearch(reviewSearchInput.trim());
        }}
        style={{
          height: 44,
          borderRadius: 10,
          border: "none",
          background: "#ee4d2d",
          color: "#fff",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ค้นหา
      </button>
      <button
        onClick={() => {
          setReviewSearchInput("");
          setReviewSearch("");
        }}
        style={{
          height: 44,
          borderRadius: 10,
          border: "1px solid #ee4d2d",
          background: "#fff1ee",
          color: "#ee4d2d",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ล้าง
      </button>
    </div>
  ) : (
    <>
      <button
        onClick={() => {
          setReviewSearch(reviewSearchInput.trim());
        }}
        style={{
          gridArea: "search",
          height: 44,
          borderRadius: 10,
          border: "none",
          background: "#ee4d2d",
          color: "#fff",
          fontWeight: 800,
          padding: "0 18px",
          cursor: "pointer",
        }}
      >
        ค้นหา
      </button>

      <button
        onClick={() => {
          setReviewSearchInput("");
          setReviewSearch("");
        }}
        style={{
          gridArea: "clear",
          height: 44,
          borderRadius: 10,
          border: "1px solid #ee4d2d",
          background: "#fff1ee",
          color: "#ee4d2d",
          fontWeight: 800,
          padding: "0 14px",
          cursor: "pointer",
        }}
      >
        ล้าง
      </button>
    </>
  )}
</div>

                {searchResultText ? (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: "10px 12px",
                      borderRadius: 10,
                      border:
                        prioritizedReviewFeed.length > 0
                          ? "1px solid #bbf7d0"
                          : "1px solid #fecaca",
                      background:
                        prioritizedReviewFeed.length > 0 ? "#f0fdf4" : "#fef2f2",
                      color:
                        prioritizedReviewFeed.length > 0 ? "#15803d" : "#b91c1c",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {searchResultText}
                  </div>
                ) : null}
                {reviewFeed.length === 0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px dashed #ddd",
                      borderRadius: 8,
                      padding: "30px 20px",
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    ยังไม่มีรีวิว
                  </div>
                ) : prioritizedReviewFeed.length === 0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px dashed #fecaca",
                      borderRadius: 8,
                      padding: "30px 20px",
                      textAlign: "center",
                      color: "#b91c1c",
                      fontWeight: 800,
                    }}
                  >
                    ไม่พบรีวิวที่ตรงกับคำค้นนี้
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: isMobile ? 10 : 14,
                    }}
                  >
                   {prioritizedReviewFeed.map((review, index) => (
                      <ReviewCard
                        key={`review-${review.id}-${index}`}
                        review={review}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 8,
                  padding: "14px 14px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#ee4d2d",
                    marginBottom: 14,
                    borderBottom: "2px solid #ee4d2d",
                    paddingBottom: 10,
                  }}
                >
                  สินค้าที่เกี่ยวข้อง
                </div>

                {products.length === 0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px dashed #ddd",
                      borderRadius: 8,
                      padding: "30px 20px",
                      textAlign: "center",
                      color: "#777",
                    }}
                  >
                    ยังไม่มีสินค้า
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: isMobile ? 10 : 14,
                    }}
                  >
                    {products.map((product, index) => (
                      <ProductCard
                        key={`product-${product.id}-${product.slug || index}`}
                        product={product}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside
              style={{
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #eee",
                position: isMobile ? "static" : "sticky",
                top: isMobile ? "auto" : 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid #f1f1f1",
                  fontWeight: 900,
                  color: "#ee4d2d",
                  fontSize: 20,
                }}
              >
                🛒 ตะกร้า
              </div>

              <div style={{ padding: 16 }}>
                {cart.length === 0 ? (
                  <p style={{ color: "#888", margin: 0 }}>ไม่มีสินค้า</p>
                ) : (
                  <>
                    <div style={{ display: "grid", gap: 12 }}>
                      {cart.map((item, index) => (
                        <div
                          key={`cart-${item.id}-${item.refReview || "direct"}-${index}`}
                          style={{
                            border: "1px solid #eee",
                            borderRadius: 8,
                            padding: 12,
                            background: "#fafafa",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 10,
                              alignItems: "start",
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontSize: 14,
                                  lineHeight: 1.35,
                                  color: "#222",
                                }}
                              >
                                {item.name}
                              </div>

                              {item.creatorName ? (
                                <div
                                  style={{
                                    marginTop: 5,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: "#ee4d2d",
                                      background: "#fff1ee",
                                      border: "1px solid #ffd6cc",
                                      borderRadius: 999,
                                      padding: "2px 8px",
                                    }}
                                  >
                                    Affiliate
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 12,
                                      color: "#ee4d2d",
                                      fontWeight: 700,
                                    }}
                                  >
                                    ครีเอเตอร์: {item.creatorName}
                                  </span>
                                </div>
                              ) : null}

                              <div
                                style={{
                                  color: "#666",
                                  fontSize: 13,
                                  marginTop: 4,
                                }}
                              >
                                ฿{item.price.toFixed(2)} x {item.qty}
                              </div>
                            </div>

                            <button
                              onClick={() => removeFromCart(item.id)}
                              style={{
                                border: "none",
                                background: "#ff4d4f",
                                color: "#fff",
                                borderRadius: 8,
                                width: 32,
                                height: 32,
                                cursor: "pointer",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                              title="ลบสินค้า"
                            >
                              ×
                            </button>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              marginTop: 10,
                            }}
                          >
                            <button
                              onClick={() => decreaseQty(item.id)}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              -
                            </button>

                            <span
                              style={{
                                minWidth: 24,
                                textAlign: "center",
                                fontWeight: 700,
                              }}
                            >
                              {item.qty}
                            </span>

                            <button
                              onClick={() => increaseQty(item.id)}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: "1px solid #ddd",
                                background: "#fff",
                                cursor: "pointer",
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <hr
                      style={{
                        margin: "18px 0",
                        border: "none",
                        borderTop: "1px solid #eee",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 800,
                        fontSize: 18,
                        marginBottom: 14,
                      }}
                    >
                      <span>รวมทั้งสิ้น</span>
                      <span style={{ color: "#ee4d2d" }}>
                        ฿{totalPrice.toFixed(2)}
                      </span>
                    </div>

                    <button
                      onClick={goToCheckout}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 6,
                        border: "none",
                        background: "#ee4d2d",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: "pointer",
                        marginBottom: 10,
                        fontSize: 15,
                      }}
                    >
                      สั่งซื้อ
                    </button>

                    <button
                      onClick={() => {
                        setCart([]);
                      }}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        borderRadius: 6,
                        border: "1px solid #ddd",
                        background: "#fff",
                        color: "#333",
                        fontWeight: 700,
                        cursor: "pointer",
                        fontSize: 14,
                      }}
                    >
                      ล้างตะกร้า
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}