import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type OrderItem = {
  id?: string | number;
  name?: string;
  price?: number;
  qty?: number;
  image?: string;
  refReview?: string;
  creatorName?: string;
  [key: string]: unknown;
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  email: string;
  address: string;
};

type OrderStatus =
  | "รอยืนยันคำสั่งซื้อ"
  | "รอตรวจสอบการชำระเงิน"
  | "ชำระเงินแล้ว"
  | "รอจัดส่ง"
  | "จัดส่งแล้ว"
  | "ได้รับสินค้าแล้ว"
  | "สำเร็จแล้ว"
  | "ยกเลิกแล้ว"
  | "อนุมัติแล้ว"
  | string;

type Order = {
  id: string;
  userId: string;
  ownerId: string;
  email: string;
  fullName: string;
  phone: string;
  address: string;
  note: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  slip: string;
  slipName: string;
  status: OrderStatus;
  createdAt: string;
  shippingAddress: ShippingAddress;
  refReview?: string;
  commissionTracked?: boolean;

  // ✅ field ใหม่
  commissionAmount?: number;
  commissionOwnerUserId?: string;
  commissionStatus?: "pending" | "requested" | "paid" | "cancelled" | "";

  /** timestamp ที่ admin กดปุ่ม "ลูกค้าได้รับของแล้ว" */
  deliveredAt?: string;
};

type CreateOrderBody = {
  email?: string;
  fullName?: string;
  phone?: string;
  address?: string;
  note?: string;
  items?: OrderItem[];
  total?: number | string;
  paymentMethod?: string;
  slip?: string;
  slipName?: string;
  shippingAddress?: Partial<ShippingAddress>;
  refReview?: string;
};

type UpdateOrderBody = {
  id?: string;
  status?: string;
  commissionStatus?: "pending" | "requested" | "paid" | "cancelled" | "";
};

type DeleteOrderBody = {
  id?: string;
};

type ReviewRecord = {
  id: string;
  userId?: string;
  title?: string;
  productId?: number;
  productIds?: number[];
  productBundleName?: string;
  status?: "pending" | "published" | "rejected" | string;
  clicks?: number;
  ordersCount?: number;
  commissionTotal?: number;
  commissionRate?: number;
  commissionOwnerUserId?: string;
  reviewType?: string;
  updatedAt?: string;

  // ✅ เพิ่มบรรทัดนี้
  creatorCode?: string;
};

type CommissionRecord = {
  id: string;
  reviewId: string;
  creatorUserId: string;
  orderId: string;
  productId: number | null;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: "pending" | "requested" | "paid" | "cancelled";
  createdAt: string;
};

type AuthUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

const ordersFile = path.join(process.cwd(), "data", "orders.json");
const reviewsFile = path.join(process.cwd(), "data", "reviews.json");
const commissionsFile = path.join(process.cwd(), "data", "commissions.json");

function ensureJsonFile(filePath: string, fallback: unknown) {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureJsonFile(filePath, fallback);
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed: unknown = raw ? JSON.parse(raw) : fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown) {
  ensureJsonFile(filePath, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function readOrders(): Order[] {
  return readJsonFile<Order[]>(ordersFile, []);
}

function writeOrders(data: Order[]) {
  writeJsonFile(ordersFile, data);
}

function readReviews(): ReviewRecord[] {
  return readJsonFile<ReviewRecord[]>(reviewsFile, []);
}

function writeReviews(data: ReviewRecord[]) {
  writeJsonFile(reviewsFile, data);
}

function readCommissions(): CommissionRecord[] {
  return readJsonFile<CommissionRecord[]>(commissionsFile, []);
}

function writeCommissions(data: CommissionRecord[]) {
  writeJsonFile(commissionsFile, data);
}

function getUserFromAuthCookie(cookieHeader: string): AuthUser | null {
  try {
    const authCookie = cookieHeader
      .split("; ")
      .find((row) => row.startsWith("auth="));

    if (!authCookie) {
      return null;
    }

    const encoded = authCookie.split("=")[1] || "";
    const decoded = decodeURIComponent(encoded);
    return JSON.parse(decoded) as AuthUser;
  } catch {
    return null;
  }
}

function getNumericOrderItemProductId(items: OrderItem[] = []) {
  for (const item of items) {
    const rawId = String(item?.id ?? "").trim();
    const numericId = Number(rawId);
    if (!Number.isNaN(numericId) && numericId > 0) {
      return numericId;
    }
  }
  return null;
}

function getEffectiveRefReview(order: Order) {
  const topLevel = String(order.refReview || "").trim();
  if (topLevel) return topLevel;

  for (const item of Array.isArray(order.items) ? order.items : []) {
    const itemRef = String(item?.refReview || "").trim();
    if (itemRef) return itemRef;
  }

  // 🔥 NEW: รองรับ creatorCode (เช่น 1124)
  const possibleCode =
    String(order.note || "").trim() ||
    String(order.fullName || "").trim();

  if (possibleCode) {
    const reviews = readReviews();

    const matched = reviews.find((r) => {
      return String(r.creatorCode || "").trim() === possibleCode;
    });

    if (matched) {
      return matched.id; // 👉 map code → review.id
    }
  }

  return "";
}

function isEligibleOrderStatusForCommission(status?: string) {
  const normalized = String(status || "").trim();
  // ✅ Commission จะ track ก็ต่อเมื่อลูกค้าได้รับสินค้าแล้วเท่านั้น
  // (ป้องกันการจ่ายคอมก่อนลูกค้ายืนยันรับของ — กรณีคืนของ/ยกเลิก)
  return (
    normalized === "ได้รับสินค้าแล้ว" ||
    normalized === "สำเร็จแล้ว"
  );
}

function orderContainsReviewProduct(order: Order, review: ReviewRecord) {
  const reviewProductIds = new Set<number>();

  if (typeof review.productId === "number" && review.productId > 0) {
    reviewProductIds.add(review.productId);
  }

  if (Array.isArray(review.productIds)) {
    for (const id of review.productIds) {
      const numericId = Number(id);
      if (!Number.isNaN(numericId) && numericId > 0) {
        reviewProductIds.add(numericId);
      }
    }
  }

  if (reviewProductIds.size === 0) {
    return true;
  }

  return (order.items || []).some((item) => {
    const numericId = Number(item?.id);
    return !Number.isNaN(numericId) && reviewProductIds.has(numericId);
  });
}

function createCommissionIfNeeded(order: Order) {
  const effectiveRefReview = getEffectiveRefReview(order);

  if (!effectiveRefReview || order.commissionTracked) {
    return;
  }

  if (!isEligibleOrderStatusForCommission(order.status)) {
    return;
  }

  // delegate ให้ฟังก์ชันใหม่ที่รองรับ multi-creator
  createCommissionsForAllItems(order);
}

/**
 * สร้าง commission records สำหรับ "ทุก item" ที่มี refReview ของตัวเอง
 * รองรับกรณี order เดียวมี items ของหลาย creators
 *
 * เรียกเมื่อ:
 * 1. status เปลี่ยนเป็น "ได้รับสินค้าแล้ว" / "สำเร็จแล้ว"
 * 2. backfill GET /orders
 *
 * Skip item ที่:
 * - ไม่มี refReview
 * - หา review ไม่เจอ
 * - review.status !== "published"
 * - มี commission record อยู่แล้ว (orderId + reviewId + productId)
 */
function createCommissionsForAllItems(order: Order) {
  if (!isEligibleOrderStatusForCommission(order.status)) {
    return;
  }

  const reviews = readReviews();
  const commissions = readCommissions();
  const now = new Date().toISOString();

  const items = order.items || [];
  let createdCount = 0;
  let totalCommission = 0;
  let firstOwnerUserId = "";

  for (const item of items) {
    const reviewId = String(item.refReview || "").trim();
    if (!reviewId) continue;

    const reviewIndex = reviews.findIndex((r) => String(r.id) === reviewId);
    if (reviewIndex === -1) continue;

    const review = reviews[reviewIndex];

    if (review.status && review.status !== "published") continue;

    const reviewType = String(review.reviewType || "").trim();
    if (reviewType && !["creator_video", "creator_slide"].includes(reviewType)) {
      continue;
    }

    const ownerUserId = String(
      review.commissionOwnerUserId || review.userId || ""
    ).trim();

    if (!ownerUserId) continue;

    const productId = Number(item.id || (item as any).productId || 0);

    // เช็คว่ามี commission record อยู่แล้วไหม (orderId + reviewId + productId)
    const alreadyExists = commissions.some(
      (c) =>
        String(c.orderId) === String(order.id) &&
        String(c.reviewId) === String(review.id) &&
        Number(c.productId) === productId
    );

    if (alreadyExists) continue;

    const qty = Number(item.qty || (item as any).quantity || 1);
    const saleAmount = Number(item.price || 0) * qty;

    if (saleAmount <= 0) continue;

    const commissionRate =
      typeof review.commissionRate === "number" && review.commissionRate > 0
        ? review.commissionRate
        : 0.1;

    const commissionAmount = Number((saleAmount * commissionRate).toFixed(2));

    if (commissionAmount <= 0) continue;

    const newCommission: CommissionRecord = {
      id: `COMM-${Date.now()}-${createdCount}`,
      reviewId: review.id,
      creatorUserId: ownerUserId,
      orderId: order.id,
      productId: productId || null,
      saleAmount,
      commissionRate,
      commissionAmount,
      status: "pending",
      createdAt: now,
    };

    commissions.unshift(newCommission);

    // อัพเดท review stats
    reviews[reviewIndex] = {
      ...review,
      commissionOwnerUserId: ownerUserId,
      ordersCount: Number(review.ordersCount || 0) + 1,
      commissionTotal: Number(
        (Number(review.commissionTotal || 0) + commissionAmount).toFixed(2)
      ),
      updatedAt: now,
    };

    createdCount++;
    totalCommission += commissionAmount;
    if (!firstOwnerUserId) firstOwnerUserId = ownerUserId;
  }

  if (createdCount > 0) {
    writeCommissions(commissions);
    writeReviews(reviews);

    // อัพเดท order — ใช้ owner ของ item แรกเป็น default (เพื่อ backward compat กับ admin/finance)
    const orders = readOrders();
    const orderIndex = orders.findIndex((o) => String(o.id) === String(order.id));
    if (orderIndex !== -1) {
      orders[orderIndex] = {
        ...orders[orderIndex],
        commissionTracked: true,
        commissionAmount: totalCommission,
        commissionOwnerUserId:
          orders[orderIndex].commissionOwnerUserId || firstOwnerUserId,
        commissionStatus: "pending",
      };
      writeOrders(orders);
    }
  }
}


// ================= GET =================
export async function GET() {
  try {
    const orders = readOrders();

    // ✅ backfill คอมมิชชั่นให้ order เก่าที่ยังไม่ได้ยิงเข้า commissions.json
    orders.forEach((order) => {
      if (!order.commissionTracked) {
        createCommissionIfNeeded(order);
      }
    });

    const finalOrders = readOrders();
    return NextResponse.json({ orders: finalOrders });
  } catch {
    return NextResponse.json(
      { success: false, message: "ไม่สามารถอ่านข้อมูลคำสั่งซื้อได้" },
      { status: 500 }
    );
  }
}

// ================= POST =================
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;

    const cookieHeader = request.headers.get("cookie") || "";
    const authUser = getUserFromAuthCookie(cookieHeader);

    const userIdFromLegacyCookie =
      cookieHeader
        .split("; ")
        .find((row) => row.startsWith("userId="))
        ?.split("=")[1] || "";

    const userId = String(authUser?.id || userIdFromLegacyCookie || "").trim();

    const shippingAddress: ShippingAddress = {
      fullName: body.shippingAddress?.fullName || body.fullName || "",
      phone: body.shippingAddress?.phone || body.phone || "",
      email: body.shippingAddress?.email || body.email || "",
      address: body.shippingAddress?.address || body.address || "",
    };

    const items = Array.isArray(body.items) ? body.items : [];
    const effectiveRefReview =
      String(body.refReview || "").trim() ||
      String(
        items.find((item) => String(item?.refReview || "").trim())?.refReview ||
          ""
      ).trim();

    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      userId,
      ownerId: userId,

      email: body.email || "",
      fullName: body.fullName || "",
      phone: body.phone || "",
      address: body.address || "",
      note: body.note || "",

      items,
      total: Number(body.total || 0),

      paymentMethod: body.paymentMethod || "cod",
      slip: body.slip || "",
      slipName: body.slipName || "",

      status: "รอยืนยันคำสั่งซื้อ",
      createdAt: new Date().toISOString(),

      shippingAddress,
      refReview: effectiveRefReview,
      commissionTracked: false,

      // ✅ ค่าเริ่มต้น
      commissionAmount: 0,
      commissionOwnerUserId: "",
      commissionStatus: "",
    };

    const orders = readOrders();
    orders.unshift(newOrder);
    writeOrders(orders);

    if (newOrder.refReview) {
      createCommissionIfNeeded(newOrder);
    }

    const finalOrders = readOrders();
    const savedOrder =
      finalOrders.find((item) => item.id === newOrder.id) || newOrder;

    return NextResponse.json({ success: true, order: savedOrder });
  } catch (error) {
    console.error("POST /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "error" },
      { status: 500 }
    );
  }
}

// ================= PUT =================
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateOrderBody;
    const orders = readOrders();

    const index = orders.findIndex((o: Order) => o.id === body.id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบคำสั่งซื้อ" },
        { status: 404 }
      );
    }

    if (typeof body.status === "string" && body.status.trim()) {
      const newStatus = body.status.trim();
      const prevStatus = String(orders[index].status || "").trim();
      orders[index].status = newStatus;

      // ✅ บันทึก timestamp เมื่อ admin เปลี่ยนสถานะเป็น "ได้รับสินค้าแล้ว"
      if (newStatus === "ได้รับสินค้าแล้ว" && !orders[index].deliveredAt) {
        orders[index].deliveredAt = new Date().toISOString();
      }

      // ✅ ถ้าเปลี่ยนสถานะเป็น "ได้รับสินค้าแล้ว" หรือ "สำเร็จแล้ว"
      // และ commissionTracked เคยเป็น true แต่อาจไม่มี commission record
      // — recheck โดย unset flag เพื่อให้ createCommissionsForAllItems ทำงาน
      const becameDelivered =
        (newStatus === "ได้รับสินค้าแล้ว" || newStatus === "สำเร็จแล้ว") &&
        prevStatus !== newStatus;

      if (becameDelivered && orders[index].commissionTracked) {
        // ตรวจว่ามี commission ครบทุก item ที่มี refReview หรือยัง
        const commissions = readCommissions();
        const itemsWithReview = (orders[index].items || []).filter(
          (it) => String(it.refReview || "").trim()
        );

        const trackedKeys = new Set(
          commissions
            .filter((c) => String(c.orderId) === String(orders[index].id))
            .map(
              (c) =>
                `${c.orderId}|${c.reviewId}|${Number(c.productId || 0)}`
            )
        );

        const allTracked = itemsWithReview.every((it) => {
          const pid = Number(it.id || (it as any).productId || 0);
          const key = `${orders[index].id}|${it.refReview}|${pid}`;
          return trackedKeys.has(key);
        });

        if (!allTracked) {
          // unset เพื่อให้ recovery ทำงาน
          orders[index].commissionTracked = false;
        }
      }
    }

    if (typeof body.commissionStatus === "string") {
      orders[index].commissionStatus = body.commissionStatus;
    }

    writeOrders(orders);

    // ถ้าคำสั่งซื้อเปลี่ยนสถานะภายหลัง ให้ลองสร้างคอมอัตโนมัติ
    createCommissionIfNeeded(orders[index]);

    const updatedOrders = readOrders();
    const updatedOrder = updatedOrders.find((o) => o.id === body.id) || orders[index];

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("PUT /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "อัปเดตคำสั่งซื้อไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

// ================= DELETE =================
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as DeleteOrderBody;
    const orders = readOrders();

    const filtered = orders.filter((o: Order) => o.id !== body.id);

    writeOrders(filtered);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/orders error:", error);
    return NextResponse.json(
      { success: false, message: "ลบคำสั่งซื้อไม่สำเร็จ" },
      { status: 500 }
    );
  }
}