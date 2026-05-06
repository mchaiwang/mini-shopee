import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  items?: WithdrawCommissionItem[];
};

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
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string | null;
  paidAt?: string | null;
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
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8");
    }
  } catch {}
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
  try {
    ensureJsonFile(filePath, []);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {}
}

function asArray(raw: any, key?: string) {
  if (Array.isArray(raw)) return raw;
  if (key && Array.isArray(raw?.[key])) return raw[key];
  return [];
}

function getUserFromCookie(cookieHeader: string): AuthUser | null {
  try {
    const authCookie = cookieHeader
      .split("; ")
      .find((row) => row.startsWith("auth="));

    if (!authCookie) return null;

    const encoded = authCookie.split("=")[1] || "";
    return JSON.parse(decodeURIComponent(encoded));
  } catch {
    return null;
  }
}

function normalizeStatus(status?: string) {
  return String(status || "pending").trim() || "pending";
}

function getCommissionOwnerId(c: any) {
  return String(
    c.creatorUserId || c.commissionOwnerUserId || c.userId || ""
  ).trim();
}

function getCommissionAmount(c: any) {
  const direct = Number(c.commissionAmount ?? c.amount ?? 0);
  if (direct > 0) return direct;

  const saleAmount = Number(c.saleAmount || 0);
  const rate = Number(c.commissionRate || 0.1);

  return Number((saleAmount * rate).toFixed(2));
}

function isDeliveredStatus(status?: string) {
  const s = String(status || "").trim();
  return s === "ได้รับสินค้าแล้ว" || s === "สำเร็จแล้ว";
}

function getOrderStatusBasedCommissionStatus(order: any) {
  const orderStatus = String(order?.status || "").trim();

  if (!isDeliveredStatus(orderStatus)) {
    return "unconfirmed";
  }

  return normalizeStatus(order?.commissionStatus || "pending");
}

function buildRowsForCreator(userId: string): CommissionRecord[] {
  const ordersRaw = readJsonFile<any>(ordersFile, []);
  const commissionsRaw = readJsonFile<any>(commissionsFile, []);
  const reviewsRaw = readJsonFile<any>(reviewsFile, []);
  const productsRaw = readJsonFile<any>(productsFile, []);

  const orders = asArray(ordersRaw, "orders");
  const commissions = asArray(commissionsRaw, "commissions");
  const reviews = asArray(reviewsRaw, "reviews");
  const products = asArray(productsRaw, "products");

  const rows: CommissionRecord[] = [];
  const usedKeys = new Set<string>();

  for (const order of orders) {
    const orderId = String(order?.id || "").trim();
    if (!orderId) continue;

    const items = Array.isArray(order?.items) ? order.items : [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      const reviewId = String(item?.refReview || order?.refReview || "").trim();
      if (!reviewId) continue;

      const productId = String(item?.id || item?.productId || "").trim();
      if (!productId) continue;

      const review = reviews.find((r: any) => String(r.id) === reviewId);
      if (!review) continue;

      const product = products.find((p: any) => String(p.id) === productId);

      const creatorUserId = String(
        item?.creatorUserId ||
          review?.commissionOwnerUserId ||
          review?.userId ||
          order?.commissionOwnerUserId ||
          ""
      ).trim();

      if (String(creatorUserId) !== String(userId)) continue;

      const matchedCommission = commissions.find((c: any) => {
        return (
          String(c.orderId || "") === orderId &&
          String(c.reviewId || "") === reviewId &&
          String(c.productId || "") === productId &&
          String(getCommissionOwnerId(c) || creatorUserId) === String(userId)
        );
      });

      const qty = Number(item.qty || item.quantity || 1);
      const saleAmount = Number(
        matchedCommission?.saleAmount ??
          Number(item.price || 0) * qty
      );

      const commissionRate = Number(
        matchedCommission?.commissionRate ??
          item.commissionRate ??
          review?.commissionRate ??
          product?.commissionRate ??
          0.1
      );

      const commissionAmount = Number(
        (
          Number(
            matchedCommission?.commissionAmount ??
              matchedCommission?.amount ??
              item.commissionAmount ??
              0
          ) || saleAmount * commissionRate
        ).toFixed(2)
      );

      if (saleAmount <= 0 || commissionAmount <= 0) continue;

      const status = getOrderStatusBasedCommissionStatus(order);
      const key = `${orderId}|${reviewId}|${productId}`;
      usedKeys.add(key);

      rows.push({
        id:
          matchedCommission?.id ||
          `ORDER-${orderId}-${reviewId}-${productId}-${index}`,
        orderId,
        reviewId,
        creatorUserId,
        productId,
        saleAmount,
        commissionRate,
        commissionAmount,
        amount: commissionAmount,
        status,
        createdAt: matchedCommission?.createdAt || order?.createdAt || "",
        updatedAt:
          matchedCommission?.updatedAt || order?.commissionUpdatedAt || "",
        approvedAt:
          matchedCommission?.approvedAt || order?.commissionApprovedAt || null,
        paidAt: matchedCommission?.paidAt || order?.commissionPaidAt || null,
      });
    }
  }

  for (const c of commissions) {
    const orderId = String(c.orderId || "").trim();
    const reviewId = String(c.reviewId || "").trim();
    const productId = String(c.productId || "").trim();
    const key = `${orderId}|${reviewId}|${productId}`;

    if (!orderId || !reviewId || !productId) continue;
    if (usedKeys.has(key)) continue;

    const ownerId = getCommissionOwnerId(c);
    if (String(ownerId) !== String(userId)) continue;

    const order = orders.find((o: any) => String(o.id) === orderId);
    if (!order) continue;

    const status = getOrderStatusBasedCommissionStatus(order);
    const amount = getCommissionAmount(c);
    const saleAmount = Number(c.saleAmount || 0);

    if (amount <= 0 || saleAmount <= 0) continue;

    rows.push({
      ...c,
      creatorUserId: ownerId,
      status,
      amount,
      commissionAmount: amount,
    });
  }

  return rows.sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );
}

function sumRows(rows: CommissionRecord[], statuses: string[]) {
  return rows
    .filter((row) => statuses.includes(normalizeStatus(row.status)))
    .reduce((sum, row) => sum + getCommissionAmount(row), 0);
}

export async function GET(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const user = getUserFromCookie(cookieHeader);

    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: "unauthorized" },
        { status: 401 }
      );
    }

    const myCommissions = buildRowsForCreator(String(user.id));

    const withdrawsRaw = readJsonFile<any>(withdrawsFile, []);
    const withdraws = asArray(withdrawsRaw, "withdraws");

    const unconfirmed = sumRows(myCommissions, ["unconfirmed"]);
    const pending = sumRows(myCommissions, ["pending"]);
    const requested = sumRows(myCommissions, ["requested", "approved"]);
    const paid = sumRows(myCommissions, ["paid"]);

    const myWithdraws = withdraws.filter(
      (w: any) => String(w.creatorUserId) === String(user.id)
    );

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
      return NextResponse.json(
        { success: false, message: "unauthorized" },
        { status: 401 }
      );
    }

    const myPending = buildRowsForCreator(String(user.id)).filter(
      (c) => normalizeStatus(c.status) === "pending"
    );

    const total = myPending.reduce(
      (sum, c) => sum + getCommissionAmount(c),
      0
    );

    if (total <= 0) {
      return NextResponse.json({
        success: false,
        message: "ไม่มีเงินให้ถอน",
      });
    }

    const now = new Date().toISOString();

    const reviewsRaw = readJsonFile<any>(reviewsFile, []);
    const productsRaw = readJsonFile<any>(productsFile, []);
    const reviews = asArray(reviewsRaw, "reviews");
    const products = asArray(productsRaw, "products");

    const items: WithdrawCommissionItem[] = myPending.map((c) => {
      const review = reviews.find(
        (r: any) => String(r.id) === String(c.reviewId)
      );
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
        commissionAmount: getCommissionAmount(c),
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

    writeJsonFile(
      withdrawsFile,
      Array.isArray(withdrawsRaw)
        ? withdraws
        : { ...withdrawsRaw, withdraws }
    );

    const pendingOrderIds = new Set(
      myPending.map((c) => String(c.orderId || ""))
    );

    const ordersRaw = readJsonFile<any>(ordersFile, []);
    const orders = asArray(ordersRaw, "orders");

    const updatedOrders = orders.map((order: any) => {
      if (!pendingOrderIds.has(String(order.id || ""))) return order;

      return {
        ...order,
        commissionStatus: "requested",
        commissionUpdatedAt: now,
      };
    });

    writeJsonFile(
      ordersFile,
      Array.isArray(ordersRaw)
        ? updatedOrders
        : { ...ordersRaw, orders: updatedOrders }
    );

    const commissionsRaw = readJsonFile<any>(commissionsFile, []);
    const commissions = asArray(commissionsRaw, "commissions");

    if (commissions.length > 0) {
      const pendingKeys = new Set(
        myPending.map(
          (c) => `${String(c.orderId)}|${String(c.reviewId)}|${String(c.productId)}`
        )
      );

      const updatedCommissions = commissions.map((c: any) => {
        const key = `${String(c.orderId)}|${String(c.reviewId)}|${String(c.productId)}`;

        if (
          pendingKeys.has(key) &&
          String(getCommissionOwnerId(c)) === String(user.id)
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
        Array.isArray(commissionsRaw)
          ? updatedCommissions
          : { ...commissionsRaw, commissions: updatedCommissions }
      );
    }

    return NextResponse.json({ success: true, withdraw: newWithdraw });
  } catch (err) {
    console.error("POST withdraw error:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}