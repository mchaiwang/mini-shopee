"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AuthUser = {
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
  role?: string;
  creatorEnabled?: boolean;
  creatorStatus?: string;
  creatorDisplayName?: string;
  creatorPayment?: {
    promptPay?: string;
    bankName?: string;
    accountName?: string;
    accountNumber?: string;
  };
};

type WalletResponse = {
  success?: boolean;
  wallet?: {
    unconfirmed?: number;
    pending?: number;
    requested?: number;
    paid?: number;
    total?: number;
  };
  withdraws?: WithdrawRecord[];
  commissions?: CommissionRecord[];
};

type WithdrawCommissionItem = {
  id: string;
  orderId: string;
  reviewId: string;
  productId: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  reviewTitle?: string;
  productName?: string;
};

type WithdrawRecord = {
  id: string;
  creatorUserId: string;
  amount: number;
  status: "requested" | "approved" | "paid" | "rejected" | string;
  createdAt: string;
  /** snapshot ของ commission ที่ประกอบเป็น withdraw นี้ (ตั้งแต่ patch รุ่นใหม่) */
  items?: WithdrawCommissionItem[];
};

type CommissionRecord = {
  id: string;
  reviewId?: string;
  creatorUserId?: string;
  orderId?: string;
  productId?: string | number;
  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  amount?: number;
  status?: "pending" | "requested" | "approved" | "paid" | "rejected" | string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
  paymentRef?: string | null;
};

type OrderRecord = {
  id?: string;
  total?: number;
  refReview?: string;
  commissionTracked?: boolean;
  commissionAmount?: number;
  commissionStatus?:
    | "pending"
    | "requested"
    | "approved"
    | "paid"
    | "rejected"
    | string;
  commissionOwnerUserId?: string;
  createdAt?: string;
};

type OrdersResponse = {
  orders?: OrderRecord[];
};

type PopupState = {
  amount: number;
  review: string;
  orderId: string;
} | null;

type WalletDetailType = "unconfirmed" | "pending" | "approved" | "paid" | "total" | null;

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
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  slides?: ReviewSlide[];
  orderId?: string;
};

type Product = {
  id: number;
  name: string;
  slug?: string;
  image?: string;
  category?: string;
  price?: number;
};

function getCookie(name: string) {
  if (typeof document === "undefined") return "";

  const found = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return found ? decodeURIComponent(found.split("=")[1]) : "";
}

function formatMoney(value?: number) {
  return `฿${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatThaiDate(value?: string) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("th-TH");
  } catch {
    return "-";
  }
}

function getWithdrawStatusText(status?: string) {
  if (status === "approved") return "อนุมัติโอนแล้ว";
  if (status === "paid") return "โอนแล้ว";
  if (status === "rejected") return "ไม่อนุมัติ";
  if (status === "requested") return "รอตรวจสอบ";
  return "รอตรวจสอบ";
}

function getCommissionStatusText(status?: string) {
  if (status === "paid") return "โอนแล้ว";
  if (status === "approved") return "อนุมัติแล้ว";
  if (status === "requested") return "รออนุมัติถอน";
  if (status === "rejected") return "ไม่อนุมัติ";
  if (status === "unconfirmed") return "รอลูกค้ารับของ";
  return "รอโอน";
}
function getCommissionAmount(item: CommissionRecord) {
  const directAmount = Number(item.commissionAmount ?? item.amount ?? 0);
  if (directAmount > 0) return directAmount;

  const saleAmount = Number(item.saleAmount || 0);
  const rate = Number(item.commissionRate || 0.1);

  return Number((saleAmount * rate).toFixed(2));
}

function getCommissionSaleAmount(item: CommissionRecord) {
  return Number(item.saleAmount || 0);
}
/**
 * คืนรายการ commission ที่ประกอบเป็น withdraw record นี้
 *
 * ลำดับความสำคัญ:
 * 1. ถ้า withdraw.items มีอยู่ (จาก backend ใหม่) — ใช้ snapshot นั้น (แม่นยำที่สุด)
 * 2. ถ้าไม่มี (record เก่า ก่อน patch) — คืน [] เพื่อให้ UI แสดงข้อความ "ข้อมูลย้อนหลังไม่ครบ"
 *    เพราะการ filter จาก commission ทั้งหมดด้วย status เดียวกัน ทำให้ทุก withdraw
 *    ที่ status เดียวกันแสดง commission ซ้ำกัน — ผิด
 */
function commissionsFromWithdraw(
  withdraw: WithdrawRecord,
  _commissions: CommissionRecord[]
): CommissionRecord[] {
  if (Array.isArray(withdraw.items) && withdraw.items.length > 0) {
    // ใช้ snapshot ที่บันทึกไว้ตอนกดถอน
    return withdraw.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      reviewId: item.reviewId,
      productId: item.productId,
      saleAmount: item.saleAmount,
      commissionRate: item.commissionRate,
      commissionAmount: item.commissionAmount,
      amount: item.commissionAmount,
      status: withdraw.status,
    }));
  }

  return [];
}

export default function FinancePage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);

  const [wallet, setWallet] = useState({
    unconfirmed: 0,
    pending: 0,
    requested: 0,
    paid: 0,
    total: 0,
  });

  const [withdraws, setWithdraws] = useState<WithdrawRecord[]>([]);
  const [creatorOrders, setCreatorOrders] = useState<OrderRecord[]>([]);
  const [creatorCommissions, setCreatorCommissions] = useState<CommissionRecord[]>([]);

  const [loadingReviews, setLoadingReviews] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState("");
  const [myReviews, setMyReviews] = useState<CreatorReview[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [popup, setPopup] = useState<PopupState>(null);
  const [walletDetail, setWalletDetail] = useState<WalletDetailType>(null);
  const [selectedWithdraw,setSelectedWithdraw] = useState<WithdrawRecord|null>(null);

  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const popupTimerRef = useRef<number | null>(null);

  const isCreatorApproved = useMemo(() => {
    return user?.creatorEnabled === true || user?.creatorStatus === "approved";
  }, [user]);

  const creatorDisplayNameText =
    user?.creatorDisplayName || user?.displayName || user?.name || "-";

  const reviewTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const review of myReviews) {
      map.set(String(review.id), review.title || review.creatorName || review.id);
    }
    return map;
  }, [myReviews]);

  const unconfirmedCommissions = useMemo(() => {
    return creatorCommissions
      .filter((item) => getCommissionAmount(item) > 0 && String(item.status || "") === "unconfirmed")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [creatorCommissions]);

  const pendingCommissions = useMemo(() => {
    return creatorCommissions
      .filter((item) => getCommissionAmount(item) > 0 && String(item.status || "pending") === "pending")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [creatorCommissions]);

  const selectedWithdraws = useMemo(() => {
    // unconfirmed ไม่ใช่สถานะของ withdraw — return [] เพื่อไม่แสดง withdraw history
    if (walletDetail === "unconfirmed") {
      return [];
    }

    if (!walletDetail || walletDetail === "pending" || walletDetail === "total") {
      return withdraws;
    }

    if (walletDetail === "approved") {
      return withdraws.filter((item) => item.status === "approved");
    }

    if (walletDetail === "paid") {
      return withdraws.filter((item) => item.status === "paid");
    }

    return withdraws;
  }, [walletDetail, withdraws]);

  const approvedCommissions = useMemo(() => {
    return creatorCommissions
      .filter((item) => {
        const status = String(item.status || "");
        return getCommissionAmount(item) > 0 && (status === "approved" || status === "requested");
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [creatorCommissions]);

  const paidCommissions = useMemo(() => {
    return creatorCommissions
      .filter((item) => getCommissionAmount(item) > 0 && String(item.status || "") === "paid")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [creatorCommissions]);

  const derivedWallet = {
  unconfirmed: wallet?.unconfirmed || 0,
  pending: wallet?.pending || 0,
  requested: wallet?.requested || 0,
  approved: wallet?.requested || 0,
  paid: wallet?.paid || 0,
  total:
    (wallet?.unconfirmed || 0) +
    (wallet?.pending || 0) +
    (wallet?.requested || 0) +
    (wallet?.paid || 0),
};

  async function loadCreatorOrders(userId?: string) {
    try {
      const res = await fetch("/api/orders", {
        cache: "no-store",
        credentials: "include",
      });

      const data: OrdersResponse = await res.json().catch(() => ({}));

      const orders = Array.isArray(data?.orders)
        ? data.orders
        : Array.isArray(data)
          ? (data as OrderRecord[])
          : [];

      const mine = orders.filter((order) => {
        if (!order.refReview) return false;
        if (!order.commissionAmount && !order.commissionTracked) return false;

        if (userId && order.commissionOwnerUserId) {
          return String(order.commissionOwnerUserId) === String(userId);
        }

        return true;
      });

      setCreatorOrders(mine);
    } catch (error) {
      console.error("loadCreatorOrders error:", error);
      setCreatorOrders([]);
    }
  }

  async function loadFinance() {
    try {
      const rawAuth = getCookie("auth");

      if (rawAuth) {
        try {
          const parsed = JSON.parse(rawAuth);
          setUser(parsed);
        } catch {
          // ignore parse error
        }
      }

      const authRes = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });

      const authData = await authRes.json().catch(() => null);
      const me = authData?.user || null;

      if (!authRes.ok || !me) {
        alert("กรุณาเข้าสู่ระบบก่อน");
        location.href = "/login";
        return;
      }

      setUser(me);

      const res = await fetch("/api/creator/withdraw", {
        cache: "no-store",
        credentials: "include",
      });

      const data: WalletResponse = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setWallet({
          unconfirmed: Number(data.wallet?.unconfirmed || 0),
          pending: Number(data.wallet?.pending || 0),
          requested: Number(data.wallet?.requested || 0),
          paid: Number(data.wallet?.paid || 0),
          total: Number(data.wallet?.total || 0),
        });

        setWithdraws(Array.isArray(data.withdraws) ? data.withdraws : []);
        setCreatorCommissions(Array.isArray(data.commissions) ? data.commissions : []);
      }

      await loadCreatorOrders(me?.id);
    } catch (error) {
      console.error(error);
      alert("โหลดข้อมูลการเงินไม่สำเร็จ");
    }
  }

  async function loadMyReviews(userId: string) {
    try {
      setLoadingReviews(true);

      const [reviewsRes, productsRes] = await Promise.all([
        fetch("/api/reviews", {
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/products", {
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const reviewsData = await reviewsRes.json().catch(() => null);
      const allReviews: CreatorReview[] = Array.isArray(reviewsData?.reviews)
        ? reviewsData.reviews
        : [];

      const productsData = await productsRes.json().catch(() => null);
      const allProducts: Product[] = Array.isArray(productsData?.products)
        ? productsData.products
        : [];

      setProducts(allProducts);

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
      setLoadingReviews(false);
    }
  }

  useEffect(() => {
    const loadPage = async () => {
      try {
        await loadFinance();

        const authRes = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        const authData = await authRes.json().catch(() => null);
        const me = authData?.user || null;

        if (me?.id) {
          await loadMyReviews(String(me.id));
          await loadCreatorOrders(String(me.id));
        }
      } catch (error) {
        console.error(error);
        alert("โหลดข้อมูลไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function seedInitialOrders() {
      try {
        const res = await fetch("/api/orders", {
          cache: "no-store",
          credentials: "include",
        });

        const data: OrdersResponse = await res.json().catch(() => ({}));

        const orders = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? (data as OrderRecord[])
            : [];

        const initialIds = new Set<string>();

        for (const order of orders) {
          const id = String(order?.id || "").trim();
          if (id) initialIds.add(id);
        }

        if (!cancelled) {
          seenOrderIdsRef.current = initialIds;
        }
      } catch (error) {
        console.error("seedInitialOrders error:", error);
      }
    }

    seedInitialOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch("/api/orders", {
          cache: "no-store",
          credentials: "include",
        });

        const data: OrdersResponse = await res.json().catch(() => ({}));

        const orders = Array.isArray(data?.orders)
          ? data.orders
          : Array.isArray(data)
            ? (data as OrderRecord[])
            : [];

        for (const order of orders) {
          const orderId = String(order?.id || "").trim();
          if (!orderId) continue;

          if (seenOrderIdsRef.current.has(orderId)) continue;
          seenOrderIdsRef.current.add(orderId);

          const review = String(order?.refReview || "").trim();
          const amount = Number(order?.commissionAmount || 0);

          if (review && amount > 0) {
            if (popupTimerRef.current) {
              window.clearTimeout(popupTimerRef.current);
            }

            setPopup({
              amount,
              review,
              orderId,
            });

            popupTimerRef.current = window.setTimeout(() => {
              setPopup(null);
            }, 4000);

            await loadFinance();
            break;
          }
        }
      } catch (error) {
        console.error("poll orders error:", error);
      }
    }, 3000);

    return () => {
      window.clearInterval(interval);

      if (popupTimerRef.current) {
        window.clearTimeout(popupTimerRef.current);
      }
    };
  }, []);

  async function handleWithdraw() {
    if (derivedWallet.pending <= 0) {
      alert("ไม่มีเงินให้ถอน");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันการถอนเงิน ${formatMoney(derivedWallet.pending)} ?`
    );

    if (!confirmed) return;

    try {
      setWithdrawing(true);

      const res = await fetch("/api/creator/withdraw", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "ถอนเงินไม่สำเร็จ");
        return;
      }

      alert("ส่งคำขอถอนเงินแล้ว");
      await loadFinance();
    } catch (error) {
      console.error(error);
      alert("ถอนเงินไม่สำเร็จ");
    } finally {
      setWithdrawing(false);
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    const confirmed = window.confirm("ต้องการลบรีวิวนี้ใช่ไหม");
    if (!confirmed) return;

    try {
      setDeletingReviewId(reviewId);

      const res = await fetch(
        `/api/reviews?id=${encodeURIComponent(reviewId)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        alert(data?.message || "ลบรีวิวไม่สำเร็จ");
        return;
      }

      setMyReviews((prev) => prev.filter((item) => item.id !== reviewId));
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการลบรีวิว");
    } finally {
      setDeletingReviewId("");
    }
  };

  const getProductName = (review: CreatorReview) => {
    const productId = review.productId || review.productIds?.[0];
    const matched = products.find((p) => String(p.id) === String(productId));
    return matched?.name || "-";
  };

 const goToEditReview = (review: CreatorReview) => {
  const reviewId = String(review?.id || "").trim();

  if (!reviewId) {
    alert("ไม่พบรหัสรีวิว");
    return;
  }

  // ใช้ review.id เท่านั้น ห้ามเด้งไป orderId
  window.location.href =
    `/creator/reviews/new?reviewId=${encodeURIComponent(reviewId)}`;
};

  const getWalletDetailTitle = () => {
    if (walletDetail === "unconfirmed") return "คอมมิสชั่นที่รอลูกค้ายืนยันรับของ";
    if (walletDetail === "pending") return "คอมมิสชั่นที่ลูกค้าได้รับของแล้ว";
    if (walletDetail === "approved") return "รายละเอียดยอดรอรับโอน";
    if (walletDetail === "paid") return "รายละเอียดยอดโอนแล้ว";
    return "รายละเอียดยอดรวมทั้งหมด";
  };

  const getWalletDetailDescription = () => {
    if (walletDetail === "unconfirmed") {
      return "ยอดนี้คือคอมมิชชั่นจากออเดอร์ที่ยังอยู่ในขั้นตอนการจัดส่ง — เมื่อลูกค้ายืนยันว่าได้รับสินค้าแล้ว ยอดจะย้ายไปการ์ด \"ยืนยันแล้ว\" และพร้อมส่งคำขอถอน";
    }

    if (walletDetail === "pending") {
      return "ยอดนี้คือเงินคอมมิชชั่นที่ลูกค้ายืนยันรับของแล้ว — พร้อมส่งคำขอถอน";
    }

    if (walletDetail === "approved") {
      return "ยอดนี้คือเงินคอมมิชชั่นที่ได้รับอนุมัติแล้ว แสดงแยกตามรีวิวและออเดอร์ด้านล่าง";
    }

    if (walletDetail === "paid") {
      return "ยอดนี้คือเงินที่แอดมินโอนให้เรียบร้อยแล้ว";
    }

    return "ยอดนี้คือยอดรวมของเครดิตทุกสถานะ ทั้งรอยืนยัน รอโอน รอตรวจสอบ และโอนแล้ว";
  };

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1320,
          margin: "24px auto",
          padding: "0 16px",
        }}
      >
        <div style={loadingBoxStyle}>กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          maxWidth: 1320,
          margin: "24px auto",
          padding: "0 16px 40px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px minmax(0, 1fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <aside style={sidebarStyle}>
            <div style={sidebarTitleStyle}>เมนูครีเอเตอร์</div>

            <a href="/account/finance" style={activeMenuItemStyle}>
              <span>🪙</span>
              <span>ภาพรวมการเงิน</span>
            </a>

            <a href="#withdraw-section" style={menuItemStyle}>
              <span>💸</span>
              <span>ถอนเงิน</span>
            </a>

            <a href="#withdraw-history-section" style={menuItemStyle}>
              <span>🧾</span>
              <span>ประวัติการถอนเงิน</span>
            </a>

            <a href="#reviews-section" style={menuItemStyle}>
              <span>⭐</span>
              <span>รีวิวของฉัน</span>
            </a>

            <a href="/profile" style={menuItemStyle}>
              <span>👤</span>
              <span>ข้อมูลครีเอเตอร์</span>
            </a>

            <div style={helpBoxStyle}>
              <div style={{ fontWeight: 900, marginBottom: 6 }}>
                ต้องการความช่วยเหลือ?
              </div>
              <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                จัดการข้อมูลครีเอเตอร์ การเงิน และรีวิวได้จากหน้านี้
              </div>
            </div>
          </aside>

          <main>
            {!isCreatorApproved ? (
              <div style={notCreatorBoxStyle}>
                บัญชีนี้ยังไม่ได้รับสิทธิ์ครีเอเตอร์
                <br />
                กรุณาไปที่หน้าโปรไฟล์เพื่อสมัครครีเอเตอร์ก่อน
              </div>
            ) : (
              <>
                <section style={heroCardStyle}>
                  <div style={heroRowStyle}>
                    <div style={heroLeftStyle}>
                      <div style={heroIconWrapStyle}>🌿</div>
                      <div>
                        <div style={heroTitleStyle}>✅ คุณเป็นครีเอเตอร์แล้ว</div>
                        <div style={heroTextStyle}>
                          ยินดีด้วย!
                          บัญชีของคุณได้รับการอนุมัติเป็นครีเอเตอร์เรียบร้อยแล้ว
                          <br />
                          ชื่อที่แสดง: {creatorDisplayNameText}
                        </div>
                      </div>
                    </div>

                    <a href="/profile" style={heroActionButtonStyle}>
                      ดูโปรไฟล์ครีเอเตอร์
                    </a>
                  </div>
                </section>

                <section style={walletGridStyle}>
                  <button
                    type="button"
                    onClick={() => setWalletDetail("unconfirmed")}
                    style={grayCardButtonStyle}
                  >
                    <div style={cardLabelStyle}>รอยืนยัน</div>
                    <div style={cardValueStyle}>
                      {formatMoney(derivedWallet.unconfirmed)}
                    </div>
                    <div style={cardSubStyle}>ลูกค้ายังไม่ยืนยันรับของ</div>
                    <div style={clickHintStyle}>กดดูรายละเอียด</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletDetail("pending")}
                    style={orangeCardButtonStyle}
                  >
                    <div style={cardLabelStyle}>ยืนยันแล้ว (ถอนได้)</div>
                    <div style={cardValueStyle}>
                      {formatMoney(derivedWallet.pending)}
                    </div>
                    <div style={cardSubStyle}>พร้อมส่งคำขอถอน</div>
                    <div style={clickHintStyle}>กดดูรายละเอียดจากรีวิว</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletDetail("approved")}
                    style={blueCardButtonStyle}
                  >
                    <div style={cardLabelStyle}>ยอดรอรับโอน</div>
                    <div style={cardValueStyle}>
                      {formatMoney(derivedWallet.approved)}
                    </div>
                    <div style={cardSubStyle}>แอดมินอนุมัติแล้ว</div>
                    <div style={clickHintStyle}>กดดูรายละเอียด</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletDetail("paid")}
                    style={greenCardButtonStyle}
                  >
                    <div style={cardLabelStyle}>ยอดโอนแล้ว</div>
                    <div style={cardValueStyle}>{formatMoney(derivedWallet.paid)}</div>
                    <div style={cardSubStyle}>รับเงินแล้วทั้งหมด</div>
                    <div style={clickHintStyle}>กดดูรายละเอียด</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWalletDetail("total")}
                    style={darkCardButtonStyle}
                  >
                    <div style={cardLabelStyle}>ยอดรวมทั้งหมด</div>
                    <div style={cardValueStyle}>{formatMoney(derivedWallet.total)}</div>
                    <div style={cardSubStyle}>รวมทุกสถานะ</div>
                    <div style={clickHintStyle}>กดดูรายละเอียด</div>
                  </button>
                </section>

                {walletDetail ? (
                  <section style={detailCardStyle}>
                    <div style={detailHeaderStyle}>
                      <div>
                        <div style={sectionTitleStyle}>
                          {getWalletDetailTitle()}
                        </div>
                        <div style={detailDescriptionStyle}>
                          {getWalletDetailDescription()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setWalletDetail(null)}
                        style={closeDetailButtonStyle}
                      >
                        ปิด
                      </button>
                    </div>

                    <div style={detailAmountStyle}>
                      {formatMoney(derivedWallet[walletDetail])}
                    </div>

                    {walletDetail === "unconfirmed" ? (
                      <div style={{ marginTop: 18 }}>
                        <div style={miniTitleStyle}>
                          รายการคอมมิชชั่นรอลูกค้ายืนยันรับของ
                        </div>

                        {unconfirmedCommissions.length === 0 ? (
                          <div style={emptyBoxStyle}>
                            ไม่มีออเดอร์ที่กำลังจัดส่ง — เมื่อมีลูกค้าสั่งซื้อจากรีวิวและยังไม่ได้รับของ ยอดจะแสดงที่นี่
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 12 }}>
                            {unconfirmedCommissions.map((commission) => {
                              const reviewId = String(commission.reviewId || "-");
                              const reviewTitle =
                                reviewTitleMap.get(reviewId) || reviewId;
                              return (
                                <div key={commission.id} style={commissionRowStyle}>
                                  <div>
                                    <div style={commissionTitleStyle}>
                                      รีวิว: {reviewTitle}
                                    </div>
                                    <div style={commissionMetaStyle}>
                                      Order: {commission.orderId}
                                    </div>
                                    <div style={commissionMetaStyle}>
                                      Product: {commission.productId}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={rowLabelStyle}>ยอดขาย</div>
                                    <div style={rowValueStyle}>
                                      {formatMoney(getCommissionSaleAmount(commission))}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={rowLabelStyle}>คอม</div>
                                    <div style={commissionAmountStyle}>
                                      {formatMoney(getCommissionAmount(commission))}
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      ...statusBadgeStyle,
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      borderColor: "#cbd5e1",
                                    }}
                                  >
                                    🚚 รอลูกค้ายืนยันรับของ
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {walletDetail === "pending" ? (
                      <div style={{ marginTop: 18 }}>
                        <div style={miniTitleStyle}>
                          รายการคอมมิชชั่นรอโอนจากรีวิว
                        </div>

                        {pendingCommissions.length === 0 ? (
                          <div style={emptyBoxStyle}>
                            ยังไม่พบรายการรีวิวที่สร้างคอมมิชชั่นรอโอน
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 12 }}>
                            {pendingCommissions.map((commission) => {
                              const reviewId = String(commission.reviewId || "-");
                              const reviewTitle =
                                reviewTitleMap.get(reviewId) || reviewId;

                              return (
                                <div
                                  key={String(commission.id || reviewId)}
                                  style={commissionRowStyle}
                                >
                                  <div>
                                    <div style={commissionTitleStyle}>
                                      รีวิว: {reviewTitle}
                                    </div>
                                    <div style={commissionMetaStyle}>
                                      Review ID: {reviewId}
                                    </div>
                                    <div style={commissionMetaStyle}>
                                      Order ID: {commission.orderId || "-"}
                                    </div>
                                    <div style={commissionMetaStyle}>
                                      วันที่: {formatThaiDate(commission.createdAt)}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={rowLabelStyle}>ยอดขาย</div>
                                    <div style={rowValueStyle}>
                                      {formatMoney(getCommissionSaleAmount(commission))}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={rowLabelStyle}>คอมมิชชั่น</div>
                                    <div style={commissionAmountStyle}>
                                      {formatMoney(getCommissionAmount(commission))}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      ...statusBadgeStyle,
                                      background: "#fff7ed",
                                      color: "#9a3412",
                                      borderColor: "#fdba74",
                                    }}
                                  >
                                    {getCommissionStatusText(
                                      commission.status
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}

                    {walletDetail !== "pending" ? (
                      <div style={{ marginTop: 18 }}>
                        <div style={miniTitleStyle}>
                          {walletDetail === "paid"
                            ? "รายการคอมมิชชั่นที่โอนแล้ว"
                            : walletDetail === "approved"
                              ? "รายการคอมมิชชั่นที่ได้รับอนุมัติ"
                              : "รายการที่เกี่ยวข้อง"}
                        </div>

                        {walletDetail === "paid" ? (
                          paidCommissions.length === 0 &&
                          selectedWithdraws.length === 0 ? (
                            <div style={emptyBoxStyle}>
                              ยังไม่มีรายการคอมมิชชั่นที่โอนแล้ว
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 12 }}>
                              {paidCommissions.map((commission) => {
                                const reviewId = String(commission.reviewId || "-");
                                const reviewTitle =
                                  reviewTitleMap.get(reviewId) || reviewId;

                                return (
                                  <div
                                    key={String(commission.id || reviewId)}
                                    style={commissionRowStyle}
                                  >
                                    <div>
                                      <div style={commissionTitleStyle}>
                                        รีวิว: {reviewTitle}
                                      </div>
                                      <div style={commissionMetaStyle}>
                                        Review ID: {reviewId}
                                      </div>
                                      <div style={commissionMetaStyle}>
                                        Order ID: {commission.orderId || "-"}
                                      </div>
                                      <div style={commissionMetaStyle}>
                                        วันที่: {formatThaiDate(commission.createdAt)}
                                      </div>
                                    </div>

                                    <div>
                                      <div style={rowLabelStyle}>ยอดขาย</div>
                                      <div style={rowValueStyle}>
                                        {formatMoney(getCommissionSaleAmount(commission))}
                                      </div>
                                    </div>

                                    <div>
                                      <div style={rowLabelStyle}>คอมมิชชั่น</div>
                                      <div style={commissionAmountStyle}>
                                        {formatMoney(getCommissionAmount(commission))}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        ...statusBadgeStyle,
                                        background: "#ecfdf5",
                                        color: "#166534",
                                        borderColor: "#86efac",
                                      }}
                                    >
                                      โอนแล้ว
                                    </div>
                                  </div>
                                );
                              })}

                              {selectedWithdraws.map((item) => (
                                <div key={item.id} style={miniWithdrawRowStyle}>
                                  <div>
                                    <div style={miniWithdrawIdStyle}>
                                      {item.id}
                                    </div>
                                    <div style={miniWithdrawDateStyle}>
                                      {formatThaiDate(item.createdAt)}
                                    </div>
                                  </div>

                                  <div style={miniWithdrawAmountStyle}>
                                    {formatMoney(item.amount)}
                                  </div>

                                  <div
                                    style={{
                                      ...statusBadgeStyle,
                                      background: "#ecfdf5",
                                      color: "#166534",
                                      borderColor: "#86efac",
                                    }}
                                  >
                                    {getWithdrawStatusText(item.status)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        ) : walletDetail === "approved" ? (
                          approvedCommissions.length === 0 ? (
                            <div style={emptyBoxStyle}>
                              ยังไม่มีรายการคอมมิชชั่นที่ได้รับอนุมัติ
                            </div>
                          ) : (
                            <div style={{ display: "grid", gap: 12 }}>
                              {approvedCommissions.map((commission) => {
                                const reviewId = String(commission.reviewId || "-");
                                const reviewTitle =
                                  reviewTitleMap.get(reviewId) || reviewId;

                                return (
                                  <div
                                    key={String(commission.id || reviewId)}
                                    style={commissionRowStyle}
                                  >
                                    <div>
                                      <div style={commissionTitleStyle}>
                                        รีวิว: {reviewTitle}
                                      </div>
                                      <div style={commissionMetaStyle}>
                                        Review ID: {reviewId}
                                      </div>
                                      <div style={commissionMetaStyle}>
                                        Order ID: {commission.orderId || "-"}
                                      </div>
                                      <div style={commissionMetaStyle}>
                                        วันที่: {formatThaiDate(commission.createdAt)}
                                      </div>
                                    </div>

                                    <div>
                                      <div style={rowLabelStyle}>ยอดขาย</div>
                                      <div style={rowValueStyle}>
                                        {formatMoney(getCommissionSaleAmount(commission))}
                                      </div>
                                    </div>

                                    <div>
                                      <div style={rowLabelStyle}>คอมมิชชั่น</div>
                                      <div style={commissionAmountStyle}>
                                        {formatMoney(getCommissionAmount(commission))}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        ...statusBadgeStyle,
                                        background: "#eff6ff",
                                        color: "#1d4ed8",
                                        borderColor: "#93c5fd",
                                      }}
                                    >
                                      ได้รับอนุมัติ
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )
                        ) : selectedWithdraws.length === 0 ? (
                          <div style={emptyBoxStyle}>
                            ยังไม่มีรายการในสถานะนี้
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 10 }}>
                            {selectedWithdraws.map((item) => (
                              <div key={item.id} style={miniWithdrawRowStyle}>
                                <div>
                                  <div style={miniWithdrawIdStyle}>
                                    {item.id}
                                  </div>
                                  <div style={miniWithdrawDateStyle}>
                                    {formatThaiDate(item.createdAt)}
                                  </div>
                                </div>

                                <div style={miniWithdrawAmountStyle}>
                                  {formatMoney(item.amount)}
                                </div>

                                <div
                                  style={{
                                    ...statusBadgeStyle,
                                    background:
                                      item.status === "paid"
                                        ? "#ecfdf5"
                                        : item.status === "rejected"
                                          ? "#fef2f2"
                                          : "#fff7ed",
                                    color:
                                      item.status === "paid"
                                        ? "#166534"
                                        : item.status === "rejected"
                                          ? "#991b1b"
                                          : "#9a3412",
                                    borderColor:
                                      item.status === "paid"
                                        ? "#86efac"
                                        : item.status === "rejected"
                                          ? "#fca5a5"
                                          : "#fdba74",
                                  }}
                                >
                                  {getWithdrawStatusText(item.status)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                   ) : null}
                  </section>
                ) : null}

                <section id="withdraw-section" style={sectionCardStyle}>
                  <div style={sectionTitleStyle}>วิธีรับเงินปัจจุบัน</div>

                  <div style={paymentBoxStyle}>
                    <div style={paymentRowStyle}>
                      <strong>ชื่อครีเอเตอร์:</strong>{" "}
                      {user?.creatorDisplayName || "-"}
                    </div>

                    {user?.creatorPayment?.promptPay ? (
                      <>
                        <div style={paymentRowStyle}>
                          <strong>ประเภท:</strong> พร้อมเพย์
                        </div>
                        <div style={paymentRowStyle}>
                          <strong>พร้อมเพย์:</strong>{" "}
                          {user.creatorPayment.promptPay || "-"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={paymentRowStyle}>
                          <strong>ประเภท:</strong> โอนธนาคาร
                        </div>
                        <div style={paymentRowStyle}>
                          <strong>ธนาคาร:</strong>{" "}
                          {user?.creatorPayment?.bankName || "-"}
                        </div>
                        <div style={paymentRowStyle}>
                          <strong>ชื่อบัญชี:</strong>{" "}
                          {user?.creatorPayment?.accountName || "-"}
                        </div>
                        <div style={paymentRowStyle}>
                          <strong>เลขบัญชี:</strong>{" "}
                          {user?.creatorPayment?.accountNumber || "-"}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || derivedWallet.pending <= 0}
                    style={{
                      marginTop: 18,
                      height: 56,
                      width: "100%",
                      borderRadius: 16,
                      border: "none",
                      background:
                        withdrawing || derivedWallet.pending <= 0
                          ? "#cbd5e1"
                          : "linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%)",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 18,
                      cursor:
                        withdrawing || derivedWallet.pending <= 0
                          ? "not-allowed"
                          : "pointer",
                      boxShadow:
                        withdrawing || derivedWallet.pending <= 0
                          ? "none"
                          : "0 12px 24px rgba(238,77,45,0.18)",
                    }}
                  >
                    {withdrawing
                      ? "กำลังส่งคำขอถอน..."
                      : `ถอนเงิน ${formatMoney(derivedWallet.pending)}`}
                  </button>
                </section>

                <section id="withdraw-history-section" style={sectionCardStyle}>
                  <div style={sectionTitleStyle}>ประวัติการถอนเงิน</div>

                  {withdraws.length === 0 ? (
                    <div style={emptyBoxStyle}>ยังไม่มีประวัติการถอนเงิน</div>
                  ) : (
                    <div style={{ display: "grid", gap: 12 }}>
                      {withdraws.map((item) => (
                        <div key={item.id} style={withdrawRowStyle}>
                          <div>
                            <button
 type="button"
 onClick={()=>setSelectedWithdraw(item)}
 style={{
   ...withdrawIdStyle,
   border:"none",
   background:"transparent",
   padding:0,
   cursor:"pointer",
   color:"#2563eb"
 }}
>
เลขที่คำขอ: {item.id} 🔍
</button>
                            <div style={{ color: "#64748b", fontSize: 13 }}>
                              วันที่: {formatThaiDate(item.createdAt)}
                            </div>
                          </div>

                          <div>
                            <div style={rowLabelStyle}>จำนวนเงิน</div>
                            <div style={rowValueStyle}>
                              {formatMoney(item.amount)}
                            </div>
                          </div>

                          <div>
                            <div style={rowLabelStyle}>สถานะ</div>
                            <div
                              style={{
                                ...statusBadgeStyle,
                                background:
                                  item.status === "paid"
                                    ? "#ecfdf5"
                                    : item.status === "rejected"
                                      ? "#fef2f2"
                                      : "#fff7ed",
                                color:
                                  item.status === "paid"
                                    ? "#166534"
                                    : item.status === "rejected"
                                      ? "#991b1b"
                                      : "#9a3412",
                                borderColor:
                                  item.status === "paid"
                                    ? "#86efac"
                                    : item.status === "rejected"
                                      ? "#fca5a5"
                                      : "#fdba74",
                              }}
                            >
                              {getWithdrawStatusText(item.status)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section id="reviews-section" style={sectionCardStyle}>
                  <div style={reviewHeaderStyle}>
                    <div style={sectionTitleStyle}>รีวิวของฉัน</div>

                    <a href="/orders" style={createReviewButtonStyle}>
  สร้างรีวิวใหม่
</a>
                  </div>

                  {loadingReviews ? (
                    <div style={emptyBoxStyle}>กำลังโหลดรีวิวของฉัน...</div>
                  ) : myReviews.length === 0 ? (
                    <div style={emptyBoxStyle}>
                      ยังไม่มีรีวิวของครีเอเตอร์คนนี้
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 16 }}>
                      {myReviews.map((review) => (
                        <div key={review.id} style={reviewCardStyle}>
                          <div style={reviewTopStyle}>
                            <div>
                              <div style={reviewTitleStyle}>
                                {review.title || "-"}
                              </div>
                              <div style={reviewMetaStyle}>
                                สินค้า: {getProductName(review)}
                              </div>
                              <div style={reviewMetaSmallStyle}>
                                สถานะ: {review.status || "-"} • วันที่:{" "}
                                {review.createdAt
                                  ? new Date(
                                      review.createdAt
                                    ).toLocaleDateString("th-TH")
                                  : "-"}
                              </div>
                            </div>

                            <div style={reviewActionWrapStyle}>
                              <button
                                type="button"
                                onClick={() => goToEditReview(review)}
                                style={editButtonStyle}
                              >
                                แก้ไข
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={deletingReviewId === review.id}
                                style={{
                                  ...deleteButtonStyle,
                                  opacity:
                                    deletingReviewId === review.id ? 0.7 : 1,
                                  cursor:
                                    deletingReviewId === review.id
                                      ? "not-allowed"
                                      : "pointer",
                                }}
                              >
                                {deletingReviewId === review.id
                                  ? "กำลังลบ..."
                                  : "ลบ"}
                              </button>
                            </div>
                          </div>

                          <div style={slidesGridStyle}>
                            {(review.slides || []).map((slide, index) => (
                              <div key={`${review.id}-${slide.key}-${index}`}>
                                <div style={slidePreviewWrapStyle}>
                                  <img
                                    src={slide.img || "/no-image.png"}
                                    alt={slide.text || `slide-${index + 1}`}
                                    style={slidePreviewImageStyle}
                                  />
                                </div>
                                <div style={slidePreviewTextStyle}>
                                  {slide.text || "-"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
{selectedWithdraw && (
<div
onClick={()=>setSelectedWithdraw(null)}
style={{
position:"fixed",
inset:0,
background:"rgba(0,0,0,.45)",
zIndex:99999,
display:"grid",
placeItems:"center",
padding:20
}}
>

<div
onClick={(e)=>e.stopPropagation()}
style={{
background:"#fff",
width:"min(900px,100%)",
borderRadius:24,
padding:24,
maxHeight:"85vh",
overflow:"auto"
}}
>

<div style={{
display:"flex",
justifyContent:"space-between",
marginBottom:18
}}>
<div>
<div style={{
fontSize:28,
fontWeight:900
}}>
รายละเอียดคำขอถอน
</div>

<div style={{color:"#64748b"}}>
เลขคำขอ {selectedWithdraw.id}
</div>
</div>

<button
onClick={()=>setSelectedWithdraw(null)}
style={closeDetailButtonStyle}
>
ปิด
</button>
</div>


<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
gap:12,
marginBottom:20
}}>

<div style={detailBoxStyle}>
เลขคำขอ<br/>
<b>{selectedWithdraw.id}</b>
</div>

<div style={detailBoxStyle}>
จำนวนเงิน<br/>
<b>{formatMoney(selectedWithdraw.amount)}</b>
</div>

<div style={detailBoxStyle}>
สถานะ<br/>
<b>{getWithdrawStatusText(selectedWithdraw.status)}</b>
</div>

<div style={detailBoxStyle}>
วันที่ขอถอน<br/>
<b>{formatThaiDate(selectedWithdraw.createdAt)}</b>
</div>

</div>

<div style={{
fontWeight:900,
fontSize:20,
marginBottom:12
}}>
คอมมิชชั่นที่ประกอบเป็นยอดถอนนี้
</div>


<div style={{display:"grid",gap:12}}>

{(() => {
  const breakdown = commissionsFromWithdraw(selectedWithdraw, creatorCommissions);

  if (breakdown.length === 0) {
    return (
      <div
        style={{
          padding: 16,
          borderRadius: 14,
          background: "#fff7ed",
          border: "1px solid #fed7aa",
          color: "#9a3412",
          fontWeight: 600,
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 6 }}>
          ℹ️ ไม่มีรายละเอียดคอมมิชชั่นย้อนหลัง
        </div>
        คำขอถอนนี้ถูกสร้างก่อนระบบจะเริ่มเก็บ snapshot รายการคอมมิชชั่น
        ระบบจึงไม่สามารถแสดงรายการที่ประกอบเป็นยอด{" "}
        <b style={{ color: "#ee4d2d" }}>
          {formatMoney(selectedWithdraw.amount)}
        </b>{" "}
        นี้ได้แม่นยำ — คำขอถอนใหม่จะแสดงรายละเอียดครบถ้วน
      </div>
    );
  }

  return breakdown.map((c) => (
<div
key={c.id}
style={commissionRowStyle}
>

<div>
<div style={commissionTitleStyle}>
รีวิว:
{" "}
{reviewTitleMap.get(
String(c.reviewId||"")
) || c.reviewId}
</div>

<div style={commissionMetaStyle}>
Order:
{c.orderId}
</div>

<div style={commissionMetaStyle}>
Product:
{c.productId}
</div>
</div>

<div>
<div style={rowLabelStyle}>ยอดขาย</div>
<div style={rowValueStyle}>
{formatMoney(
getCommissionSaleAmount(c)
)}
</div>
</div>

<div>
<div style={rowLabelStyle}>คอม</div>
<div style={commissionAmountStyle}>
{formatMoney(
getCommissionAmount(c)
)}
</div>
</div>

<div
style={{
...statusBadgeStyle,
background:"#eff6ff",
color:"#1d4ed8",
borderColor:"#93c5fd"
}}
>
{getCommissionStatusText(c.status)}
</div>

</div>
));
})()}

</div>

</div>
</div>
)}
      {popup ? (
        <div style={popupStyle}>
          <div style={popupTitleStyle}>💸 ได้รับเงิน +{popup.amount} บาท</div>
          <div style={popupTextStyle}>จากรีวิว: {popup.review}</div>
          <div style={popupOrderStyle}>ออเดอร์: {popup.orderId}</div>
        </div>
      ) : null}
    </>
  );
}

const loadingBoxStyle: React.CSSProperties = {
  borderRadius: 24,
  background: "#fff",
  border: "1px solid #eef2f6",
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  padding: 28,
  color: "#64748b",
  fontWeight: 700,
};

const notCreatorBoxStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef2f6",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  color: "#9a3412",
  fontWeight: 800,
  lineHeight: 1.8,
};

const sidebarStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef2f6",
  borderRadius: 24,
  padding: 20,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  position: "sticky",
  top: 90,
};

const sidebarTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 18,
};

const menuItemBaseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 14,
  textDecoration: "none",
  fontWeight: 800,
  marginBottom: 8,
};

const activeMenuItemStyle: React.CSSProperties = {
  ...menuItemBaseStyle,
  background: "#fff1ee",
  color: "#ee4d2d",
  border: "1px solid #ffd2c6",
};

const menuItemStyle: React.CSSProperties = {
  ...menuItemBaseStyle,
  background: "#fff",
  color: "#334155",
  border: "1px solid transparent",
};

const helpBoxStyle: React.CSSProperties = {
  marginTop: 18,
  borderRadius: 16,
  background: "#f8fbff",
  border: "1px solid #dbeafe",
  padding: 14,
};

const heroCardStyle: React.CSSProperties = {
  background: "#fff7f2",
  border: "1px solid #ffe2d5",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  marginBottom: 22,
};

const heroRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
};

const heroLeftStyle: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "center",
};

const heroIconWrapStyle: React.CSSProperties = {
  width: 74,
  height: 74,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  background: "#ffd8bf",
  fontSize: 34,
  flexShrink: 0,
};

const heroTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 6,
};

const heroTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.6,
};

const heroActionButtonStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "0 18px",
  borderRadius: 14,
  background: "#fff",
  color: "#334155",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  border: "1px solid #e2e8f0",
};

const walletGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 16,
  marginBottom: 22,
};

const cardBaseStyle: React.CSSProperties = {
  borderRadius: 20,
  padding: 18,
  color: "#fff",
  minHeight: 132,
  boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
};

const cardButtonBaseStyle: React.CSSProperties = {
  ...cardBaseStyle,
  border: "none",
  textAlign: "left",
  cursor: "pointer",
};

const orangeCardButtonStyle: React.CSSProperties = {
  ...cardButtonBaseStyle,
  background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
};

const grayCardButtonStyle: React.CSSProperties = {
  ...cardButtonBaseStyle,
  background: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
};

const blueCardButtonStyle: React.CSSProperties = {
  ...cardButtonBaseStyle,
  background: "linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)",
};

const greenCardButtonStyle: React.CSSProperties = {
  ...cardButtonBaseStyle,
  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
};

const darkCardButtonStyle: React.CSSProperties = {
  ...cardButtonBaseStyle,
  background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  opacity: 0.95,
  marginBottom: 14,
};

const cardValueStyle: React.CSSProperties = {
  fontSize: 34,
  fontWeight: 900,
  lineHeight: 1.1,
  marginBottom: 10,
};

const cardSubStyle: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.95,
  lineHeight: 1.5,
  fontWeight: 700,
};

const clickHintStyle: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.85,
};

const detailCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef2f6",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  marginBottom: 22,
};

const detailHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
};

const detailDescriptionStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.6,
};

const closeDetailButtonStyle: React.CSSProperties = {
  height: 40,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
};

const detailAmountStyle: React.CSSProperties = {
  marginTop: 18,
  fontSize: 38,
  fontWeight: 900,
  color: "#0f172a",
};

const miniTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 10,
};

const commissionRowStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
  display: "grid",
  gridTemplateColumns: "1.4fr 0.7fr 0.7fr auto",
  gap: 12,
  alignItems: "center",
};

const commissionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 4,
};

const commissionMetaStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.6,
};

const commissionAmountStyle: React.CSSProperties = {
  fontSize: 20,
  color: "#f97316",
  fontWeight: 900,
};

const miniWithdrawRowStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gridTemplateColumns: "1fr auto auto",
  gap: 12,
  alignItems: "center",
};

const miniWithdrawIdStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const miniWithdrawDateStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 12,
  marginTop: 4,
};

const miniWithdrawAmountStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const sectionCardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #eef2f6",
  borderRadius: 24,
  padding: 24,
  boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
  marginBottom: 22,
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 16,
};

const paymentBoxStyle: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  padding: 18,
  lineHeight: 1.9,
  color: "#0f172a",
};

const paymentRowStyle: React.CSSProperties = {
  marginBottom: 4,
  fontSize: 16,
};

const emptyBoxStyle: React.CSSProperties = {
  border: "1px dashed #d5d9e0",
  borderRadius: 16,
  padding: 20,
  color: "#64748b",
  background: "#fff",
};

const withdrawRowStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  padding: 16,
  background: "#fff",
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr 0.8fr",
  gap: 12,
  alignItems: "center",
};

const withdrawIdStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 4,
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  marginBottom: 4,
  fontWeight: 700,
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 18,
  color: "#0f172a",
  fontWeight: 900,
};

const statusBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 34,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid transparent",
  fontWeight: 900,
  fontSize: 13,
};

const reviewHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 16,
};

const createReviewButtonStyle: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 14,
  background: "#ee4d2d",
  color: "#fff",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
};

const reviewCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 16,
  background: "#fff",
};

const reviewTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const reviewTitleStyle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 18,
  color: "#0f172a",
};

const reviewMetaStyle: React.CSSProperties = {
  color: "#64748b",
  marginTop: 6,
  fontSize: 14,
};

const reviewMetaSmallStyle: React.CSSProperties = {
  color: "#64748b",
  marginTop: 4,
  fontSize: 13,
};

const reviewActionWrapStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const editButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const deleteButtonStyle: React.CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "none",
  background: "#dc2626",
  color: "#fff",
  fontWeight: 900,
};

const slidesGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 12,
  marginTop: 16,
};

const slidePreviewWrapStyle: React.CSSProperties = {
  width: "100%",
  aspectRatio: "4 / 5",
  borderRadius: 12,
  overflow: "hidden",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
};

const slidePreviewImageStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};

const slidePreviewTextStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: "#334155",
  marginTop: 6,
};

const popupStyle: React.CSSProperties = {
  position: "fixed",
  right: 24,
  bottom: 24,
  zIndex: 9999,
  minWidth: 320,
  maxWidth: 420,
  borderRadius: 18,
  padding: "16px 18px",
  background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
  color: "#fff",
  boxShadow: "0 18px 38px rgba(0,0,0,0.22)",
  border: "1px solid rgba(255,255,255,0.22)",
};

const popupTitleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 900,
  lineHeight: 1.1,
  marginBottom: 6,
};

const popupTextStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.96,
  lineHeight: 1.6,
};

const popupOrderStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.88,
  marginTop: 6,
};
const detailBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  background: "#f8fafc",
  color: "#0f172a",
  lineHeight: 1.7,
};