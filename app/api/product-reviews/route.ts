import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewItem = {
  id?: string | number;
  name?: string;
  title?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  image?: string;
};

type ProductReview = {
  id: string;
  orderId: string;
  productId: string | number;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  usage: string;
  quality: string;
  shipping: string;
  comment: string;
  images: string[];
  verifiedPurchase: boolean;
  likes: number;
  createdAt: string;
};

type AuthUser = {
  id?: string;
  name?: string;
  displayName?: string;
  email?: string;
};

const reviewsFile = path.join(process.cwd(), "data", "product-reviews.json");

function ensureFile() {
  try {
    const dir = path.dirname(reviewsFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(reviewsFile)) fs.writeFileSync(reviewsFile, "[]", "utf8");
  } catch {
    // Vercel read-only filesystem — ignore
  }
}

function readReviews(): ProductReview[] {
  try {
    ensureFile();
    const raw = fs.readFileSync(reviewsFile, "utf8");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReviews(data: ProductReview[]) {
  try {
    ensureFile();
    fs.writeFileSync(reviewsFile, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

function getUserFromAuthCookie(cookieHeader: string): AuthUser | null {
  try {
    const authCookie = cookieHeader
      .split("; ")
      .find((row) => row.startsWith("auth="));
    if (!authCookie) return null;
    const encoded = authCookie.split("=")[1] || "";
    const decoded = decodeURIComponent(encoded);
    return JSON.parse(decoded) as AuthUser;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    return NextResponse.json({ success: true, reviews: readReviews() });
  } catch {
    return NextResponse.json(
      { success: false, message: "ไม่สามารถอ่านรีวิวสินค้าได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const cookieHeader = request.headers.get("cookie") || "";
    const authUser = getUserFromAuthCookie(cookieHeader);

    const orderId = String(body?.orderId || "").trim();
    const items: ReviewItem[] = Array.isArray(body?.items) ? body.items : [];
    const rating = Math.max(1, Math.min(5, Math.round(Number(body?.rating || 5))));
    const comment = String(body?.comment || "").trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "ไม่พบเลขที่คำสั่งซื้อ" },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรายการสินค้า" },
        { status: 400 }
      );
    }

    if (comment.length < 10) {
      return NextResponse.json(
        { success: false, message: "กรุณาเขียนรีวิวอย่างน้อย 10 ตัวอักษร" },
        { status: 400 }
      );
    }

    const reviews = readReviews();
    const now = new Date().toISOString();
    const userId = String(authUser?.id || "").trim();
    const userName = String(
      body?.userName || authUser?.displayName || authUser?.name || authUser?.email || "ผู้ซื้อ"
    ).trim();

    const images = Array.isArray(body?.images)
      ? body.images.filter(Boolean).slice(0, 6).map((img: unknown) => String(img))
      : [];

    const newReviews: ProductReview[] = items
      .filter((item) => item?.id)
      .map((item, index) => ({
        id: `PRV-${Date.now()}-${index}`,
        orderId,
        productId: item.id || "",
        productName: String(item.name || item.title || "สินค้า"),
        userId,
        userName,
        rating,
        usage: String(body?.usage || ""),
        quality: String(body?.quality || ""),
        shipping: String(body?.shipping || ""),
        comment,
        images,
        verifiedPurchase: true,
        likes: 0,
        createdAt: now,
      }));

    const withoutDuplicate = reviews.filter((review) => {
      return !newReviews.some(
        (item) =>
          String(item.orderId) === String(review.orderId) &&
          String(item.productId) === String(review.productId) &&
          String(item.userId || "") === String(review.userId || "")
      );
    });

    writeReviews([...newReviews, ...withoutDuplicate]);

    return NextResponse.json({ success: true, reviews: newReviews });
  } catch (error) {
    console.error("POST /api/product-reviews error:", error);
    return NextResponse.json(
      { success: false, message: "บันทึกรีวิวสินค้าไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
