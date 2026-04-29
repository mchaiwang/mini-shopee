import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

type CommissionRecord = {
  id: string;
  reviewId?: string;
  creatorUserId?: string;
  commissionOwnerUserId?: string;
  userId?: string;
  orderId?: string;
  productId?: number | string | null;
  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  amount?: number;
  status?: "pending" | "requested" | "approved" | "paid" | "rejected" | "cancelled" | string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
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
  updatedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  rejectedAt?: string;
  /**
   * Snapshot ของ commission ที่ประกอบเป็น withdraw นี้ ณ ตอนสร้าง
   * เก็บเพื่อให้ pop-up แสดงรายการได้ถูกต้องแม้ commission อื่นจะเปลี่ยนแปลงภายหลัง
   */
  items?: WithdrawCommissionItem[];
};

type AuthUser = {
  id?: string;
  role?: string;
};

const ordersFile = path.join(process.cwd(), "data", "orders.json");
const commissionsFile = path.join(process.cwd(), "data", "commissions.json");
const withdrawsFile = path.join(process.cwd(), "data", "withdraws.json");
const reviewsFile = path.join(process.cwd(), "data", "reviews.json");
const productsFile = path.join(process.cwd(), "data", "products.json");
const usersFile = path.join(process.cwd(), "data", "users.json");

function ensureJsonFile(filePath: string, fallback: unknown) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    ensureJsonFile(filePath, fallback);
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, data: unknown) {
  ensureJsonFile(filePath, []);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function asArray(raw: any, key?: string) {
  if (Array.isArray(raw)) return raw;
  if (key && Array.isArray(raw?.[key])) return raw[key];
  return [];
}

function getUserFromCookie(cookieHeader: string): AuthUser | null {
  try {
    const authCookie = cookieHeader.split("; ").find((row) => row.startsWith("auth="));
    if (!authCookie) return null;
    const encoded = authCookie.split("=")[1] || "";
    return JSON.parse(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}

function getCommissionOwnerId(c: any) {
  return String(c.creatorUserId || c.commissionOwnerUserId || c.userId || "").trim();
}

function getCommissionAmount(c: any) {
  return Number(c.commissionAmount ?? c.amount ?? 0);
}

/**
 * เช็คว่า commission record มีข้อมูลครบเป็น "ของจริง" หรือไม่
 * (ตรงกับ admin/commissions/route.ts เพื่อให้ admin/creator เห็นยอดตรงกัน)
 */
function isRealCommission(commission: any): boolean {
  const reviewId = String(commission.reviewId || "").trim();
  const creatorUserId = String(
    commission.creatorUserId || commission.userId || ""
  ).trim();
  const productId = String(commission.productId || "").trim();

  const saleAmount = Number(commission.saleAmount || 0);
  const amount = Number(
    commission.commissionAmount ?? commission.amount ?? 0
  );

  if (!reviewId) return false;
  if (!creatorUserId) return false;
  if (!productId) return false;
  if (saleAmount <= 0) return false;
  if (amount <= 0) return false;

  return true;
}

/**
 * ล้าง orphan commissions — record ที่อ้างถึง entity ที่ถูกลบไปแล้ว
 * (สอดคล้องกับ logic ใน admin/commissions/route.ts)
 */
function cleanupOrphanCommissions(): any[] {
  const commissionsRaw = readJsonFile<any>(commissionsFile, []);
  const ordersRaw = readJsonFile<any>(ordersFile, []);
  const usersRaw = readJsonFile<any>(usersFile, []);
  const reviewsRaw = readJsonFile<any>(reviewsFile, []);
  const productsRaw = readJsonFile<any>(productsFile, []);

  const allCommissions = asArray(commissionsRaw, "commissions");
  const orders = asArray(ordersRaw, "orders");
  const users = asArray(usersRaw, "users");
  const reviews = asArray(reviewsRaw, "reviews");
  const products = asArray(productsRaw, "products");

  const orderIds = new Set(orders.map((o: any) => String(o.id)));
  const reviewIds = new Set(reviews.map((r: any) => String(r.id)));
  const userIds = new Set(users.map((u: any) => String(u.id)));
  const productIds = new Set(products.map((p: any) => String(p.id)));

  const cleaned = allCommissions.filter((c: any) => {
    if (!isRealCommission(c)) return false;

    const orderId = String(c.orderId || "");
    const reviewId = String(c.reviewId || "");
    const creatorUserId = String(c.creatorUserId || c.userId || "");
    const productId = String(c.productId || "");

    if (!orderIds.has(orderId)) return false;
    if (!reviewIds.has(reviewId)) return false;
    if (!userIds.has(creatorUserId)) return false;
    if (!productIds.has(productId)) return false;

    return true;
  });

  if (cleaned.length !== allCommissions.length) {
    writeJsonFile(
      commissionsFile,
      Array.isArray(commissionsRaw)
        ? cleaned
        : { ...commissionsRaw, commissions: cleaned }
    );
  }

  return cleaned;
}

function normalizeStatus(status?: string) {
  return String(status || "pending").trim() || "pending";
}

function buildRowsForCreator(userId: string) {
  const commissionsRaw = readJsonFile<any>(commissionsFile, []);
  const ordersRaw = readJsonFile<any>(ordersFile, []);
  const reviewsRaw = readJsonFile<any>(reviewsFile, []);
  const productsRaw = readJsonFile<any>(productsFile, []);
  const usersRaw = readJsonFile<any>(usersFile, []);

  const commissionsAll = asArray(commissionsRaw, "commissions");
  const orders = asArray(ordersRaw, "orders");
  const reviews = asArray(reviewsRaw, "reviews");
  const products = asArray(productsRaw, "products");
  const users = asArray(usersRaw, "users");

  // ✅ filter ตามมาตรฐานเดียวกับ admin/commissions
  const orderIds = new Set(orders.map((o: any) => String(o.id)));
  const reviewIds = new Set(reviews.map((r: any) => String(r.id)));
  const userIds = new Set(users.map((u: any) => String(u.id)));
  const productIds = new Set(products.map((p: any) => String(p.id)));

  const commissions = commissionsAll
    .filter(isRealCommission)
    .filter((c: any) => {
      const orderId = String(c.orderId || "");
      const reviewId = String(c.reviewId || "");
      const creatorUserId = String(c.creatorUserId || c.userId || "");
      const productId = String(c.productId || "");
      return (
        orderIds.has(orderId) &&
        reviewIds.has(reviewId) &&
        userIds.has(creatorUserId) &&
        productIds.has(productId)
      );
    });

  const rowsFromCommissions = commissions
    .map((commission: any) => {
      const orderId = String(commission.orderId || "");
      const reviewId = String(commission.reviewId || "");
      const productId = String(commission.productId || "");
      const order = orders.find((o: any) => String(o.id) === orderId);
      const review = reviews.find((r: any) => String(r.id) === reviewId);
      const ownerId = String(
        getCommissionOwnerId(commission) ||
          review?.commissionOwnerUserId ||
          review?.userId ||
          order?.commissionOwnerUserId ||
          ""
      );

      const matchedItem = (order?.items || []).find((item: any) => {
        return (
          String(item.id || item.productId || "") === productId ||
          String(item.refReview || "") === reviewId
        );
      });

      const product = products.find((p: any) => String(p.id) === productId);
      const saleAmount = Number(
        commission.saleAmount ??
          (matchedItem
            ? Number(matchedItem.price || 0) * Number(matchedItem.qty || matchedItem.quantity || 1)
            : order?.total || 0)
      );
      const commissionRate = Number(
        commission.commissionRate ?? review?.commissionRate ?? product?.commissionRate ?? 0.1
      );
      // ✅ คำนวณจาก sale × rate ก่อน (กัน case ที่ commissionAmount = 0)
      const explicitCommissionAmount = Number(commission.commissionAmount || commission.amount || 0);
      const calculatedCommissionAmount = Number((saleAmount * commissionRate).toFixed(2));
      const commissionAmount =
        explicitCommissionAmount > 0
          ? explicitCommissionAmount
          : calculatedCommissionAmount;

      // ✅ ถ้า order ยังไม่ "ได้รับสินค้าแล้ว"/"สำเร็จแล้ว"
      // override status เป็น "unconfirmed" — ไม่ว่า commission record จะมี status อะไร
      // (กัน stale data จาก patch รุ่นก่อน + business rule ใหม่: commission ใช้ได้เมื่อรับของแล้วเท่านั้น)
      const orderStatus = String(order?.status || "").trim();
      const isDelivered =
        orderStatus === "ได้รับสินค้าแล้ว" || orderStatus === "สำเร็จแล้ว";

      const finalStatus = isDelivered
        ? normalizeStatus(commission.status || order?.commissionStatus)
        : "unconfirmed";

      return {
        id: String(commission.id || `${orderId}-${reviewId}-${productId}`),
        reviewId,
        creatorUserId: ownerId,
        orderId,
        productId,
        saleAmount,
        commissionRate,
        commissionAmount,
        amount: commissionAmount,
        status: finalStatus,
        createdAt: commission.createdAt || order?.createdAt || "",
        updatedAt: commission.updatedAt || order?.commissionUpdatedAt || "",
        approvedAt: commission.approvedAt || order?.commissionApprovedAt || null,
        paidAt: commission.paidAt || order?.commissionPaidAt || null,
      };
    })
    .filter((row: any) => String(row.creatorUserId) === String(userId));

  const existingKeys = new Set(
    rowsFromCommissions.map((row: any) => `${row.orderId}|${row.reviewId}|${row.productId}`)
  );

  const rowsFromOrderItems: CommissionRecord[] = [];

  orders.forEach((order: any) => {
    (order.items || []).forEach((item: any, index: number) => {
      const reviewId = String(item.refReview || order.refReview || "").trim();
      if (!reviewId) return;

      const productId = String(item.id || item.productId || "");
      const key = `${order.id}|${reviewId}|${productId}`;
      if (existingKeys.has(key)) return;

      const review = reviews.find((r: any) => String(r.id) === reviewId);
      const product = products.find((p: any) => String(p.id) === productId);

      // ✅ Priority resolution:
      // 1. item.creatorUserId (ถ้า frontend บันทึกไว้)
      // 2. review.commissionOwnerUserId / review.userId (ตรงที่สุดเพราะ item มี refReview ระบุชัด)
      // 3. order.commissionOwnerUserId (fallback — แต่ order ที่มีหลาย creators จะให้ค่าแค่ creator เดียว)
      const creatorUserId = String(
        item.creatorUserId ||
          review?.commissionOwnerUserId ||
          review?.userId ||
          order.commissionOwnerUserId ||
          ""
      );

      if (String(creatorUserId) !== String(userId)) return;

      const qty = Number(item.qty || item.quantity || 1);
      const saleAmount = Number(item.price || 0) * qty;
      const rate = Number(item.commissionRate || review?.commissionRate || product?.commissionRate || 0.1);

      // ✅ คำนวณ amount จาก sale × rate เสมอ (ใช้ค่า explicit เฉพาะกรณี > 0)
      // ไม่ใช่ ?? เพราะ 0 ?? x จะคืน 0 (nullish coalescing ผ่านเฉพาะ undefined/null)
      const explicitItemAmount = Number(item.commissionAmount || 0);
      const explicitOrderAmount = Number(order.commissionAmount || 0);
      const calculatedAmount = Number((saleAmount * rate).toFixed(2));

      const amount =
        explicitItemAmount > 0
          ? explicitItemAmount
          : explicitOrderAmount > 0
            ? explicitOrderAmount
            : calculatedAmount;

      // ✅ ถ้า order ยังไม่ "ได้รับสินค้าแล้ว"/"สำเร็จแล้ว" — commission อยู่ในสถานะ "unconfirmed" (รอยืนยัน)
      const orderStatus = String(order.status || "").trim();
      const isDelivered =
        orderStatus === "ได้รับสินค้าแล้ว" || orderStatus === "สำเร็จแล้ว";

      const finalStatus = isDelivered
        ? normalizeStatus(order.commissionStatus)
        : "unconfirmed";

      rowsFromOrderItems.push({
        id: `AUTO-${order.id}-${reviewId}-${productId}-${index}`,
        orderId: String(order.id || ""),
        reviewId,
        creatorUserId,
        productId,
        saleAmount,
        commissionRate: rate,
        commissionAmount: amount,
        amount,
        status: finalStatus,
        createdAt: order.createdAt || "",
        updatedAt: order.commissionUpdatedAt || "",
        approvedAt: order.commissionApprovedAt || null,
        paidAt: order.commissionPaidAt || null,
      });
    });
  });

  return [...rowsFromCommissions, ...rowsFromOrderItems].sort(
    (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

function sumByStatus(rows: CommissionRecord[], statuses: string[]) {
  return rows
    .filter((c) => statuses.includes(normalizeStatus(c.status)))
    .reduce((sum, c) => sum + getCommissionAmount(c), 0);
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const user = getUserFromCookie(cookieHeader);

    if (!user?.id) {
      return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });
    }

    // ล้าง orphan commissions ก่อนคำนวณ wallet — ทำให้ admin/creator เห็นยอดตรงกัน
    cleanupOrphanCommissions();

    const myCommissions = buildRowsForCreator(String(user.id));
    const withdrawsRaw = readJsonFile<any>(withdrawsFile, []);
    const withdraws = asArray(withdrawsRaw, "withdraws");

    const unconfirmed = sumByStatus(myCommissions, ["unconfirmed"]);
    const pending = sumByStatus(myCommissions, ["pending"]);
    const requested = sumByStatus(myCommissions, ["requested", "approved"]);
    const paid = sumByStatus(myCommissions, ["paid"]);

    const myWithdraws = withdraws.filter((w: any) => String(w.creatorUserId) === String(user.id));

    return NextResponse.json({
      success: true,
      wallet: {
        unconfirmed,
        pending,
        requested,
        paid,
        total: unconfirmed + pending + requested + paid,
      },
      withdraws: myWithdraws,
      commissions: myCommissions,
    });
  } catch (err) {
    console.error("GET withdraw error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const user = getUserFromCookie(cookieHeader);

    if (!user?.id) {
      return NextResponse.json({ success: false, message: "unauthorized" }, { status: 401 });
    }

    const myPending = buildRowsForCreator(String(user.id)).filter(
      (c) => normalizeStatus(c.status) === "pending"
    );

    const total = myPending.reduce((sum, c) => sum + getCommissionAmount(c), 0);

    if (total <= 0) {
      return NextResponse.json({ success: false, message: "ไม่มีเงินให้ถอน" });
    }

    const now = new Date().toISOString();

    // ✅ บันทึก snapshot ของ commission ที่ประกอบเป็น withdraw นี้ลงใน withdraw record
    // เพื่อให้ pop-up "คอมมิชชั่นที่ประกอบเป็นยอดถอนนี้" แสดงข้อมูลคงที่
    // ไม่เปลี่ยนตามสถานะปัจจุบันของ orders/commissions
    const reviewsRaw = readJsonFile<any>(reviewsFile, []);
    const productsRaw = readJsonFile<any>(productsFile, []);
    const reviews = asArray(reviewsRaw, "reviews");
    const products = asArray(productsRaw, "products");

    const items: WithdrawCommissionItem[] = myPending.map((c) => {
      const review = reviews.find((r: any) => String(r.id) === String(c.reviewId));
      const product = products.find(
        (p: any) => String(p.id) === String(c.productId)
      );
      return {
        id: String(c.id || ""),
        orderId: String(c.orderId || ""),
        reviewId: String(c.reviewId || ""),
        productId: String(c.productId || ""),
        saleAmount: Number(c.saleAmount || 0),
        commissionRate: Number(c.commissionRate || 0),
        commissionAmount: Number(c.commissionAmount ?? c.amount ?? 0),
        reviewTitle: review?.title || "",
        productName: product?.name || "",
      };
    });

    const newWithdraw: WithdrawRecord = {
      id: `WD-${Date.now()}`,
      creatorUserId: String(user.id),
      amount: Number(total.toFixed(2)),
      status: "requested",
      createdAt: now,
      updatedAt: now,
      items,
    };

    const withdrawsRaw = readJsonFile<any>(withdrawsFile, []);
    const withdraws = asArray(withdrawsRaw, "withdraws");
    withdraws.unshift(newWithdraw);
    writeJsonFile(withdrawsFile, Array.isArray(withdrawsRaw) ? withdraws : { ...withdrawsRaw, withdraws });

    const ordersRaw = readJsonFile<any>(ordersFile, []);
    const orders = asArray(ordersRaw, "orders");
    const pendingOrderIds = new Set(myPending.map((c) => String(c.orderId || "")));

    const updatedOrders = orders.map((order: any) => {
      if (!pendingOrderIds.has(String(order.id || ""))) return order;
      return {
        ...order,
        commissionStatus: "requested",
        commissionUpdatedAt: now,
      };
    });

    writeJsonFile(ordersFile, Array.isArray(ordersRaw) ? updatedOrders : { ...ordersRaw, orders: updatedOrders });

    const commissionsRaw = readJsonFile<any>(commissionsFile, []);
    const commissions = asArray(commissionsRaw, "commissions");

    if (commissions.length > 0) {
      const pendingIds = new Set(myPending.map((c) => String(c.id || "")));

      const updatedCommissions = commissions.map((c: any) => {
        if (
          pendingIds.has(String(c.id || "")) ||
          (String(getCommissionOwnerId(c)) === String(user.id) && normalizeStatus(c.status) === "pending")
        ) {
          return {
            ...c,
            creatorUserId: getCommissionOwnerId(c) || String(user.id),
            commissionAmount: getCommissionAmount(c),
            status: "requested",
            updatedAt: now,
          };
        }

        return c;
      });

      writeJsonFile(
        commissionsFile,
        Array.isArray(commissionsRaw) ? updatedCommissions : { ...commissionsRaw, commissions: updatedCommissions }
      );
    }

    return NextResponse.json({ success: true, withdraw: newWithdraw });
  } catch (err) {
    console.error("POST withdraw error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
