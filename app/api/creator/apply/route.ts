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

    const hasCompletedOrder = orders.some(
      (o: any) =>
        o.userId === user.id &&
        (o.status === "จัดส่งแล้ว" || o.status === "สำเร็จแล้ว")
    );

    if (!hasCompletedOrder) {
      return NextResponse.json({
        success: false,
        message: "ต้องมีออเดอร์ที่จัดส่งแล้วก่อน ถึงสมัครได้",
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
    });

    res.cookies.set(
      "auth",
      encodeURIComponent(JSON.stringify(updatedUser)),
      {
        httpOnly: false,
        path: "/",
      }
    );

    return res;
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "error" },
      { status: 500 }
    );
  }
}
