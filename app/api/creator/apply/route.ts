import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const usersFile = path.join(process.cwd(), "data", "users.json");
const ordersFile = path.join(process.cwd(), "data", "orders.json");

function readJSON(file: string) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return [];
  }
}

function writeJSON(file: string, data: any) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

function generateCreatorCode(users: any[]) {
  let code = "";

  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (users.some((u: any) => String(u.creatorCode || "") === code));

  return code;
}

export async function POST(req: NextRequest) {
  try {
    const rawAuth = req.cookies.get("auth")?.value;

    if (!rawAuth) {
      return NextResponse.json(
        { success: false, message: "ยังไม่ได้ล็อกอิน" },
        { status: 401 }
      );
    }

    const user = JSON.parse(decodeURIComponent(rawAuth));

    const users = readJSON(usersFile);
    const orders = readJSON(ordersFile);

    const index = users.findIndex((u: any) => u.id === user.id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ user" },
        { status: 404 }
      );
    }

    const userId = String(user.id || "").trim();
    const userEmail = String(user.email || "")
      .trim()
      .toLowerCase();

    const hasCompletedOrder = orders.some((o: any) => {
      const orderUserId = String(o.userId || o.ownerId || "").trim();

      const orderEmail = String(o.email || o.shippingAddress?.email || "")
        .trim()
        .toLowerCase();

      const matchedUser =
        (userId && orderUserId === userId) ||
        (userEmail && orderEmail === userEmail);

      const delivered =
        o.status === "ได้รับสินค้าแล้ว" ||
        o.status === "จัดส่งแล้ว";

      return matchedUser && delivered;
    });

    if (!hasCompletedOrder) {
      return NextResponse.json({
        success: false,
        message:
          "ต้องมีออเดอร์ที่จัดส่งแล้ว หรือ ได้รับสินค้าแล้ว ก่อน ถึงสมัครได้",
      });
    }

    const body = await req.json().catch(() => ({}));

    const {
      creatorDisplayName,
      promptPay,
      bankName,
      accountName,
      accountNumber,
    } = body;

    if (!creatorDisplayName || !creatorDisplayName.trim()) {
      return NextResponse.json({
        success: false,
        message: "กรุณากรอกชื่อที่จะแสดง",
      });
    }

    users[index].creatorEnabled = true;
    users[index].creatorStatus = "approved";
    users[index].creatorDisplayName = creatorDisplayName.trim();

    users[index].creatorCode =
      String(users[index].creatorCode || "").trim() ||
      generateCreatorCode(users);

    users[index].creatorPayment = {
      promptPay: promptPay || "",
      bankName: bankName || "",
      accountName: accountName || "",
      accountNumber: accountNumber || "",
    };

    users[index].permissions = {
      canSubmitReview: true,
      canReceiveCommission: true,
    };

    writeJSON(usersFile, users);

    const updatedUser = users[index];

    const res = NextResponse.json({
      success: true,
      message: "สมัครครีเอเตอร์สำเร็จแล้ว (อนุมัติทันที)",
      user: updatedUser,
    });

    res.cookies.set("auth", encodeURIComponent(JSON.stringify(updatedUser)), {
      httpOnly: false,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("POST /api/creator/apply error:", err);

    return NextResponse.json(
      { success: false, message: "สมัครครีเอเตอร์ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}