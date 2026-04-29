/**
 * Migration script — แก้ orders ที่ commissionTracked=true แต่ commissions.json ว่าง
 *
 * วิธีใช้:
 *   cd "D:\Program Files\Java\herbal-store"
 *   node migrate-fix-commission-tracked.js
 *
 * จะทำอะไรบ้าง:
 *   1. backup orders.json และ commissions.json
 *   2. หา order ที่ commissionTracked=true แต่ไม่มี commission record ใน commissions.json
 *   3. ถ้า order status ยังไม่ใช่ "ได้รับสินค้าแล้ว"/"สำเร็จแล้ว" — unset flag (ปล่อยให้ flow ปกติทำต่อ)
 *   4. ถ้าเป็น "ได้รับสินค้าแล้ว" แล้ว — ก็ unset flag เหมือนกัน เพราะรอบหน้าที่มีการเรียกจะสร้าง commission ให้
 */

const fs = require("fs");
const path = require("path");

const dataDir = path.join(process.cwd(), "data");
const ordersFile = path.join(dataDir, "orders.json");
const commissionsFile = path.join(dataDir, "commissions.json");

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function asArray(raw, key) {
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw[key])) return raw[key];
  return [];
}

console.log("=== Migration: Fix commissionTracked inconsistency ===\n");

// backup
const ts = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(ordersFile, `${ordersFile}.backup-${ts}`);
fs.copyFileSync(commissionsFile, `${commissionsFile}.backup-${ts}`);
console.log(`✓ Backup created: orders.json.backup-${ts}`);
console.log(`✓ Backup created: commissions.json.backup-${ts}\n`);

const ordersRaw = readJson(ordersFile);
const commissionsRaw = readJson(commissionsFile);

const orders = asArray(ordersRaw, "orders");
const commissions = asArray(commissionsRaw, "commissions");

// สร้าง index ของ commission ที่มีอยู่
const commissionKeys = new Set(
  commissions.map((c) => `${c.orderId}|${c.reviewId}|${Number(c.productId || 0)}`)
);

let fixedCount = 0;
let totalProcessed = 0;

for (const order of orders) {
  if (!order.commissionTracked) continue;
  totalProcessed++;

  const itemsWithReview = (order.items || []).filter(
    (it) => String(it.refReview || "").trim()
  );

  if (itemsWithReview.length === 0) continue;

  // เช็คว่ามี commission ครบทุก item ที่มี refReview ไหม
  const allTracked = itemsWithReview.every((it) => {
    const pid = Number(it.id || it.productId || 0);
    const key = `${order.id}|${it.refReview}|${pid}`;
    return commissionKeys.has(key);
  });

  if (!allTracked) {
    console.log(
      `  Fix: ${order.id} — has commissionTracked=true but missing commission records`
    );
    order.commissionTracked = false;
    fixedCount++;
  }
}

console.log(
  `\nProcessed: ${totalProcessed} orders with commissionTracked=true`
);
console.log(`Fixed: ${fixedCount} orders\n`);

if (fixedCount > 0) {
  // เขียนกลับ orders.json
  writeJson(
    ordersFile,
    Array.isArray(ordersRaw)
      ? orders
      : { ...ordersRaw, orders }
  );
  console.log(`✓ orders.json updated`);
} else {
  console.log("Nothing to fix.");
}

console.log("\n=== Done ===");
