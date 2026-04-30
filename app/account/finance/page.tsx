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
  status?: "pending" | "requested" | "approved" | "paid" | "rejected" | "unconfirmed" | string;
  createdAt?: string;
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

type OrderRecord = {
  id?: string;
  total?: number;
  refReview?: string;
  commissionTracked?: boolean;
  commissionAmount?: number;
  commissionStatus?: string;
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

function commissionsFromWithdraw(withdraw: WithdrawRecord): CommissionRecord[] {
  if (Array.isArray(withdraw.items) && withdraw.items.length > 0) {
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
  const [selectedWithdraw, setSelectedWithdraw] = useState<WithdrawRecord | null>(null);

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

  const selectedWithdraws = useMemo(() => {
    if (walletDetail === "unconfirmed") return [];
    if (!walletDetail || walletDetail === "pending" || walletDetail === "total") return withdraws;
    if (walletDetail === "approved") return withdraws.filter((item) => item.status === "approved");
    if (walletDetail === "paid") return withdraws.filter((item) => item.status === "paid");
    return withdraws;
  }, [walletDetail, withdraws]);

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
          setUser(JSON.parse(rawAuth));
        } catch {
          // ignore
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
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

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

        if (!cancelled) seenOrderIdsRef.current = initialIds;
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
            if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);

            setPopup({ amount, review, orderId });

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
      if (popupTimerRef.current) window.clearTimeout(popupTimerRef.current);
    };
  }, []);

  async function handleWithdraw() {
    if (derivedWallet.pending <= 0) {
      alert("ไม่มีเงินให้ถอน");
      return;
    }

    const confirmed = window.confirm(`ยืนยันการถอนเงิน ${formatMoney(derivedWallet.pending)} ?`);
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

      const res = await fetch(`/api/reviews?id=${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
        credentials: "include",
      });

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

    window.location.href = `/creator/reviews/new?reviewId=${encodeURIComponent(reviewId)}`;
  };

  const getWalletDetailTitle = () => {
    if (walletDetail === "unconfirmed") return "คอมมิชชั่นที่รอลูกค้ายืนยันรับของ";
    if (walletDetail === "pending") return "คอมมิชชั่นที่ลูกค้าได้รับของแล้ว";
    if (walletDetail === "approved") return "รายละเอียดยอดรอรับโอน";
    if (walletDetail === "paid") return "รายละเอียดยอดโอนแล้ว";
    return "รายละเอียดยอดรวมทั้งหมด";
  };

  const getWalletDetailDescription = () => {
    if (walletDetail === "unconfirmed") {
      return "ยอดนี้คือคอมมิชชั่นจากออเดอร์ที่ยังอยู่ในขั้นตอนการจัดส่ง เมื่อลูกค้ายืนยันว่าได้รับสินค้าแล้ว ยอดจะย้ายไปยืนยันแล้ว";
    }

    if (walletDetail === "pending") {
      return "ยอดนี้คือเงินคอมมิชชั่นที่ลูกค้ายืนยันรับของแล้ว พร้อมส่งคำขอถอน";
    }

    if (walletDetail === "approved") {
      return "ยอดนี้คือเงินคอมมิชชั่นที่ได้รับอนุมัติแล้ว แสดงแยกตามรีวิวและออเดอร์";
    }

    if (walletDetail === "paid") {
      return "ยอดนี้คือเงินที่แอดมินโอนให้เรียบร้อยแล้ว";
    }

    return "ยอดนี้คือยอดรวมของเครดิตทุกสถานะ ทั้งรอยืนยัน รอโอน รอตรวจสอบ และโอนแล้ว";
  };

  const walletDetailAmount =
    walletDetail === "unconfirmed"
      ? derivedWallet.unconfirmed
      : walletDetail === "pending"
        ? derivedWallet.pending
        : walletDetail === "approved"
          ? derivedWallet.approved
          : walletDetail === "paid"
            ? derivedWallet.paid
            : derivedWallet.total;

  if (loading) {
    return (
      <div className="finance-page">
        <div className="loading-box">กำลังโหลดข้อมูล...</div>
        <FinanceStyles />
      </div>
    );
  }

  return (
    <>
      <div className="finance-page">
        <div className="finance-shell">
          <aside className="creator-sidebar">
            <div className="sidebar-title">เมนูครีเอเตอร์</div>

            <a href="/account/finance" className="menu-item active">
              <span>🪙</span>
              <span>ภาพรวมการเงิน</span>
            </a>

            <a href="#withdraw-section" className="menu-item">
              <span>💸</span>
              <span>ถอนเงิน</span>
            </a>

            <a href="#withdraw-history-section" className="menu-item">
              <span>🧾</span>
              <span>ประวัติการถอนเงิน</span>
            </a>

            <a href="#reviews-section" className="menu-item">
              <span>⭐</span>
              <span>รีวิวของฉัน</span>
            </a>

            <a href="/profile" className="menu-item">
              <span>👤</span>
              <span>ข้อมูลครีเอเตอร์</span>
            </a>

            <div className="help-box">
              <b>ต้องการความช่วยเหลือ?</b>
              <span>จัดการข้อมูลครีเอเตอร์ การเงิน และรีวิวได้จากหน้านี้</span>
            </div>
          </aside>

          <main className="finance-main">
            {!isCreatorApproved ? (
              <div className="not-creator-box">
                บัญชีนี้ยังไม่ได้รับสิทธิ์ครีเอเตอร์
                <br />
                กรุณาไปที่หน้าโปรไฟล์เพื่อสมัครครีเอเตอร์ก่อน
              </div>
            ) : (
              <>
                <section className="hero-card">
                  <div className="hero-left">
                    <div className="hero-icon">🌿</div>
                    <div>
                      <h1>✅ คุณเป็นครีเอเตอร์แล้ว</h1>
                      <p>
                        ยินดีด้วย! บัญชีของคุณได้รับการอนุมัติเป็นครีเอเตอร์เรียบร้อยแล้ว
                        <br />
                        ชื่อที่แสดง: {creatorDisplayNameText}
                      </p>
                    </div>
                  </div>

                  <a href="/profile" className="hero-btn">
                    ดูโปรไฟล์ครีเอเตอร์
                  </a>
                </section>

                <section className="wallet-grid">
                  <WalletCard
                    className="wallet-gray"
                    label="รอยืนยัน"
                    value={formatMoney(derivedWallet.unconfirmed)}
                    sub="ลูกค้ายังไม่ยืนยันรับของ"
                    hint="กดดูรายละเอียด"
                    onClick={() => setWalletDetail("unconfirmed")}
                  />

                  <WalletCard
                    className="wallet-orange"
                    label="ยืนยันแล้ว (ถอนได้)"
                    value={formatMoney(derivedWallet.pending)}
                    sub="พร้อมส่งคำขอถอน"
                    hint="กดดูรายละเอียดจากรีวิว"
                    onClick={() => setWalletDetail("pending")}
                  />

                  <WalletCard
                    className="wallet-blue"
                    label="ยอดรอรับโอน"
                    value={formatMoney(derivedWallet.approved)}
                    sub="แอดมินอนุมัติแล้ว"
                    hint="กดดูรายละเอียด"
                    onClick={() => setWalletDetail("approved")}
                  />

                  <WalletCard
                    className="wallet-green"
                    label="ยอดโอนแล้ว"
                    value={formatMoney(derivedWallet.paid)}
                    sub="รับเงินแล้วทั้งหมด"
                    hint="กดดูรายละเอียด"
                    onClick={() => setWalletDetail("paid")}
                  />

                  <WalletCard
                    className="wallet-dark"
                    label="ยอดรวมทั้งหมด"
                    value={formatMoney(derivedWallet.total)}
                    sub="รวมทุกสถานะ"
                    hint="กดดูรายละเอียด"
                    onClick={() => setWalletDetail("total")}
                  />
                </section>

                {walletDetail ? (
                  <section className="section-card detail-card">
                    <div className="detail-head">
                      <div>
                        <h2>{getWalletDetailTitle()}</h2>
                        <p>{getWalletDetailDescription()}</p>
                      </div>

                      <button type="button" onClick={() => setWalletDetail(null)} className="light-btn">
                        ปิด
                      </button>
                    </div>

                    <div className="detail-amount">{formatMoney(walletDetailAmount)}</div>

                    {walletDetail === "unconfirmed" ? (
                      <CommissionList
                        title="รายการคอมมิชชั่นรอลูกค้ายืนยันรับของ"
                        emptyText="ไม่มีออเดอร์ที่กำลังจัดส่ง"
                        commissions={unconfirmedCommissions}
                        reviewTitleMap={reviewTitleMap}
                        badgeText="🚚 รอลูกค้ายืนยันรับของ"
                        badgeClass="badge-gray"
                      />
                    ) : null}

                    {walletDetail === "pending" ? (
                      <CommissionList
                        title="รายการคอมมิชชั่นรอโอนจากรีวิว"
                        emptyText="ยังไม่พบรายการรีวิวที่สร้างคอมมิชชั่นรอโอน"
                        commissions={pendingCommissions}
                        reviewTitleMap={reviewTitleMap}
                        badgeText="รอโอน"
                        badgeClass="badge-orange"
                      />
                    ) : null}

                    {walletDetail === "approved" ? (
                      <CommissionList
                        title="รายการคอมมิชชั่นที่ได้รับอนุมัติ"
                        emptyText="ยังไม่มีรายการคอมมิชชั่นที่ได้รับอนุมัติ"
                        commissions={approvedCommissions}
                        reviewTitleMap={reviewTitleMap}
                        badgeText="ได้รับอนุมัติ"
                        badgeClass="badge-blue"
                      />
                    ) : null}

                    {walletDetail === "paid" ? (
                      <CommissionList
                        title="รายการคอมมิชชั่นที่โอนแล้ว"
                        emptyText="ยังไม่มีรายการคอมมิชชั่นที่โอนแล้ว"
                        commissions={paidCommissions}
                        reviewTitleMap={reviewTitleMap}
                        badgeText="โอนแล้ว"
                        badgeClass="badge-green"
                      />
                    ) : null}

                    {walletDetail === "total" ? (
                      <div className="detail-block">
                        <h3>รายการที่เกี่ยวข้อง</h3>
                        {selectedWithdraws.length === 0 ? (
                          <div className="empty-box">ยังไม่มีรายการในสถานะนี้</div>
                        ) : (
                          <div className="list-grid">
                            {selectedWithdraws.map((item) => (
                              <WithdrawMiniRow key={item.id} item={item} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </section>
                ) : null}

                <section id="withdraw-section" className="section-card">
                  <h2>วิธีรับเงินปัจจุบัน</h2>

                  <div className="payment-box">
                    <div>
                      <b>ชื่อครีเอเตอร์:</b> {user?.creatorDisplayName || "-"}
                    </div>

                    {user?.creatorPayment?.promptPay ? (
                      <>
                        <div>
                          <b>ประเภท:</b> พร้อมเพย์
                        </div>
                        <div>
                          <b>พร้อมเพย์:</b> {user.creatorPayment.promptPay || "-"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <b>ประเภท:</b> โอนธนาคาร
                        </div>
                        <div>
                          <b>ธนาคาร:</b> {user?.creatorPayment?.bankName || "-"}
                        </div>
                        <div>
                          <b>ชื่อบัญชี:</b> {user?.creatorPayment?.accountName || "-"}
                        </div>
                        <div>
                          <b>เลขบัญชี:</b> {user?.creatorPayment?.accountNumber || "-"}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || derivedWallet.pending <= 0}
                    className="withdraw-btn"
                  >
                    {withdrawing
                      ? "กำลังส่งคำขอถอน..."
                      : `ถอนเงิน ${formatMoney(derivedWallet.pending)}`}
                  </button>
                </section>

                <section id="withdraw-history-section" className="section-card">
                  <h2>ประวัติการถอนเงิน</h2>

                  {withdraws.length === 0 ? (
                    <div className="empty-box">ยังไม่มีประวัติการถอนเงิน</div>
                  ) : (
                    <div className="list-grid">
                      {withdraws.map((item) => (
                        <div key={item.id} className="withdraw-row">
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedWithdraw(item)}
                              className="withdraw-id-btn"
                            >
                              เลขที่คำขอ: {item.id} 🔍
                            </button>
                            <div className="muted-small">วันที่: {formatThaiDate(item.createdAt)}</div>
                          </div>

                          <div>
                            <div className="row-label">จำนวนเงิน</div>
                            <div className="row-value">{formatMoney(item.amount)}</div>
                          </div>

                          <div>
                            <div className="row-label">สถานะ</div>
                            <StatusBadge status={item.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section id="reviews-section" className="section-card">
                  <div className="review-header">
                    <h2>รีวิวของฉัน</h2>
                    <a href="/orders" className="create-review-btn">
                      สร้างรีวิวใหม่
                    </a>
                  </div>

                  {loadingReviews ? (
                    <div className="empty-box">กำลังโหลดรีวิวของฉัน...</div>
                  ) : myReviews.length === 0 ? (
                    <div className="empty-box">ยังไม่มีรีวิวของครีเอเตอร์คนนี้</div>
                  ) : (
                    <div className="review-list">
                      {myReviews.map((review) => (
                        <div key={review.id} className="review-card">
                          <div className="review-top">
                            <div>
                              <h3>{review.title || "-"}</h3>
                              <p>สินค้า: {getProductName(review)}</p>
                              <span>
                                สถานะ: {review.status || "-"} • วันที่:{" "}
                                {review.createdAt
                                  ? new Date(review.createdAt).toLocaleDateString("th-TH")
                                  : "-"}
                              </span>
                            </div>

                            <div className="review-actions">
                              <button type="button" onClick={() => goToEditReview(review)} className="edit-btn">
                                แก้ไข
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={deletingReviewId === review.id}
                                className="delete-btn"
                              >
                                {deletingReviewId === review.id ? "กำลังลบ..." : "ลบ"}
                              </button>
                            </div>
                          </div>

                          <div className="slides-grid">
                            {(review.slides || []).map((slide, index) => (
                              <div key={`${review.id}-${slide.key}-${index}`} className="slide-item">
                                <div className="slide-img-wrap">
                                  <img src={slide.img || "/no-image.png"} alt={slide.text || `slide-${index + 1}`} />
                                </div>
                                <div className="slide-text">{slide.text || "-"}</div>
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

      {selectedWithdraw ? (
        <WithdrawModal
          selectedWithdraw={selectedWithdraw}
          reviewTitleMap={reviewTitleMap}
          onClose={() => setSelectedWithdraw(null)}
        />
      ) : null}

      {popup ? (
        <div className="popup">
          <div className="popup-title">💸 ได้รับเงิน +{popup.amount} บาท</div>
          <div className="popup-text">จากรีวิว: {popup.review}</div>
          <div className="popup-order">ออเดอร์: {popup.orderId}</div>
        </div>
      ) : null}

      <FinanceStyles />
    </>
  );
}

function WalletCard(props: {
  className: string;
  label: string;
  value: string;
  sub: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={props.onClick} className={`wallet-card ${props.className}`}>
      <div className="wallet-label">{props.label}</div>
      <div className="wallet-value">{props.value}</div>
      <div className="wallet-sub">{props.sub}</div>
      <div className="wallet-hint">{props.hint}</div>
    </button>
  );
}

function CommissionList(props: {
  title: string;
  emptyText: string;
  commissions: CommissionRecord[];
  reviewTitleMap: Map<string, string>;
  badgeText: string;
  badgeClass: string;
}) {
  return (
    <div className="detail-block">
      <h3>{props.title}</h3>

      {props.commissions.length === 0 ? (
        <div className="empty-box">{props.emptyText}</div>
      ) : (
        <div className="list-grid">
          {props.commissions.map((commission) => {
            const reviewId = String(commission.reviewId || "-");
            const reviewTitle = props.reviewTitleMap.get(reviewId) || reviewId;

            return (
              <div key={String(commission.id || reviewId)} className="commission-row">
                <div className="commission-main">
                  <div className="commission-title">รีวิว: {reviewTitle}</div>
                  <div className="commission-meta">Review ID: {reviewId}</div>
                  <div className="commission-meta">Order ID: {commission.orderId || "-"}</div>
                  <div className="commission-meta">วันที่: {formatThaiDate(commission.createdAt)}</div>
                </div>

                <div>
                  <div className="row-label">ยอดขาย</div>
                  <div className="row-value">{formatMoney(getCommissionSaleAmount(commission))}</div>
                </div>

                <div>
                  <div className="row-label">คอมมิชชั่น</div>
                  <div className="commission-amount">{formatMoney(getCommissionAmount(commission))}</div>
                </div>

                <div className={`status-badge ${props.badgeClass}`}>
                  {props.badgeText || getCommissionStatusText(commission.status)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WithdrawMiniRow({ item }: { item: WithdrawRecord }) {
  return (
    <div className="mini-withdraw-row">
      <div>
        <div className="mini-withdraw-id">{item.id}</div>
        <div className="muted-small">{formatThaiDate(item.createdAt)}</div>
      </div>

      <div className="mini-withdraw-amount">{formatMoney(item.amount)}</div>

      <StatusBadge status={item.status} />
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const cls =
    status === "paid"
      ? "badge-green"
      : status === "rejected"
        ? "badge-red"
        : status === "approved"
          ? "badge-blue"
          : "badge-orange";

  return <div className={`status-badge ${cls}`}>{getWithdrawStatusText(status)}</div>;
}

function WithdrawModal({
  selectedWithdraw,
  reviewTitleMap,
  onClose,
}: {
  selectedWithdraw: WithdrawRecord;
  reviewTitleMap: Map<string, string>;
  onClose: () => void;
}) {
  const breakdown = commissionsFromWithdraw(selectedWithdraw);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>รายละเอียดคำขอถอน</h2>
            <p>เลขคำขอ {selectedWithdraw.id}</p>
          </div>

          <button type="button" onClick={onClose} className="light-btn">
            ปิด
          </button>
        </div>

        <div className="modal-detail-grid">
          <div className="detail-box">
            เลขคำขอ
            <br />
            <b>{selectedWithdraw.id}</b>
          </div>

          <div className="detail-box">
            จำนวนเงิน
            <br />
            <b>{formatMoney(selectedWithdraw.amount)}</b>
          </div>

          <div className="detail-box">
            สถานะ
            <br />
            <b>{getWithdrawStatusText(selectedWithdraw.status)}</b>
          </div>

          <div className="detail-box">
            วันที่ขอถอน
            <br />
            <b>{formatThaiDate(selectedWithdraw.createdAt)}</b>
          </div>
        </div>

        <h3 className="modal-section-title">คอมมิชชั่นที่ประกอบเป็นยอดถอนนี้</h3>

        {breakdown.length === 0 ? (
          <div className="empty-box warning">
            <b>ℹ️ ไม่มีรายละเอียดคอมมิชชั่นย้อนหลัง</b>
            <br />
            คำขอถอนนี้ถูกสร้างก่อนระบบจะเริ่มเก็บ snapshot รายการคอมมิชชั่น
            ระบบจึงไม่สามารถแสดงรายการที่ประกอบเป็นยอด{" "}
            <b>{formatMoney(selectedWithdraw.amount)}</b> นี้ได้แม่นยำ
          </div>
        ) : (
          <div className="list-grid">
            {breakdown.map((c) => {
              const reviewId = String(c.reviewId || "");
              return (
                <div key={c.id} className="commission-row">
                  <div className="commission-main">
                    <div className="commission-title">
                      รีวิว: {reviewTitleMap.get(reviewId) || c.reviewId}
                    </div>
                    <div className="commission-meta">Order: {c.orderId}</div>
                    <div className="commission-meta">Product: {c.productId}</div>
                  </div>

                  <div>
                    <div className="row-label">ยอดขาย</div>
                    <div className="row-value">{formatMoney(getCommissionSaleAmount(c))}</div>
                  </div>

                  <div>
                    <div className="row-label">คอม</div>
                    <div className="commission-amount">{formatMoney(getCommissionAmount(c))}</div>
                  </div>

                  <div className="status-badge badge-blue">{getCommissionStatusText(c.status)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceStyles() {
  return (
    <style jsx global>{`
      .finance-page {
        max-width: 1320px;
        margin: 24px auto;
        padding: 0 16px 40px;
      }

      .finance-shell {
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr);
        gap: 20px;
        align-items: start;
      }

      .finance-main {
        min-width: 0;
      }

      .creator-sidebar,
      .section-card,
      .hero-card,
      .loading-box,
      .not-creator-box {
        background: #fff;
        border: 1px solid #eef2f6;
        border-radius: 24px;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
      }

      .creator-sidebar {
        padding: 20px;
        position: sticky;
        top: 90px;
      }

      .sidebar-title {
        font-size: 22px;
        font-weight: 900;
        color: #0f172a;
        margin-bottom: 18px;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 44px;
        padding: 10px 12px;
        border-radius: 14px;
        text-decoration: none;
        font-weight: 800;
        margin-bottom: 8px;
        color: #334155;
        border: 1px solid transparent;
        white-space: nowrap;
      }

      .menu-item.active {
        background: #fff1ee;
        color: #ee4d2d;
        border-color: #ffd2c6;
      }

      .help-box {
        margin-top: 18px;
        border-radius: 16px;
        background: #f8fbff;
        border: 1px solid #dbeafe;
        padding: 14px;
        color: #64748b;
        font-size: 13px;
        line-height: 1.5;
        display: grid;
        gap: 6px;
      }

      .hero-card {
        background: #fff7f2;
        border-color: #ffe2d5;
        padding: 24px;
        margin-bottom: 22px;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
      }

      .hero-left {
        display: flex;
        gap: 16px;
        align-items: center;
        min-width: 0;
      }

      .hero-icon {
        width: 74px;
        height: 74px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #ffd8bf;
        font-size: 34px;
        flex-shrink: 0;
      }

      .hero-card h1 {
        font-size: 20px;
        font-weight: 900;
        color: #0f172a;
        margin: 0 0 6px;
      }

      .hero-card p {
        color: #64748b;
        font-weight: 700;
        line-height: 1.6;
        margin: 0;
      }

      .hero-btn,
      .light-btn {
        min-height: 44px;
        padding: 0 16px;
        border-radius: 14px;
        background: #fff;
        color: #334155;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
        border: 1px solid #e2e8f0;
        cursor: pointer;
        white-space: nowrap;
      }

      .wallet-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 16px;
        margin-bottom: 22px;
      }

      .wallet-card {
        border: none;
        border-radius: 20px;
        padding: 18px;
        color: #fff;
        min-height: 132px;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
        text-align: left;
        cursor: pointer;
        min-width: 0;
      }

      .wallet-gray {
        background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%);
      }

      .wallet-orange {
        background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
      }

      .wallet-blue {
        background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%);
      }

      .wallet-green {
        background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
      }

      .wallet-dark {
        background: linear-gradient(135deg, #0f172a 0%, #334155 100%);
      }

      .wallet-label {
        font-size: 14px;
        font-weight: 900;
        opacity: 0.95;
        margin-bottom: 14px;
      }

      .wallet-value {
        font-size: clamp(24px, 3vw, 34px);
        font-weight: 900;
        line-height: 1.1;
        margin-bottom: 10px;
        word-break: break-word;
      }

      .wallet-sub {
        font-size: 14px;
        opacity: 0.95;
        line-height: 1.5;
        font-weight: 700;
      }

      .wallet-hint {
        margin-top: 8px;
        font-size: 12px;
        font-weight: 900;
        opacity: 0.85;
      }

      .section-card {
        padding: 24px;
        margin-bottom: 22px;
        min-width: 0;
      }

      .section-card h2,
      .detail-card h2 {
        font-size: 24px;
        font-weight: 900;
        color: #0f172a;
        margin: 0 0 16px;
      }

      .detail-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
      }

      .detail-head p {
        color: #64748b;
        font-weight: 700;
        line-height: 1.6;
        margin: 0;
      }

      .detail-amount {
        margin-top: 18px;
        font-size: clamp(28px, 5vw, 38px);
        font-weight: 900;
        color: #0f172a;
        word-break: break-word;
      }

      .detail-block {
        margin-top: 18px;
      }

      .detail-block h3 {
        font-size: 16px;
        font-weight: 900;
        color: #0f172a;
        margin: 0 0 10px;
      }

      .list-grid,
      .review-list {
        display: grid;
        gap: 12px;
      }

      .commission-row {
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        padding: 16px;
        background: #fff;
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(100px, 0.7fr) minmax(100px, 0.7fr) auto;
        gap: 12px;
        align-items: center;
      }

      .commission-main {
        min-width: 0;
      }

      .commission-title {
        font-size: 16px;
        font-weight: 900;
        color: #0f172a;
        margin-bottom: 4px;
        overflow-wrap: anywhere;
      }

      .commission-meta,
      .muted-small {
        color: #64748b;
        font-size: 12px;
        line-height: 1.6;
        overflow-wrap: anywhere;
      }

      .row-label {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 4px;
        font-weight: 700;
      }

      .row-value,
      .mini-withdraw-amount {
        font-size: 18px;
        color: #0f172a;
        font-weight: 900;
      }

      .commission-amount {
        font-size: 20px;
        color: #f97316;
        font-weight: 900;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 34px;
        padding: 0 12px;
        border-radius: 999px;
        border: 1px solid transparent;
        font-weight: 900;
        font-size: 13px;
        white-space: nowrap;
      }

      .badge-green {
        background: #ecfdf5;
        color: #166534;
        border-color: #86efac;
      }

      .badge-blue {
        background: #eff6ff;
        color: #1d4ed8;
        border-color: #93c5fd;
      }

      .badge-orange {
        background: #fff7ed;
        color: #9a3412;
        border-color: #fdba74;
      }

      .badge-red {
        background: #fef2f2;
        color: #991b1b;
        border-color: #fca5a5;
      }

      .badge-gray {
        background: #f1f5f9;
        color: #475569;
        border-color: #cbd5e1;
      }

      .payment-box,
      .detail-box {
        border-radius: 18px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        padding: 18px;
        line-height: 1.9;
        color: #0f172a;
        overflow-wrap: anywhere;
      }

      .withdraw-btn {
        margin-top: 18px;
        height: 56px;
        width: 100%;
        border-radius: 16px;
        border: none;
        background: linear-gradient(135deg, #ee4d2d 0%, #ff7337 100%);
        color: #fff;
        font-weight: 900;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 12px 24px rgba(238, 77, 45, 0.18);
      }

      .withdraw-btn:disabled {
        background: #cbd5e1;
        cursor: not-allowed;
        box-shadow: none;
      }

      .withdraw-row,
      .mini-withdraw-row {
        border: 1px solid #e5e7eb;
        border-radius: 18px;
        padding: 16px;
        background: #fff;
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr);
        gap: 12px;
        align-items: center;
      }

      .mini-withdraw-row {
        grid-template-columns: minmax(0, 1fr) auto auto;
        padding: 12px;
        border-radius: 14px;
      }

      .withdraw-id-btn {
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
        color: #2563eb;
        font-weight: 900;
        margin-bottom: 4px;
        text-align: left;
        overflow-wrap: anywhere;
      }

      .empty-box {
        border: 1px dashed #d5d9e0;
        border-radius: 16px;
        padding: 20px;
        color: #64748b;
        background: #fff;
        line-height: 1.7;
      }

      .empty-box.warning {
        background: #fff7ed;
        border-color: #fed7aa;
        color: #9a3412;
      }

      .review-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }

      .review-header h2 {
        margin-bottom: 0;
      }

      .create-review-btn {
        height: 44px;
        padding: 0 16px;
        border-radius: 14px;
        background: #ee4d2d;
        color: #fff;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
      }

      .review-card {
        border: 1px solid #e5e7eb;
        border-radius: 20px;
        padding: 16px;
        background: #fff;
      }

      .review-top {
        display: flex;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        align-items: flex-start;
      }

      .review-top h3 {
        font-weight: 900;
        font-size: 18px;
        color: #0f172a;
        margin: 0;
      }

      .review-top p {
        color: #64748b;
        margin: 6px 0 0;
        font-size: 14px;
      }

      .review-top span {
        color: #64748b;
        margin-top: 4px;
        font-size: 13px;
        display: block;
      }

      .review-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .edit-btn,
      .delete-btn {
        height: 42px;
        padding: 0 14px;
        border-radius: 12px;
        border: none;
        color: #fff;
        font-weight: 900;
        cursor: pointer;
      }

      .edit-btn {
        background: #111827;
      }

      .delete-btn {
        background: #dc2626;
      }

      .slides-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin-top: 16px;
      }

      .slide-img-wrap {
        width: 100%;
        aspect-ratio: 4 / 5;
        border-radius: 12px;
        overflow: hidden;
        background: #f8fafc;
        border: 1px solid #e5e7eb;
      }

      .slide-img-wrap img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .slide-text {
        font-size: 12px;
        line-height: 1.45;
        color: #334155;
        margin-top: 6px;
      }

      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        z-index: 99999;
        display: grid;
        place-items: center;
        padding: 20px;
      }

      .modal-card {
        background: #fff;
        width: min(900px, 100%);
        border-radius: 24px;
        padding: 24px;
        max-height: 85vh;
        overflow: auto;
      }

      .modal-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
      }

      .modal-head h2 {
        font-size: 28px;
        font-weight: 900;
        margin: 0 0 4px;
      }

      .modal-head p {
        color: #64748b;
        margin: 0;
      }

      .modal-detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
      }

      .modal-section-title {
        font-weight: 900;
        font-size: 20px;
        margin: 0 0 12px;
      }

      .popup {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 9999;
        min-width: 320px;
        max-width: 420px;
        border-radius: 18px;
        padding: 16px 18px;
        background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
        color: #fff;
        box-shadow: 0 18px 38px rgba(0, 0, 0, 0.22);
        border: 1px solid rgba(255, 255, 255, 0.22);
      }

      .popup-title {
        font-size: 22px;
        font-weight: 900;
        line-height: 1.1;
        margin-bottom: 6px;
      }

      .popup-text {
        font-size: 13px;
        opacity: 0.96;
        line-height: 1.6;
      }

      .popup-order {
        font-size: 12px;
        opacity: 0.88;
        margin-top: 6px;
      }

      .loading-box,
      .not-creator-box {
        padding: 28px;
        color: #64748b;
        font-weight: 700;
      }

      .not-creator-box {
        color: #9a3412;
        line-height: 1.8;
      }

      @media (max-width: 1180px) {
        .wallet-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .wallet-dark {
          grid-column: span 2;
        }

        .commission-row {
          grid-template-columns: minmax(0, 1fr) minmax(100px, auto) minmax(100px, auto);
        }

        .commission-row .status-badge {
          grid-column: 1 / -1;
          justify-self: start;
        }

        .slides-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 820px) {
        .finance-page {
          margin: 12px auto;
          padding: 0 10px 28px;
        }

        .finance-shell {
          display: block;
        }

        .creator-sidebar {
          position: relative;
          top: auto;
          padding: 12px;
          border-radius: 18px;
          margin-bottom: 14px;
          overflow-x: auto;
          display: flex;
          gap: 8px;
          align-items: center;
          scrollbar-width: thin;
        }

        .sidebar-title,
        .help-box {
          display: none;
        }

        .menu-item {
          margin: 0;
          flex: 0 0 auto;
          min-height: 40px;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
        }

        .hero-card {
          border-radius: 18px;
          padding: 16px;
          display: grid;
          gap: 14px;
        }

        .hero-left {
          align-items: flex-start;
        }

        .hero-icon {
          width: 52px;
          height: 52px;
          font-size: 24px;
        }

        .hero-card h1 {
          font-size: 18px;
        }

        .hero-card p {
          font-size: 13px;
        }

        .hero-btn {
          width: 100%;
        }

        .wallet-grid {
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .wallet-dark {
          grid-column: auto;
        }

        .wallet-card {
          min-height: auto;
          padding: 16px;
          border-radius: 18px;
        }

        .wallet-label {
          margin-bottom: 8px;
        }

        .wallet-value {
          font-size: 30px;
        }

        .section-card {
          padding: 16px;
          border-radius: 18px;
          margin-bottom: 14px;
        }

        .section-card h2,
        .detail-card h2 {
          font-size: 20px;
        }

        .detail-head {
          display: grid;
          gap: 12px;
        }

        .light-btn {
          width: 100%;
        }

        .commission-row,
        .withdraw-row,
        .mini-withdraw-row {
          grid-template-columns: 1fr;
          gap: 10px;
          border-radius: 16px;
        }

        .commission-row .status-badge {
          grid-column: auto;
        }

        .status-badge {
          width: fit-content;
          max-width: 100%;
          white-space: normal;
          text-align: center;
        }

        .payment-box {
          font-size: 14px;
          padding: 14px;
        }

        .withdraw-btn {
          height: 52px;
          font-size: 16px;
        }

        .review-header {
          display: grid;
          gap: 10px;
        }

        .create-review-btn {
          width: 100%;
        }

        .review-top {
          display: grid;
        }

        .review-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          width: 100%;
        }

        .edit-btn,
        .delete-btn {
          width: 100%;
        }

        .slides-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .modal-backdrop {
          padding: 10px;
          align-items: end;
        }

        .modal-card {
          width: 100%;
          max-height: 90vh;
          border-radius: 22px 22px 0 0;
          padding: 16px;
        }

        .modal-head {
          display: grid;
        }

        .modal-head h2 {
          font-size: 22px;
        }

        .modal-detail-grid {
          grid-template-columns: 1fr;
        }

        .popup {
          right: 10px;
          left: 10px;
          bottom: 10px;
          min-width: 0;
          max-width: none;
        }
      }

      @media (max-width: 420px) {
        .finance-page {
          padding-left: 8px;
          padding-right: 8px;
        }

        .wallet-value {
          font-size: 26px;
        }

        .slides-grid {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  );
}