export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import fs from "fs/promises";
import path from "path";
import users from "@/data/users.json";
import BrochurePosterClient from "./BrochurePosterClient";

type BrochureImage = {
  url: string;
  caption?: string;
};

type ReviewSlide = {
  key?: string;
  img?: string;
  text?: string;
};

type ReviewRecord = {
  id: string;
  title?: string;
  reviewId?: string;
  code?: string;
  creatorName?: string;
  creatorCode?: string;
  creatorId?: string;
  userId?: string;
  productId?: number | string;
  productIds?: Array<number | string>;
  productSlug?: string;
  productName?: string;
  productBundleName?: string;
  headline?: string;
  shortDescription?: string;
  description?: string;
  problem?: string;
  method?: string;
  result?: string;
  resultSummary?: string;
  disclaimer?: string;
  reviewLink?: string;
  slides?: ReviewSlide[];
  brochureImages?: BrochureImage[];
};

type ProductRecord = {
  id?: number | string;
  slug?: string;
  name?: string;
  title?: string;
  image?: string;
  images?: string[];
  price?: number;
  shortDescription?: string;
  category?: string;
  stock?: number;
  descriptionLong?: string;
  careNote?: string;
};

type TileItem = {
  image: string;
  label: string;
};

function normalizeId(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function readJsonArrayFile<T>(fileName: string): Promise<T[]> {
  try {
    const filePath = path.join(process.cwd(), "data", fileName);
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`read ${fileName} error:`, error);
    return [];
  }
}

async function getReviewById(reviewId: string): Promise<ReviewRecord | null> {
  const reviews = await readJsonArrayFile<ReviewRecord>("reviews.json");

  const found = reviews.find((item) => {
    return (
      normalizeId(item?.id) === normalizeId(reviewId) ||
      normalizeId(item?.reviewId) === normalizeId(reviewId) ||
      normalizeId(item?.code) === normalizeId(reviewId)
    );
  });

  return found ?? null;
}

async function getProductFromReview(
  review: ReviewRecord
): Promise<ProductRecord | null> {
  const products = await readJsonArrayFile<ProductRecord>("products.json");

  const mainProductId =
    normalizeId(review.productId) ||
    normalizeId(Array.isArray(review.productIds) ? review.productIds[0] : "");

  const found = products.find((item) => {
    return (
      normalizeId(item?.id) === mainProductId ||
      normalizeId(item?.slug) === normalizeId(review.productSlug)
    );
  });

  return found ?? null;
}

function getCreatorCode(review: ReviewRecord): string {
  const user = Array.isArray(users)
    ? users.find((u: any) => String(u.id) === String(review.userId))
    : null;

  return String(user?.creatorCode || review.creatorCode || "1124").trim();
}

function getProductMainImage(product: ProductRecord | null) {
  if (product?.image) return product.image;
  if (product?.images?.length) return product.images[0];
  return "/no-image.png";
}

function getProductName(product: ProductRecord | null, review: ReviewRecord) {
  return (
    product?.name ||
    product?.title ||
    review.productName ||
    review.productBundleName ||
    "สินค้าที่แนะนำ"
  );
}

function buildReviewTiles(review: ReviewRecord): TileItem[] {
  const slides = review.slides || [];

  return slides.slice(0, 5).map((s, i) => ({
    image: s.img || "/no-image.png",
    label: s.text || `STEP ${i + 1}`,
  }));
}

export default async function BrochurePage({
  params,
}: {
  params: Promise<{ reviewId: string }>;
}) {
  const { reviewId } = await params;
  const review = await getReviewById(reviewId);

  if (!review) {
    notFound();
  }

  const creatorCode = getCreatorCode(review);
  const product = await getProductFromReview(review);

  const headline =
    review.headline || review.title || "รีวิวผลลัพธ์จากการใช้งานจริง";

  const reviewTiles = buildReviewTiles(review);

  const productTile: TileItem = {
    image: getProductMainImage(product),
    label: getProductName(product, review),
  };

  const tiles = [...reviewTiles, productTile];

  const productSlug = String(product?.slug || review.productSlug || "").trim();
  const productReviewLink = productSlug
    ? `/product/${productSlug}?refReview=${review.id}`
    : "#";

  return (
    <BrochurePosterClient
      key={review.id}
      headline={headline}
      tiles={tiles}
      creatorCode={creatorCode}
      productInfo={{
        id: product?.id || review.productId || review.productIds?.[0] || "",
        slug: productSlug,
        name: getProductName(product, review),
        image: getProductMainImage(product),
        price: Number(product?.price || 0),
        shortDescription: product?.shortDescription || review.shortDescription || "",
        category: product?.category || "",
        stock: Number(product?.stock || 0),
        descriptionLong: product?.descriptionLong || "",
        careNote: product?.careNote || "",
        reviewLink: productReviewLink,
        reviewId: review.id,
        creatorName: review.creatorName || "ครีเอเตอร์",
      }}
    />
  );
}
