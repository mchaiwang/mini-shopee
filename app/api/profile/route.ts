import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const filePath = path.join(process.cwd(), "data/users.json");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth")?.value;

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = JSON.parse(decodeURIComponent(auth));

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const user = users.find((u: any) => u.id === authUser.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "customer",
        phone: user.phone || "",
        creatorDisplayName: user.creatorDisplayName || "",
        creatorEnabled: user.creatorEnabled || false,
        creatorStatus: user.creatorStatus || "none",
        creatorPayment: {
          promptPay: user.creatorPayment?.promptPay || "",
          bankName: user.creatorPayment?.bankName || "",
          accountName: user.creatorPayment?.accountName || "",
          accountNumber: user.creatorPayment?.accountNumber || "",
        },
        address: {
          recipientName: user.address?.recipientName || "",
          phone: user.address?.phone || "",
          line1: user.address?.line1 || "",
          subdistrict: user.address?.subdistrict || "",
          district: user.address?.district || "",
          province: user.address?.province || "",
          postalCode: user.address?.postalCode || "",
          note: user.address?.note || "",
        },
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const auth = cookieStore.get("auth")?.value;

    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = JSON.parse(decodeURIComponent(auth));
    const body = await req.json();

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const users = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const userIndex = users.findIndex((u: any) => u.id === authUser.id);

    if (userIndex === -1) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    users[userIndex] = {
      ...users[userIndex],
      name: body.name ?? users[userIndex].name,
      phone: body.phone ?? users[userIndex].phone,
      address: {
        recipientName:
          body.address?.recipientName ??
          users[userIndex].address?.recipientName ??
          "",
        phone: body.address?.phone ?? users[userIndex].address?.phone ?? "",
        line1: body.address?.line1 ?? users[userIndex].address?.line1 ?? "",
        subdistrict:
          body.address?.subdistrict ??
          users[userIndex].address?.subdistrict ??
          "",
        district:
          body.address?.district ?? users[userIndex].address?.district ?? "",
        province:
          body.address?.province ?? users[userIndex].address?.province ?? "",
        postalCode:
          body.address?.postalCode ??
          users[userIndex].address?.postalCode ??
          "",
        note: body.address?.note ?? users[userIndex].address?.note ?? "",
      },
    };

    try {
      fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    } catch {
      // Vercel read-only filesystem — ignore write errors gracefully
    }

    return NextResponse.json({
      success: true,
      user: users[userIndex],
    });
  } catch (error) {
    console.error("POST PROFILE ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
