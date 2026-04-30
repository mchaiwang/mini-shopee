import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewSlide = {
  key: string;
  img: string;
  text: string;
};

type Review = {
  id: string;
  userId?: string;
  productId?: number;
  productIds?: number[];
  title: string;
  slug: string;
  category?: string;
  creatorName?: string;
  customerName?: string;
  creatorCode?: string;
  reviewType?: string;
  slides?: ReviewSlide[];
  productBundleName?: string;
  verifiedPurchase?: boolean;
  status?: string;
  views?: number;
  clicks?: number;
  ordersCount?: number;
  commissionTotal?: number;
  commissionRate?: number;
  commissionOwnerUserId?: string;
  reviewLink?: string;
  createdAt?: string;
  updatedAt?: string;
  orderId?: string;
  rating?: number;
};

const dataDir = path.join(process.cwd(), "data");
const reviewsFile = path.join(dataDir, "reviews.json");
const productsFile = path.join(dataDir, "products.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {
    // ignore
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  try {
    await ensureDataDir();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // Vercel read-only filesystem — ignore write errors gracefully
  }
}

function slugifyThai(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0E00-\u0E7Fa-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSlides(slides: unknown): ReviewSlide[] {
  if (!Array.isArray(slides)) return [];

  return slides
    .map((item) => {
      const key = String((item as any)?.key || "").trim();
      const img = String((item as any)?.img || "").trim();
      const text = String((item as any)?.text || "").trim();
      return { key, img, text };
    })
    .filter((item) => item.key && item.img && item.text)
    .slice(0, 5);
}

async function getProducts() {
  const productsData = await readJsonFile<any>(productsFile, { products: [] });
  if (Array.isArray(productsData?.products)) return productsData.products;
  if (Array.isArray(productsData)) return productsData;
  return [];
}

function buildReviewLinkFromProduct(product: any, reviewId: string) {
  const slug = String(product?.slug || "").trim();
  if (!slug) return "";
  return `/product/${slug}?refReview=${reviewId}`;
}

function normalizeReview(item: any): Review {
  return {
    id: String(item?.id || ""),
    userId: String(item?.userId || "").trim(),
    productId:
      item?.productId !== undefined && item?.productId !== null
        ? Number(item.productId)
        : undefined,
    productIds: Array.isArray(item?.productIds)
      ? item.productIds.map((n: any) => Number(n)).filter(Boolean)
      : [],
    title: String(item?.title || "").trim(),
    slug: String(item?.slug || "").trim(),
    category: String(item?.category || "").trim(),
    creatorName: String(item?.creatorName || "").trim(),
    customerName: String(item?.customerName || "").trim(),
    creatorCode: String(item?.creatorCode || "").trim(),
    reviewType: String(item?.reviewType || "creator_slide").trim(),
    slides: normalizeSlides(item?.slides),
    productBundleName: String(item?.productBundleName || "").trim(),
    verifiedPurchase: item?.verifiedPurchase === true,
    status: String(item?.status || "published").trim(),
    views: Number(item?.views || 0),
    clicks: Number(item?.clicks || 0),
    ordersCount: Number(item?.ordersCount || 0),
    commissionTotal: Number(item?.commissionTotal || 0),
    commissionRate: Number(item?.commissionRate || 0.1),
    commissionOwnerUserId: String(item?.commissionOwnerUserId || "").trim(),
    reviewLink: String(item?.reviewLink || "").trim(),
    createdAt: String(item?.createdAt || ""),
    updatedAt: String(item?.updatedAt || ""),
    orderId: String(item?.orderId || "").trim(),
    rating: Number(item?.rating || 0),
  };
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = String(searchParams.get("status") || "").trim();
    const reviewType = String(searchParams.get("reviewType") || "").trim();
    const userId = String(searchParams.get("userId") || "").trim();
    const productId = String(searchParams.get("productId") || "").trim();
    const limit = Number(searchParams.get("limit") || 0);

    const rawReviews = await readJsonFile<any[]>(reviewsFile, []);
    let reviews = rawReviews.map(normalizeReview);

    if (status) reviews = reviews.filter((item) => item.status === status);
    if (reviewType) reviews = reviews.filter((item) => item.reviewType === reviewType);
    if (userId) reviews = reviews.filter((item) => String(item.userId || "") === userId);
    if (productId) {
      reviews = reviews.filter(
        (item) =>
          String(item.productId || "") === productId ||
          item.productIds?.some((id) => String(id) === productId)
      );
    }

    reviews.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    if (limit > 0) reviews = reviews.slice(0, limit);

    return NextResponse.json({ success: true, reviews });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "โหลดรีวิวไม่สำเร็จ", reviews: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const title = String(body?.title || "").trim();
    const userId = String(body?.userId || "").trim();
    const creatorName = String(body?.creatorName || "").trim();

    const usersData = await readJsonFile<any[]>(
      path.join(process.cwd(), "data", "users.json"),
      []
    );
    const creatorCode =
      String(body?.creatorCode || "").trim() ||
      usersData.find((u: any) => String(u.id) === String(userId))?.creatorCode || "";

    const orderId = String(body?.orderId || "").trim();
    const reviewType = String(body?.reviewType || "creator_slide").trim();
    const productId = Number(body?.productId || 0);
    const slides = normalizeSlides(body?.slides);

    if (!title) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอกหัวข้อรีวิว" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "กรุณาเลือกสินค้า" },
        { status: 400 }
      );
    }

    if (reviewType === "creator_slide" && slides.length !== 5) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอกรูปและข้อความให้ครบทั้ง 5 หัวข้อ" },
        { status: 400 }
      );
    }

    const reviews = await readJsonFile<any[]>(reviewsFile, []);
    const products = await getProducts();
    const matchedProduct = products.find(
      (item: any) => String(item?.id) === String(productId)
    );

    const now = new Date().toISOString();
    const id = `review-${Date.now()}`;
    const slugBase = slugifyThai(title) || id;
    const slug = `${slugBase}-${Date.now()}`;

    const reviewLink =
      String(body?.reviewLink || "").trim() ||
      buildReviewLinkFromProduct(matchedProduct, id);

    const newReview: Review = {
      id,
      userId,
      productId,
      productIds: [productId],
      title,
      slug,
      category: String(matchedProduct?.category || "").trim(),
      creatorName,
      customerName: String(body?.customerName || "").trim(),
      creatorCode,
      reviewType,
      slides,
      productBundleName: String(matchedProduct?.name || "").trim(),
      verifiedPurchase: true,
      status: "published",
      views: 0,
      clicks: 0,
      ordersCount: 0,
      commissionTotal: 0,
      commissionRate: 0.1,
      commissionOwnerUserId: userId,
      reviewLink,
      createdAt: now,
      updatedAt: now,
      orderId,
      rating: 0,
    };

    await writeJsonFile(reviewsFile, [newReview, ...reviews]);

    return NextResponse.json({
      success: true,
      message: "ส่งรีวิวเรียบร้อยแล้ว",
      review: newReview,
    });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "บันทึกรีวิวไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { success: false, message: "ข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const id = String(body?.id || "").trim();
    const title = String(body?.title || "").trim();
    const productId = Number(body?.productId || 0);
    const slides = normalizeSlides(body?.slides);

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ id ของรีวิว" },
        { status: 400 }
      );
    }

    if (!title) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอกหัวข้อรีวิว" },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "กรุณาเลือกสินค้า" },
        { status: 400 }
      );
    }

    if (slides.length !== 5) {
      return NextResponse.json(
        { success: false, message: "กรุณากรอกรูปและข้อความให้ครบทั้ง 5 หัวข้อ" },
        { status: 400 }
      );
    }

    const reviews = await readJsonFile<any[]>(reviewsFile, []);
    const index = reviews.findIndex((item) => String(item?.id) === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรีวิวที่ต้องการแก้ไข" },
        { status: 404 }
      );
    }

    const products = await getProducts();
    const matchedProduct = products.find(
      (item: any) => String(item?.id) === String(productId)
    );

    const prev = normalizeReview(reviews[index]);
    const next: Review = {
      ...prev,
      productId,
      productIds: [productId],
      title,
      category: String(matchedProduct?.category || prev.category || "").trim(),
      creatorName: String(body?.creatorName || prev.creatorName || "").trim(),
      creatorCode: String(body?.creatorCode || prev.creatorCode || "").trim(),
      slides,
      productBundleName: String(
        matchedProduct?.name || prev.productBundleName || ""
      ).trim(),
      reviewLink:
        String(body?.reviewLink || "").trim() ||
        buildReviewLinkFromProduct(matchedProduct, id) ||
        prev.reviewLink,
      updatedAt: new Date().toISOString(),
    };

    reviews[index] = next;
    await writeJsonFile(reviewsFile, reviews);

    return NextResponse.json({
      success: true,
      message: "แก้ไขรีวิวเรียบร้อยแล้ว",
      review: next,
    });
  } catch (error) {
    console.error("PUT /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "แก้ไขรีวิวไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = String(req.nextUrl.searchParams.get("id") || "").trim();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ไม่พบ id ของรีวิว" },
        { status: 400 }
      );
    }

    const reviews = await readJsonFile<any[]>(reviewsFile, []);
    const beforeCount = reviews.length;
    const nextReviews = reviews.filter((item) => String(item?.id) !== id);

    if (nextReviews.length === beforeCount) {
      return NextResponse.json(
        { success: false, message: "ไม่พบรีวิวที่ต้องการลบ" },
        { status: 404 }
      );
    }

    await writeJsonFile(reviewsFile, nextReviews);

    return NextResponse.json({ success: true, message: "ลบรีวิวเรียบร้อยแล้ว" });
  } catch (error) {
    console.error("DELETE /api/reviews error:", error);
    return NextResponse.json(
      { success: false, message: "ลบรีวิวไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
