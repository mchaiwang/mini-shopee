"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useIsMobile } from "@/app/hooks/useIsMobile";

type OrderItem = {
  id?: string | number;
  name?: string;
  title?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  image?: string;
};

type ProductLookup = {
  id?: string | number;
  name?: string;
  title?: string;
  slug?: string;
  image?: string;
  images?: string[];
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
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
    note?: string;
  };
};

type CurrentUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
  permissions?: {
    canSubmitReview?: boolean;
    canReceiveCommission?: boolean;
  };
};

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const isMobile = useIsMobile(640);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestOrderId, setLatestOrderId] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<ProductLookup[]>([]);

  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewUsage, setReviewUsage] = useState("ยอดเยี่ยม");
  const [reviewQuality, setReviewQuality] = useState("ดี");
  const [reviewShipping, setReviewShipping] = useState("ดีมาก");
  const [reviewText, setReviewText] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const justOrdered = searchParams.get("justOrdered") === "1";

  async function loadOrders() {
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
        }).catch(() => null),
      ]);

      let me: CurrentUser | null = null;
      if (authRes.ok) {
        const authData = await authRes.json().catch(() => null);
        me = authData?.user || null;
      }
      setCurrentUser(me);

      if (productsRes && productsRes.ok) {
        const productsData = await productsRes.json().catch(() => null);
        const productList: ProductLookup[] = Array.isArray(productsData?.products)
          ? productsData.products
          : Array.isArray(productsData)
          ? productsData
          : [];
        setProducts(productList);
      } else {
        setProducts([]);
      }

      const data = await ordersRes.json().catch(() => null);
      const list: Order[] = Array.isArray(data) ? data : data?.orders || [];

      const filtered = list.filter((order) => {
        if (!me) return false;

        const orderUserId = String(order.userId || order.ownerId || "");
        const meId = String(me.id || "");

        const orderEmail = String(
          order.email || order.shippingAddress?.email || ""
        )
          .trim()
          .toLowerCase();

        const meEmail = String(me.email || "").trim().toLowerCase();

        if (meId && orderUserId && orderUserId === meId) return true;
        if (meEmail && orderEmail && orderEmail === meEmail) return true;

        return false;
      });

      const sorted = [...filtered].sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });

      setOrders(sorted);

      if (justOrdered && sorted.length > 0) {
        setLatestOrderId(sorted[0].id);
      } else {
        setLatestOrderId("");
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
      setLatestOrderId("");
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [justOrdered]);

  const visibleOrders = useMemo(() => {
    if (!justOrdered) return orders;
    return orders.filter((o) => o.id === latestOrderId);
  }, [orders, latestOrderId, justOrdered]);

  function paymentLabel(method?: string) {
    if (method === "cod") return "เก็บเงินปลายทาง";
    if (method === "bank_transfer") return "โอนเงิน / สแกนจ่าย";
    return "-";
  }

  function getName(o: Order) {
    return o.fullName || o.shippingAddress?.fullName || "-";
  }

  function getPhone(o: Order) {
    return o.phone || o.shippingAddress?.phone || "-";
  }

  function getAddress(o: Order) {
    return o.address || o.shippingAddress?.address || "-";
  }

  function getStatusColor(status?: string) {
    if (status === "อนุมัติ" || status === "อนุมัติแล้ว") return "#16a34a";
    if (status === "ได้รับสินค้าแล้ว" || status === "สำเร็จแล้ว") return "#16a34a";
    if (status === "รอจัดส่ง" || status === "รอยืนยันคำสั่งซื้อ")
      return "#f97316";
    if (status === "จัดส่งแล้ว") return "#2563eb";
    return "#374151";
  }

  function getStatusBg(status?: string) {
    if (status === "อนุมัติ" || status === "อนุมัติแล้ว") return "#f0fdf4";
    if (status === "ได้รับสินค้าแล้ว" || status === "สำเร็จแล้ว") return "#dcfce7";
    if (status === "รอจัดส่ง" || status === "รอยืนยันคำสั่งซื้อ")
      return "#fff7ed";
    if (status === "จัดส่งแล้ว") return "#eff6ff";
    return "#f3f4f6";
  }

  function canReview(order: Order) {
    // ลูกค้ารีวิวได้ทั้งหลังจัดส่งและรับของ
    return order.status === "จัดส่งแล้ว" || order.status === "ได้รับสินค้าแล้ว" || order.status === "สำเร็จแล้ว";
  }

  function isCreatorUser(user: CurrentUser | null) {
    if (!user) return false;

    return (
      user.creatorEnabled === true ||
      user.creatorStatus === "approved" ||
      user.permissions?.canSubmitReview === true ||
      user.permissions?.canReceiveCommission === true
    );
  }

  function getReviewHref(order: Order) {
    if (isCreatorUser(currentUser)) {
      return `/creator/reviews/new?orderId=${order.id}`;
    }
    return `/reviews/new?orderId=${order.id}`;
  }

  function getItemName(item: OrderItem) {
    return String(item.name || item.title || "สินค้า").trim();
  }

  function getItemQty(item: OrderItem) {
    return Number(item.qty || item.quantity || 1);
  }

  function getProductFallback(item: OrderItem) {
    const itemId = String(item.id || "").trim();
    const itemName = getItemName(item).toLowerCase();

    return products.find((product) => {
      const productId = String(product.id || "").trim();
      const productName = String(product.name || product.title || "")
        .trim()
        .toLowerCase();

      if (itemId && productId && itemId === productId) return true;
      if (itemName && productName && itemName === productName) return true;

      return false;
    });
  }

  function getItemImage(item: OrderItem) {
    if (item.image) return item.image;

    const product = getProductFallback(item);
    if (Array.isArray(product?.images) && product.images.length > 0) {
      return product.images.find(Boolean) || product.image || "";
    }

    return product?.image || "";
  }


  function openReviewModal(order: Order) {
    setReviewOrder(order);
    setReviewRating(5);
    setReviewUsage("ยอดเยี่ยม");
    setReviewQuality("ดี");
    setReviewShipping("ดีมาก");
    setReviewText("");
    setReviewImages([]);
  }

  function closeReviewModal() {
    if (submittingReview) return;
    setReviewOrder(null);
    setReviewImages([]);
  }

  function handleReviewImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 6);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => resolve("");
            reader.readAsDataURL(file);
          })
      )
    ).then((images) => {
      setReviewImages((prev) => [...prev, ...images.filter(Boolean)].slice(0, 6));
    });
  }

  async function submitReview() {
    if (!reviewOrder) return;

    const validItems = (reviewOrder.items || [])
      .filter((item) => item.id)
      .map((item) => ({
        ...item,
        name: getItemName(item),
        image: getItemImage(item),
      }));
    if (validItems.length === 0) {
      alert("ไม่พบรายการสินค้าที่จะรีวิว");
      return;
    }

    if (reviewText.trim().length < 10) {
      alert("กรุณาเขียนรีวิวอย่างน้อย 10 ตัวอักษร");
      return;
    }

    try {
      setSubmittingReview(true);

      const res = await fetch("/api/product-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          orderId: reviewOrder.id,
          items: validItems,
          rating: reviewRating,
          usage: reviewUsage,
          quality: reviewQuality,
          shipping: reviewShipping,
          comment: reviewText,
          images: reviewImages,
          userName: currentUser?.name || currentUser?.email || "ผู้ซื้อ",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "ส่งรีวิวไม่สำเร็จ");
        return;
      }

      alert("ส่งรีวิวสำเร็จ ขอบคุณสำหรับการให้คะแนน");
      closeReviewModal();
      await loadOrders();
    } catch (error) {
      console.error(error);
      alert("ส่งรีวิวไม่สำเร็จ");
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: isMobile ? "16px auto" : "40px auto",
        padding: isMobile ? "0 12px 24px" : 16,
      }}
    >
      <h1
        style={{
          fontSize: isMobile ? 22 : 32,
          fontWeight: 800,
          marginBottom: isMobile ? 14 : 20,
        }}
      >
        คำสั่งซื้อของฉัน
      </h1>

      {justOrdered && latestOrderId && (
        <div
          style={{
            marginBottom: isMobile ? 14 : 20,
            padding: isMobile ? 12 : 16,
            borderRadius: 12,
            background: "#ecfdf5",
            border: "1px solid #4ade80",
            color: "#065f46",
            fontWeight: 700,
            fontSize: isMobile ? 13 : 15,
          }}
        >
          ✅ สั่งซื้อสำเร็จ หมายเลข: {latestOrderId}
        </div>
      )}

      {loading ? (
        <div>กำลังโหลด...</div>
      ) : !currentUser ? (
        <div>กรุณาเข้าสู่ระบบเพื่อดูคำสั่งซื้อของคุณ</div>
      ) : visibleOrders.length === 0 ? (
        <div>ยังไม่มีคำสั่งซื้อ</div>
      ) : (
        visibleOrders.map((order) => (
          <div
            key={order.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: isMobile ? 14 : 20,
              padding: isMobile ? 14 : 20,
              marginBottom: isMobile ? 14 : 20,
              background: "#fff",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 18 : 28, fontWeight: 900, wordBreak: "break-all" }}>
                  #{order.id}
                </div>
                <div style={{ color: "#6b7280", marginTop: 4, fontSize: isMobile ? 12 : 14 }}>
                  วันที่สั่งซื้อ:{" "}
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleString("th-TH")
                    : "-"}
                </div>
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: isMobile ? "6px 12px" : "8px 14px",
                  borderRadius: 999,
                  fontWeight: 800,
                  fontSize: isMobile ? 12 : 14,
                  color: getStatusColor(order.status),
                  background: getStatusBg(order.status),
                  border: `1px solid ${getStatusColor(order.status)}22`,
                  flexShrink: 0,
                }}
              >
                {order.status || "-"}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.2fr 0.8fr",
                gap: isMobile ? 12 : 16,
              }}
            >
              <div
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 16,
                  padding: 16,
                  background: "#fcfcfd",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 22,
                    marginBottom: 12,
                  }}
                >
                  ข้อมูลการจัดส่ง
                </div>

                <div style={{ marginBottom: 8 }}>
                  <strong>ชื่อ:</strong> {getName(order)}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>โทร:</strong> {getPhone(order)}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>ที่อยู่:</strong> {getAddress(order)}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>หมายเหตุ:</strong>{" "}
                  {order.note || order.shippingAddress?.note || "-"}
                </div>
                <div>
                  <strong>การชำระเงิน:</strong>{" "}
                  {paymentLabel(order.paymentMethod)}
                </div>
              </div>

              <div
                style={{
                  border: "1px solid #eef2f7",
                  borderRadius: 16,
                  padding: 16,
                  background: "#fcfcfd",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 22,
                    marginBottom: 12,
                  }}
                >
                  หลักฐานการชำระเงิน
                </div>

                {order.paymentMethod === "bank_transfer" && order.slip ? (
                  <img
                    src={order.slip}
                    alt="slip"
                    style={{
                      width: "100%",
                      maxWidth: 260,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                ) : order.paymentMethod === "cod" ? (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "#fff7ed",
                      color: "#ea580c",
                      border: "1px solid #fdba74",
                      fontWeight: 700,
                    }}
                  >
                    คำสั่งซื้อนี้เป็นแบบเก็บเงินปลายทาง
                  </div>
                ) : (
                  <div
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      background: "#f9fafb",
                      color: "#6b7280",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    ไม่มีหลักฐานการชำระเงิน
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                border: "1px solid #eef2f7",
                borderRadius: 16,
                padding: 16,
                background: "#fcfcfd",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  marginBottom: 12,
                }}
              >
                รายการสินค้า
              </div>

              {(order.items || []).length === 0 ? (
                <div style={{ color: "#6b7280" }}>ไม่มีรายการสินค้า</div>
              ) : (
                <>
                  {(order.items || []).map((item, i) => {
                    const itemImage = getItemImage(item);
                    const itemName = getItemName(item);

                    return (
                      <div
                        key={`${item.id || itemName}-${i}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "56px 1fr auto" : "72px 1fr auto",
                          alignItems: "center",
                          padding: isMobile ? "10px 12px" : "12px 14px",
                          borderRadius: 12,
                          background: "#fff",
                          border: "1px solid #e5e7eb",
                          marginBottom: 10,
                          gap: isMobile ? 10 : 12,
                        }}
                      >
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={itemName}
                            style={{
                              width: isMobile ? 56 : 72,
                              height: isMobile ? 56 : 72,
                              borderRadius: 10,
                              objectFit: "cover",
                              border: "1px solid #e5e7eb",
                              background: "#fff",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: isMobile ? 56 : 72,
                              height: isMobile ? 56 : 72,
                              borderRadius: 10,
                              display: "grid",
                              placeItems: "center",
                              border: "1px solid #e5e7eb",
                              background: "#f8fafc",
                              color: "#94a3b8",
                              fontSize: isMobile ? 10 : 12,
                              fontWeight: 800,
                            }}
                          >
                            ไม่มีรูป
                          </div>
                        )}

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              color: "#111827",
                              lineHeight: 1.4,
                              fontSize: isMobile ? 13 : 15,
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {itemName}
                          </div>
                          {Number(item.price || 0) > 0 ? (
                            <div
                              style={{
                                marginTop: 4,
                                color: "#ef4444",
                                fontWeight: 800,
                                fontSize: isMobile ? 12 : 13,
                              }}
                            >
                              ฿{Number(item.price || 0).toFixed(2)}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            whiteSpace: "nowrap",
                            fontWeight: 900,
                            color: "#111827",
                            fontSize: isMobile ? 13 : 15,
                          }}
                        >
                          x {getItemQty(item)}
                        </div>
                      </div>
                    );
                  })}

                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: "1px dashed #d1d5db",
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#ef4444",
                    }}
                  >
                    รวมทั้งหมด: ฿{Number(order.total || 0).toFixed(2)}
                  </div>
                </>
              )}
            </div>

            {canReview(order) && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #f1f5f9",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                    marginRight: "auto",
                  }}
                >
                  ได้รับสินค้าแล้ว? ช่วยให้คะแนนร้านและสินค้า
                </div>

                <a
                  href={getReviewHref(order)}
                  onClick={(event) => {
                    if (!isCreatorUser(currentUser)) {
                      event.preventDefault();
                      openReviewModal(order);
                    }
                  }}
                  style={
                    isCreatorUser(currentUser)
                      ? {
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 44,
                          padding: "0 18px",
                          borderRadius: 6,
                          background: "#ee4d2d",
                          color: "#fff",
                          fontWeight: 900,
                          fontSize: 14,
                          textDecoration: "none",
                          border: "1px solid #ee4d2d",
                          boxShadow: "0 8px 18px rgba(238,77,45,0.18)",
                        }
                      : {
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 44,
                          padding: "0 18px",
                          borderRadius: 6,
                          background: "#fff",
                          color: "#ee4d2d",
                          fontWeight: 900,
                          fontSize: 14,
                          textDecoration: "none",
                          border: "1px solid #ee4d2d",
                          boxShadow: "0 6px 14px rgba(15,23,42,0.06)",
                        }
                  }
                >
                  {isCreatorUser(currentUser)
                    ? "รีวิวสินค้าและรับคอมมิชชั่น"
                    : "รีวิวและให้คะแนน"}
                </a>
              </div>
            )}
          </div>
        ))
      )}
    

      {reviewOrder ? (
        <div style={reviewModalBackdropStyle} onClick={closeReviewModal}>
          <div style={reviewModalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={reviewModalHeaderStyle}>
              <div>
                <div style={reviewModalTitleStyle}>ให้คะแนนสินค้า</div>
                <div style={reviewModalSubTitleStyle}>
                  เขียนรีวิวเพื่อช่วยผู้ซื้อคนอื่นตัดสินใจเหมือน Shopee
                </div>
              </div>
              <button type="button" onClick={closeReviewModal} style={modalCloseButtonStyle}>
                ×
              </button>
            </div>

            <div style={coinBarStyle}>🪙 เขียนรีวิวพร้อมรูปภาพ ช่วยเพิ่มความน่าเชื่อถือให้สินค้า</div>

            <div style={reviewProductListStyle}>
              {(reviewOrder.items || []).map((item, index) => (
                <div key={`${item.id || index}-${index}`} style={reviewProductRowStyle}>
                  {getItemImage(item) ? (
                    <img src={getItemImage(item)} alt={getItemName(item)} style={reviewProductImageStyle} />
                  ) : (
                    <div style={reviewProductImagePlaceholderStyle}>รูป</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={reviewProductNameStyle}>{getItemName(item)}</div>
                    <div style={reviewProductMetaStyle}>จำนวน x {getItemQty(item)}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={ratingRowStyle}>
              <span style={ratingLabelStyle}>คุณภาพสินค้า</span>
              <div style={starButtonWrapStyle}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    style={starButtonStyle}
                  >
                    {star <= reviewRating ? "★" : "☆"}
                  </button>
                ))}
              </div>
              <span style={ratingTextStyle}>{reviewRating >= 5 ? "ยอดเยี่ยม" : reviewRating >= 4 ? "ดีมาก" : reviewRating >= 3 ? "พอใช้" : "ควรปรับปรุง"}</span>
            </div>

            <div style={quickScoreGridStyle}>
              <label style={quickScoreLabelStyle}>
                การใช้งาน
                <select
                  value={reviewUsage}
                  onChange={(e) => setReviewUsage(e.target.value)}
                  style={quickScoreSelectStyle}
                >
                  <option value="ยอดเยี่ยม">ยอดเยี่ยม</option>
                  <option value="ดีมาก">ดีมาก</option>
                  <option value="ดี">ดี</option>
                  <option value="พอใช้">พอใช้</option>
                  <option value="ควรปรับปรุง">ควรปรับปรุง</option>
                </select>
              </label>

              <label style={quickScoreLabelStyle}>
                คุณภาพ
                <select
                  value={reviewQuality}
                  onChange={(e) => setReviewQuality(e.target.value)}
                  style={quickScoreSelectStyle}
                >
                  <option value="ดีเยี่ยม">ดีเยี่ยม</option>
                  <option value="ดีมาก">ดีมาก</option>
                  <option value="ดี">ดี</option>
                  <option value="พอใช้">พอใช้</option>
                  <option value="ควรปรับปรุง">ควรปรับปรุง</option>
                </select>
              </label>

              <label style={quickScoreLabelStyle}>
                การจัดส่ง
                <select
                  value={reviewShipping}
                  onChange={(e) => setReviewShipping(e.target.value)}
                  style={quickScoreSelectStyle}
                >
                  <option value="ดีมาก">ดีมาก</option>
                  <option value="รวดเร็ว">รวดเร็ว</option>
                  <option value="ตรงเวลา">ตรงเวลา</option>
                  <option value="พอใช้">พอใช้</option>
                  <option value="ควรปรับปรุง">ควรปรับปรุง</option>
                </select>
              </label>
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="แบ่งปันประสบการณ์ของคุณเกี่ยวกับสินค้าและบริการร้านค้า..."
              style={reviewTextareaStyle}
            />

            <div style={uploadWrapStyle}>
              <label style={uploadButtonStyle}>
                📷 เพิ่มรูปภาพ
                <input type="file" accept="image/*" multiple onChange={handleReviewImageChange} style={{ display: "none" }} />
              </label>
              <div style={uploadHintStyle}>เพิ่มรูปได้สูงสุด 6 รูป</div>
            </div>

            {reviewImages.length > 0 ? (
              <div style={previewGridStyle}>
                {reviewImages.map((img, index) => (
                  <div key={`${img}-${index}`} style={previewImageWrapStyle}>
                    <img src={img} alt={`review-${index + 1}`} style={previewImageStyle} />
                    <button
                      type="button"
                      onClick={() => setReviewImages((prev) => prev.filter((_, i) => i !== index))}
                      style={removeImageButtonStyle}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div style={modalFooterStyle}>
              <button type="button" onClick={closeReviewModal} disabled={submittingReview} style={cancelButtonStyle}>
                ยกเลิก
              </button>
              <button type="button" onClick={submitReview} disabled={submittingReview} style={submitReviewButtonStyle}>
                {submittingReview ? "กำลังส่ง..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

const reviewModalBackdropStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(15,23,42,0.48)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const reviewModalStyle: React.CSSProperties = {
  width: "min(760px, 100%)",
  maxHeight: "92vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 4,
  boxShadow: "0 24px 80px rgba(0,0,0,0.28)",
  padding: 24,
};

const reviewModalHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  marginBottom: 18,
};

const reviewModalTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#111827",
};

const reviewModalSubTitleStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#6b7280",
  fontSize: 13,
};

const modalCloseButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
};

const coinBarStyle: React.CSSProperties = {
  border: "1px solid #f97316",
  background: "#fff7ed",
  color: "#ea580c",
  padding: "10px 12px",
  borderRadius: 2,
  fontWeight: 800,
  marginBottom: 16,
};

const reviewProductListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 16,
};

const reviewProductRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  padding: 10,
  border: "1px solid #f1f5f9",
  background: "#fff",
};

const reviewProductImageStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  objectFit: "cover",
  border: "1px solid #e5e7eb",
};

const reviewProductImagePlaceholderStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  display: "grid",
  placeItems: "center",
  background: "#f8fafc",
  color: "#94a3b8",
  border: "1px solid #e5e7eb",
  fontSize: 12,
};

const reviewProductNameStyle: React.CSSProperties = {
  color: "#374151",
  fontWeight: 800,
  lineHeight: 1.45,
};

const reviewProductMetaStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 13,
  marginTop: 4,
};

const ratingRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 16,
};

const ratingLabelStyle: React.CSSProperties = {
  minWidth: 110,
  color: "#374151",
  fontWeight: 800,
};

const starButtonWrapStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 2,
};

const starButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#f59e0b",
  fontSize: 34,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};

const ratingTextStyle: React.CSSProperties = {
  color: "#f97316",
  fontWeight: 900,
};

const quickScoreGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  marginBottom: 14,
};

const quickScoreLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 13,
  fontWeight: 800,
  color: "#374151",
};

const quickScoreSelectStyle: React.CSSProperties = {
  height: 40,
  border: "1px solid #e5e7eb",
  borderRadius: 4,
  padding: "0 10px",
  outline: "none",
  background: "#fff",
  color: "#111827",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

const reviewTextareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 150,
  border: "1px solid #d1d5db",
  borderRadius: 2,
  padding: 14,
  resize: "vertical",
  outline: "none",
  fontSize: 14,
  lineHeight: 1.7,
  boxSizing: "border-box",
};

const uploadWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  marginTop: 12,
  flexWrap: "wrap",
};

const uploadButtonStyle: React.CSSProperties = {
  height: 38,
  padding: "0 14px",
  border: "1px solid #ee4d2d",
  color: "#ee4d2d",
  background: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  fontWeight: 800,
};

const uploadHintStyle: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: 13,
};

const previewGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 72px)",
  gap: 10,
  marginTop: 12,
  overflowX: "auto",
};

const previewImageWrapStyle: React.CSSProperties = {
  position: "relative",
  width: 72,
  height: 72,
  border: "1px solid #e5e7eb",
};

const previewImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const removeImageButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: -7,
  top: -7,
  width: 22,
  height: 22,
  borderRadius: 999,
  border: "none",
  background: "#ef4444",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};

const modalFooterStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 14,
  marginTop: 22,
};

const cancelButtonStyle: React.CSSProperties = {
  minWidth: 120,
  height: 44,
  border: "none",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 800,
};

const submitReviewButtonStyle: React.CSSProperties = {
  minWidth: 150,
  height: 44,
  border: "none",
  background: "#ee4d2d",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 900,
};
