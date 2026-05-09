import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data", "users.json");

function readData() {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeData(data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// GET = โหลด users
export async function GET() {
  const users = readData();
  return NextResponse.json({ users });
}

// PATCH = แก้ไข
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, payload } = body;

    const users = readData();
    const index = users.findIndex((u: any) => u.id === userId);

    if (index === -1) {
      return NextResponse.json({ success: false });
    }

    if (action === "approve") {
      users[index].creatorStatus = "approved";
      users[index].creatorEnabled = true;
    }

   if (action === "reject") {
  users.creatorStatus = "";
  users.isCreator = false;

  // ล้างข้อมูลครีเอเตอร์
  users.creatorCode = "";
  users.creatorDisplayName = "";

  users.creatorPayment = {
    promptPay: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
  };
}

    if (action === "disable") {
      users[index].creatorEnabled = false;
    }

    if (action === "update") {
      users[index].creatorDisplayName = payload.creatorDisplayName;

      users[index].creatorPayment = {
        promptPay: payload.promptPay || "",
        bankName: payload.bankName || "",
        accountName: payload.accountName || "",
        accountNumber: payload.accountNumber || "",
      };
    }

    writeData(users);

    return NextResponse.json({ success: true });

  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}