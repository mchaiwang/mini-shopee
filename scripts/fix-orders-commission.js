const fs = require("fs");
const path = require("path");

const ordersPath = path.join(process.cwd(), "data", "orders.json");
const reviewsPath = path.join(process.cwd(), "data", "reviews.json");

function readJSON(filePath, fallback = []) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getEffectiveRefReview(order) {
  if (order.refReview) return String(order.refReview).trim();

  for (const item of order.items || []) {
    if (item.refReview) return String(item.refReview).trim();
  }

  return "";
}

function getProductId(order, review) {
  // เอาจาก order ก่อน
  for (const item of order.items || []) {
    const id = Number(item.id);
    if (!isNaN(id)) return id;
  }

  // fallback ไป review
  if (review.productId) return review.productId;
  if (Array.isArray(review.productIds)) return review.productIds[0];

  return null;
}

function main() {
  const orders = readJSON(ordersPath, []);
  const reviews = readJSON(reviewsPath, []);

  let updatedCount = 0;

  const newOrders = orders.map((order) => {
    const refReview = getEffectiveRefReview(order);

    // ❌ ไม่มี ref = ไม่มีคอม
    if (!refReview) return order;

    const review = reviews.find((r) => r.id === refReview);

    // ❌ หา review ไม่เจอ
    if (!review) return order;

    // ❌ ไม่ใช่ creator review
    if (!["creator_video", "creator_slide"].includes(review.reviewType)) {
      return order;
    }

    // ❌ ไม่มีเจ้าของคอม
    if (!review.commissionOwnerUserId) return order;

    const total = Number(order.total || 0);
    if (total <= 0) return order;

    const rate =
      typeof review.commissionRate === "number"
        ? review.commissionRate
        : 0.1;

    const commissionAmount = Number((total * rate).toFixed(2));

    const ownerId = String(review.commissionOwnerUserId);

    updatedCount++;

    return {
      ...order,
      commissionTracked: true,
      commissionAmount,
      commissionOwnerUserId: ownerId,
      commissionStatus: order.commissionStatus || "pending",
    };
  });

  writeJSON(ordersPath, newOrders);

  console.log("✅ อัปเดต orders สำเร็จ");
  console.log("จำนวนที่แก้:", updatedCount);
}

main();