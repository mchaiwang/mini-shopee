import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ordersFile = path.join(process.cwd(), "data", "orders.json");

// อ่านไฟล์ orders
function readOrders() {
  try {
    if (!fs.existsSync(ordersFile)) return [];
    const raw = fs.readFileSync(ordersFile, "utf8");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// เขียนไฟล์ orders
function writeOrders(data) {
  fs.writeFileSync(ordersFile, JSON.stringify(data, null, 2), "utf8");
}

// ==============================
// ✅ GET: ดึง orders
// ==============================
export async function GET() {
  const orders = readOrders();
  return NextResponse.json({ orders });
}

// ==============================
// ✅ POST: สร้างคำสั่งซื้อ
// ==============================
export async function POST(request) {
  try {
    const body = await request.json();

    // 🔥 ดึง userId จาก cookie
    const cookieHeader = request.headers.get("cookie") || "";
    const userId =
      cookieHeader
        .split("; ")
        .find((row) => row.startsWith("userId="))
        ?.split("=")[1] || "";

    const newOrder = {
      id: `ORD-${Date.now()}`,
      userId, // ✅ สำคัญมาก
      ownerId: userId,

      email:
        body.email ||
        body.userEmail ||
        body.customerEmail ||
        "",

      userEmail:
        body.userEmail ||
        body.customerEmail ||
        body.email ||
        "",

      customerEmail:
        body.customerEmail ||
        body.userEmail ||
        body.email ||
        "",

      customerName:
        body.customerName ||
        body.fullName ||
        "",

      fullName: body.fullName || body.customerName || "",
      phone: body.phone || "",
      address: body.address || "",
      note: body.note || "",

      items: Array.isArray(body.items) ? body.items : [],
      total: Number(body.total || 0),

      paymentMethod: body.paymentMethod || "cod",
      slip: body.slip || "",
      slipName: body.slipName || "",

      status: body.status || "รอยืนยันคำสั่งซื้อ",
      createdAt: new Date().toISOString(),

      shippingAddress: body.shippingAddress || {
        fullName: body.fullName || body.customerName || "",
        phone: body.phone || "",
        email:
          body.email ||
          body.userEmail ||
          body.customerEmail ||
          "",
        address: body.address || "",
        note: body.note || "",
      },
    };

    const orders = readOrders();

    // ใส่ใหม่ไว้บนสุด
    orders.unshift(newOrder);

    writeOrders(orders);

    return NextResponse.json({
      success: true,
      order: newOrder,
      orders,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "สร้างคำสั่งซื้อไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

// ==============================
// ✅ PUT: อัพเดทสถานะ
// ==============================
export async function PUT(request) {
  const body = await request.json();
  const orders = readOrders();

  const index = orders.findIndex((o) => o.id === body.id);

  if (index !== -1) {
    orders[index].status = body.status;
  }

  writeOrders(orders);

  return NextResponse.json({ success: true });
}

// ==============================
// ✅ DELETE: ลบ order
// ==============================
export async function DELETE(request) {
  const body = await request.json();
  const orders = readOrders();

  const filtered = orders.filter((o) => o.id !== body.id);

  writeOrders(filtered);

  return NextResponse.json({ success: true });
}