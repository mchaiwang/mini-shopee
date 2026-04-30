import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ordersPath = path.join(process.cwd(), "data", "orders.json");
const withdrawsPath = path.join(process.cwd(), "data", "withdraws.json");
const commissionsPath = path.join(process.cwd(), "data", "commissions.json");
const usersPath = path.join(process.cwd(), "data", "users.json");
const reviewsPath = path.join(process.cwd(), "data", "reviews.json");
const productsPath = path.join(process.cwd(), "data", "products.json");

function readJson(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

function asArray(raw: any, key?: string) {
  if (Array.isArray(raw)) return raw;
  if (key && Array.isArray(raw?.[key])) return raw[key];
  return [];
}

function getUserFromAuthCookie(cookieHeader: string) {
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

function isRealCommission(commission: any) {
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

function cleanupOrphanCommissions(): any[] {
  const commissionsRaw = readJson(commissionsPath, []);
  const ordersRaw = readJson(ordersPath, []);
  const usersRaw = readJson(usersPath, []);
  const reviewsRaw = readJson(reviewsPath, []);
  const productsRaw = readJson(productsPath, []);

  const allCommissions = asArray(commissionsRaw, "commissions");
  const orders = asArray(ordersRaw, "orders");
  const users = asArray(usersRaw, "users");
  const reviews = asArray(reviewsRaw, "reviews");
  const products = asArray(productsRaw, "products");

  const orderIds = new Set(orders.map((o: any) => String(o.id)));
  const reviewIds = new Set(reviews.map((r: any) => String(r.id)));
  const userIds = new Set(users.map((u: any) => String(u.id)));
  const productIds = new Set(products.map((p: any) => String(p.id)));

  const cleaned = allCommissions.filter((commission: any) => {
    if (!isRealCommission(commission)) return false;

    const orderId = String(commission.orderId || "");
    const reviewId = String(commission.reviewId || "");
    const creatorUserId = String(
      commission.creatorUserId || commission.userId || ""
    );
    const productId = String(commission.productId || "");

    if (!orderIds.has(orderId)) return false;
    if (!reviewIds.has(reviewId)) return false;
    if (!userIds.has(creatorUserId)) return false;
    if (!productIds.has(productId)) return false;

    return true;
  });

  if (cleaned.length !== allCommissions.length) {
    writeJson(
      commissionsPath,
      Array.isArray(commissionsRaw)
        ? cleaned
        : { ...commissionsRaw, commissions: cleaned }
    );
  }

  return cleaned;
}

function buildRows() {
  const commissionsRaw = readJson(commissionsPath, []);
  const ordersRaw = readJson(ordersPath, []);
  const usersRaw = readJson(usersPath, []);
  const reviewsRaw = readJson(reviewsPath, []);
  const productsRaw = readJson(productsPath, []);

  const commissionsAll = asArray(commissionsRaw, "commissions");
  const orders = asArray(ordersRaw, "orders");
  const users = asArray(usersRaw, "users");
  const reviews = asArray(reviewsRaw, "reviews");
  const products = asArray(productsRaw, "products");

  const commissions = commissionsAll
    .filter(isRealCommission)
    .filter((commission: any) => {
      const orderId = String(commission.orderId || "");
      const reviewId = String(commission.reviewId || "");
      const creatorUserId = String(
        commission.creatorUserId || commission.userId || ""
      );
      const productId = String(commission.productId || "");

      const orderExists = orders.some((o: any) => String(o.id) === orderId);
      const reviewExists = reviews.some((r: any) => String(r.id) === reviewId);
      const creatorExists = users.some(
        (u: any) => String(u.id) === creatorUserId
      );
      const productExists = products.some(
        (p: any) => String(p.id) === productId
      );

      return orderExists && reviewExists && creatorExists && productExists;
    });

  const rowsFromCommissions = commissions.map((commission: any) => {
    const orderId = String(commission.orderId || "");
    const reviewId = String(commission.reviewId || "");
    const creatorUserId = String(commission.creatorUserId || commission.userId || "");
    const productId = String(commission.productId || "");

    const order = orders.find((o: any) => String(o.id) === orderId);
    const review = reviews.find((r: any) => String(r.id) === reviewId);

    const creator = users.find(
      (u: any) =>
        String(u.id) ===
        String(creatorUserId || review?.commissionOwnerUserId || review?.userId)
    );

    const product = products.find((p: any) => String(p.id) === productId);

    const matchedItem = (order?.items || []).find((item: any) => {
      return (
        String(item.id || item.productId || "") === productId ||
        String(item.refReview || "") === reviewId
      );
    });

    const saleAmount = Number(
      commission.saleAmount ??
        (matchedItem
          ? Number(matchedItem.price || 0) *
            Number(matchedItem.qty || matchedItem.quantity || 1)
          : 0)
    );

    const rate = Number(commission.commissionRate ?? review?.commissionRate ?? 0.1);

    const explicitAmount = Number(commission.commissionAmount || commission.amount || 0);
    const calculatedAmount = Number((saleAmount * rate).toFixed(2));
    const amount = explicitAmount > 0 ? explicitAmount : calculatedAmount;

    const orderStatus = String(order?.status || "").trim();
    const isDelivered =
      orderStatus === "ได้รับสินค้าแล้ว" || orderStatus === "สำเร็จแล้ว";

    const finalStatus = isDelivered
      ? String(commission.status || order?.commissionStatus || "pending")
      : "unconfirmed";

    return {
      id: String(commission.id || `${orderId}-${reviewId}-${productId}`),
      commission,
      order,
      creator,
      review,
      product,
      matchedItem,
      orderId,
      reviewId,
      creatorUserId: String(
        creator?.id ||
          creatorUserId ||
          review?.commissionOwnerUserId ||
          review?.userId ||
          ""
      ),
      productId,
      saleAmount,
      rate,
      amount,
      status: finalStatus,
      createdAt: commission.createdAt || order?.createdAt,
    };
  });

  const existingKeys = new Set(
    rowsFromCommissions.map(
      (row: any) => `${row.orderId}|${row.reviewId}|${row.productId}`
    )
  );

  const rowsFromOrderItems: any[] = [];

  orders.forEach((order: any) => {
    (order.items || []).forEach((item: any, index: number) => {
      const reviewId = String(item.refReview || "").trim();
      if (!reviewId) return;

      const productId = String(item.id || item.productId || "").trim();
      if (!productId) return;

      const key = `${order.id}|${reviewId}|${productId}`;
      if (existingKeys.has(key)) return;

      const review = reviews.find((r: any) => String(r.id) === reviewId);
      const creatorUserId = String(
        review?.commissionOwnerUserId || review?.userId || ""
      ).trim();

      if (!creatorUserId) return;

      const creator = users.find((u: any) => String(u.id) === creatorUserId);
      const product = products.find((p: any) => String(p.id) === productId);

      const saleAmount =
        Number(item.price || 0) * Number(item.qty || item.quantity || 1);

      if (saleAmount <= 0) return;

      const rate = Number(review?.commissionRate || product?.commissionRate || 0.1);
      const amount = Number((saleAmount * rate).toFixed(2));

      if (amount <= 0) return;

      const orderStatusInner = String(order.status || "").trim();
      const isDeliveredInner =
        orderStatusInner === "ได้รับสินค้าแล้ว" || orderStatusInner === "สำเร็จแล้ว";

      const status = isDeliveredInner
        ? String(order.commissionStatus || "pending") || "pending"
        : "unconfirmed";

      rowsFromOrderItems.push({
        id: `AUTO-${order.id}-${reviewId}-${productId}-${index}`,
        commission: {
          id: `AUTO-${order.id}-${reviewId}-${productId}-${index}`,
          orderId: order.id,
          reviewId,
          creatorUserId,
          productId,
          saleAmount,
          commissionRate: rate,
          commissionAmount: amount,
          amount,
          status,
          createdAt: order.createdAt,
        },
        order,
        creator,
        review,
        product,
        matchedItem: item,
        orderId: String(order.id || ""),
        reviewId,
        creatorUserId,
        productId,
        saleAmount,
        rate,
        amount,
        status,
        createdAt: order.createdAt,
      });
    });
  });

  return [...rowsFromCommissions, ...rowsFromOrderItems].sort(
    (a: any, b: any) =>
      new Date(b.createdAt || 0).getTime() -
      new Date(a.createdAt || 0).getTime()
  );
}

export async function GET(req: NextRequest) {
  try {
    const authUser = getUserFromAuthCookie(req.headers.get("cookie") || "");

    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "สำหรับแอดมินเท่านั้น" },
        { status: 401 }
      );
    }

    cleanupOrphanCommissions();

    return NextResponse.json({ success: true, rows: buildRows() });
  } catch (error) {
    console.error("GET /api/admin/commissions error:", error);
    return NextResponse.json(
      { success: false, message: "โหลดคอมมิชชั่นไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = getUserFromAuthCookie(req.headers.get("cookie") || "");

    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "สำหรับแอดมินเท่านั้น" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const commissionId = String(body.commissionId || "").trim();
    const orderId = String(body.orderId || "").trim();
    const commissionStatus = String(body.commissionStatus || "").trim();
    const reviewId = String(body.reviewId || "").trim();
    const creatorUserId = String(body.creatorUserId || "").trim();
    const productId = String(body.productId ?? "").trim();

    const hasSaleAmount = body.saleAmount !== undefined;
    const hasCommissionRate = body.commissionRate !== undefined;
    const hasCommissionAmount = body.commissionAmount !== undefined;

    if (!commissionId) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ commissionId" },
        { status: 400 }
      );
    }

    const allowed = ["", "pending", "requested", "approved", "paid", "rejected"];

    if (!allowed.includes(commissionStatus)) {
      return NextResponse.json(
        { success: false, message: "สถานะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const commissionsRaw = readJson(commissionsPath, []);
    const commissions = asArray(commissionsRaw, "commissions");

    let updatedCommission: any = null;

    const commissionIndex = commissions.findIndex(
      (c: any) => String(c.id) === commissionId
    );

    const numberPatch = {
      ...(hasSaleAmount ? { saleAmount: Number(body.saleAmount || 0) } : {}),
      ...(hasCommissionRate
        ? { commissionRate: Number(body.commissionRate || 0) }
        : {}),
      ...(hasCommissionAmount
        ? {
            commissionAmount: Number(body.commissionAmount || 0),
            amount: Number(body.commissionAmount || 0),
          }
        : {}),
    };

    if (commissionIndex !== -1) {
      commissions[commissionIndex] = {
        ...commissions[commissionIndex],
        ...numberPatch,
        ...(commissionStatus ? { status: commissionStatus } : {}),
        updatedAt: now,
        ...(commissionStatus === "approved" ? { approvedAt: now } : {}),
        ...(commissionStatus === "paid" ? { paidAt: now } : {}),
        ...(commissionStatus === "rejected" ? { rejectedAt: now } : {}),
      };

      updatedCommission = commissions[commissionIndex];

      writeJson(
        commissionsPath,
        Array.isArray(commissionsRaw)
          ? commissions
          : { ...commissionsRaw, commissions }
      );
    } else {
      const saleAmount = Number(body.saleAmount || 0);
      const commissionRate = Number(body.commissionRate || 0.1);
      const commissionAmount = Number(
        body.commissionAmount ?? saleAmount * commissionRate
      );

      const canCreateRealCommission =
        orderId &&
        reviewId &&
        creatorUserId &&
        productId &&
        saleAmount > 0 &&
        commissionAmount > 0;

      if (canCreateRealCommission) {
        const nextId = commissionId.startsWith("AUTO-")
          ? `COMM-${Date.now()}`
          : commissionId;

        updatedCommission = {
          id: nextId,
          orderId,
          reviewId,
          creatorUserId,
          productId,
          saleAmount,
          commissionRate,
          commissionAmount,
          amount: commissionAmount,
          status: commissionStatus || "pending",
          createdAt: now,
          updatedAt: now,
          ...(commissionStatus === "approved" ? { approvedAt: now } : {}),
          ...(commissionStatus === "paid" ? { paidAt: now } : {}),
          ...(commissionStatus === "rejected" ? { rejectedAt: now } : {}),
        };

        commissions.unshift(updatedCommission);

        writeJson(
          commissionsPath,
          Array.isArray(commissionsRaw)
            ? commissions
            : { ...commissionsRaw, commissions }
        );
      }
    }

    const ordersRaw = readJson(ordersPath, []);
    const orders = asArray(ordersRaw, "orders");

    const targetOrderId = orderId || String(updatedCommission?.orderId || "");
    const orderIndex = orders.findIndex(
      (o: any) => String(o.id) === targetOrderId
    );

    if (orderIndex !== -1) {
      orders[orderIndex] = {
        ...orders[orderIndex],
        ...(commissionStatus ? { commissionStatus } : {}),
        ...(hasCommissionAmount
          ? { commissionAmount: Number(body.commissionAmount || 0) }
          : {}),
        ...(creatorUserId ? { commissionOwnerUserId: creatorUserId } : {}),
        ...(reviewId ? { refReview: reviewId } : {}),
        commissionUpdatedAt: now,
        ...(commissionStatus === "approved" ? { commissionApprovedAt: now } : {}),
        ...(commissionStatus === "paid" ? { commissionPaidAt: now } : {}),
        ...(commissionStatus === "rejected" ? { commissionRejectedAt: now } : {}),
      };

      writeJson(
        ordersPath,
        Array.isArray(ordersRaw) ? orders : { ...ordersRaw, orders }
      );
    }

    if (commissionStatus && fs.existsSync(withdrawsPath)) {
      const withdrawsRaw = readJson(withdrawsPath, []);
      const withdraws = asArray(withdrawsRaw, "withdraws");

      const withdrawCreatorUserId = String(
        updatedCommission?.creatorUserId || updatedCommission?.userId || ""
      );

      const amount = Number(
        updatedCommission?.commissionAmount || updatedCommission?.amount || 0
      );

      const nextWithdrawStatus =
        commissionStatus === "approved"
          ? "approved"
          : commissionStatus === "paid"
          ? "paid"
          : commissionStatus === "rejected"
          ? "rejected"
          : undefined;

      if (withdrawCreatorUserId && amount > 0 && nextWithdrawStatus) {
        for (let i = 0; i < withdraws.length; i++) {
          const w = withdraws[i];

          if (
            String(w.creatorUserId) === withdrawCreatorUserId &&
            Number(w.amount || 0) >= amount &&
            ["requested", "approved"].includes(String(w.status || ""))
          ) {
            withdraws[i] = {
              ...w,
              status: nextWithdrawStatus,
              updatedAt: now,
              ...(nextWithdrawStatus === "approved" ? { approvedAt: now } : {}),
              ...(nextWithdrawStatus === "paid" ? { paidAt: now } : {}),
              ...(nextWithdrawStatus === "rejected" ? { rejectedAt: now } : {}),
            };
            break;
          }
        }

        writeJson(
          withdrawsPath,
          Array.isArray(withdrawsRaw)
            ? withdraws
            : { ...withdrawsRaw, withdraws }
        );
      }
    }

    return NextResponse.json({
      success: true,
      commission: updatedCommission,
      rows: buildRows(),
    });
  } catch (error) {
    console.error("PATCH /api/admin/commissions error:", error);
    return NextResponse.json(
      { success: false, message: "อัปเดตสถานะไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = getUserFromAuthCookie(req.headers.get("cookie") || "");

    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "สำหรับแอดมินเท่านั้น" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const commissionId = String(body.commissionId || "").trim();
    const orderId = String(body.orderId || "").trim();

    if (!commissionId) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ commissionId" },
        { status: 400 }
      );
    }

    const commissionsRaw = readJson(commissionsPath, []);
    const commissions = asArray(commissionsRaw, "commissions");

    const before = commissions.length;
    const nextCommissions = commissions.filter(
      (c: any) => String(c.id) !== commissionId
    );

    if (before === nextCommissions.length && !commissionId.startsWith("AUTO-")) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรายการคอมมิชชั่นที่ต้องการลบ" },
        { status: 404 }
      );
    }

    writeJson(
      commissionsPath,
      Array.isArray(commissionsRaw)
        ? nextCommissions
        : { ...commissionsRaw, commissions: nextCommissions }
    );

    if (orderId) {
      const ordersRaw = readJson(ordersPath, []);
      const orders = asArray(ordersRaw, "orders");

      const orderIndex = orders.findIndex(
        (o: any) => String(o.id) === orderId
      );

      if (orderIndex !== -1) {
        orders[orderIndex] = {
          ...orders[orderIndex],
          commissionAmount: 0,
          commissionStatus: "rejected",
          commissionUpdatedAt: new Date().toISOString(),
        };

        writeJson(
          ordersPath,
          Array.isArray(ordersRaw) ? orders : { ...ordersRaw, orders }
        );
      }
    }

    return NextResponse.json({ success: true, rows: buildRows() });
  } catch (error) {
    console.error("DELETE /api/admin/commissions error:", error);
    return NextResponse.json(
      { success: false, message: "ลบคอมมิชชั่นไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
