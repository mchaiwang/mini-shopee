import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ EXTENDED: added optional fields for product / image messages.
// All new fields are optional → backward compatible with old messages
// stored in inquiries.json that don't have a `type` field.
type InquiryMessage = {
  id: string;
  sender: "customer" | "admin";
  senderName: string;
  message: string;
  createdAt: string;
  // ===== ADDED FIELDS =====
  type?: "text" | "product" | "image";
  productId?: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  imageUrl?: string;
  // ========================
};

type InquiryRoom = {
  id: string;
  productId: number;
  productName: string;
  productSlug: string;
  productImage?: string;
  customerUserId: string;
  customerName: string;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  messages: InquiryMessage[];
};

type AuthUser = {
  id: string | number;
  name?: string;
  email?: string;
  role?: string;
};

type ProductItem = {
  id: string | number;
  name?: string;
  slug?: string;
  image?: string;
};

type Subscriber = {
  id: string;
  userId: string;
  role: string;
  productId?: number;
  send: (payload: unknown) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __inquirySubscribers: Set<Subscriber> | undefined;
}

const DATA_DIR = path.join(process.cwd(), "data");
const INQUIRIES_PATH = path.join(DATA_DIR, "inquiries.json");
const PRODUCTS_PATH = path.join(DATA_DIR, "products.json");

function getSubscribers() {
  if (!global.__inquirySubscribers) {
    global.__inquirySubscribers = new Set<Subscriber>();
  }
  return global.__inquirySubscribers;
}

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(INQUIRIES_PATH)) {
    fs.writeFileSync(INQUIRIES_PATH, "[]", "utf8");
  }
}

function readJSONFile<T>(filePath: string, fallback: T): T {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSONFile(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function pruneExpired(rooms: InquiryRoom[]) {
  const now = Date.now();

  const filtered = rooms.filter((room) => {
    const expireAt = new Date(room.expiresAt || room.createdAt).getTime();
    return expireAt > now;
  });

  if (filtered.length !== rooms.length) {
    writeJSONFile(INQUIRIES_PATH, filtered);
  }

  return filtered;
}

function loadRooms(): InquiryRoom[] {
  ensureFiles();
  const rooms = readJSONFile<InquiryRoom[]>(INQUIRIES_PATH, []);
  return pruneExpired(Array.isArray(rooms) ? rooms : []);
}

function saveRooms(rooms: InquiryRoom[]) {
  ensureFiles();
  writeJSONFile(INQUIRIES_PATH, pruneExpired(rooms));
}

function getAuthUser(request: NextRequest) {
  try {
    const rawAuth = request.cookies.get("auth")?.value;
    if (!rawAuth) return null;

    const user = JSON.parse(decodeURIComponent(rawAuth)) as AuthUser;
    if (!user?.id) return null;

    return {
      id: String(user.id),
      name: String(user.name || user.email || "ลูกค้า"),
      email: String(user.email || ""),
      role: String(user.role || "customer"),
    };
  } catch {
    return null;
  }
}

function getProductById(productId: number) {
  const products = readJSONFile<ProductItem[]>(PRODUCTS_PATH, []);
  if (!Array.isArray(products)) return null;
  return products.find((p) => Number(p.id) === Number(productId)) || null;
}

function broadcastRoomUpdate(
  room: InquiryRoom,
  type: "room_updated" | "room_deleted" = "room_updated"
) {
  const subscribers = getSubscribers();

  subscribers.forEach((subscriber) => {
    const sameProduct =
      subscriber.productId == null ||
      Number(subscriber.productId) === Number(room.productId);

    if (!sameProduct) return;

    const isAdmin = subscriber.role === "admin";
    const isOwner =
      String(subscriber.userId) === String(room.customerUserId);

    if (!isAdmin && !isOwner) return;

    try {
      subscriber.send({
        type,
        room,
        at: new Date().toISOString(),
      });
    } catch {
      // ignore broken subscriber
    }
  });
}

// ✅ ADDED: helper that builds a fully-typed message from the request body.
// Centralises validation so POST and PUT behave consistently.
// - "text"    → requires non-empty `message`
// - "product" → requires productId; productName/Slug/Image enriched from products.json if missing
// - "image"   → requires imageUrl (data URL or path)
function buildMessageFromBody(
  body: any,
  sender: "customer" | "admin",
  senderName: string,
  createdAt: string
): InquiryMessage | { error: string } {
  const rawType = String(body?.type || "text").toLowerCase();
  const type: "text" | "product" | "image" =
    rawType === "product" || rawType === "image" ? rawType : "text";

  const baseMsg: InquiryMessage = {
    id: makeId("msg"),
    sender,
    senderName,
    message: "",
    createdAt,
    type,
  };

  if (type === "text") {
    const text = String(body?.message || "").trim();
    if (!text) return { error: "ข้อความว่างเปล่า" };
    baseMsg.message = text;
    return baseMsg;
  }

  if (type === "image") {
    const imageUrl = String(body?.imageUrl || "").trim();
    if (!imageUrl) return { error: "ไม่พบรูปภาพ" };
    baseMsg.imageUrl = imageUrl;
    baseMsg.message = String(body?.message || "").trim(); // optional caption
    return baseMsg;
  }

  // type === "product"
  const productId = Number(body?.productId);
  if (!productId) return { error: "ไม่พบสินค้าที่จะส่ง" };

  // Pull canonical info from products.json, but allow client to override
  const productInfo = getProductById(productId);
  baseMsg.productId = productId;
  baseMsg.productName =
    String(body?.productName || productInfo?.name || `สินค้า ${productId}`);
  baseMsg.productSlug = String(body?.productSlug || productInfo?.slug || "");
  baseMsg.productImage = String(
    body?.productImage || (productInfo as any)?.image || "/no-image.png"
  );
  baseMsg.message = String(body?.message || "").trim();
  return baseMsg;
}

export async function GET(request: NextRequest) {
  try {
    const me = getAuthUser(request);

    if (!me) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    let rooms = loadRooms();

    const productIdParam = request.nextUrl.searchParams.get("productId");
    const adminMode = request.nextUrl.searchParams.get("admin") === "1";
    const allMode = request.nextUrl.searchParams.get("all") === "1";
    const roomId = request.nextUrl.searchParams.get("id");

    if (me.role !== "admin") {
      rooms = rooms.filter(
        (room) => String(room.customerUserId) === String(me.id)
      );
    }

    if (roomId) {
      const room = rooms.find((item) => item.id === roomId) || null;
      return NextResponse.json({ room });
    }

    if (adminMode && me.role === "admin") {
      if (productIdParam) {
        const productId = Number(productIdParam);
        rooms = rooms.filter(
          (room) => Number(room.productId) === Number(productId)
        );
      }

      rooms = [...rooms].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return NextResponse.json({ rooms });
    }

    if (allMode) {
      if (productIdParam) {
        const productId = Number(productIdParam);
        rooms = rooms.filter(
          (room) => Number(room.productId) === Number(productId)
        );
      }

      rooms = [...rooms].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return NextResponse.json({ rooms });
    }

    if (productIdParam) {
      const productId = Number(productIdParam);

      const room =
        [...rooms]
          .filter((room) => Number(room.productId) === Number(productId))
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )[0] || null;

      return NextResponse.json({ room });
    }

    rooms = [...rooms].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    const room = rooms[0] || null;
    return NextResponse.json({ room });
  } catch {
    return NextResponse.json(
      { error: "โหลดข้อมูลแชทไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

// ✅ MODIFIED: POST now accepts text / product / image messages.
// Old callers that send only { productId, message } continue to work unchanged
// because buildMessageFromBody defaults type to "text".
export async function POST(request: NextRequest) {
  try {
    const me = getAuthUser(request);

    if (!me) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const productId = Number(body.productId);

    if (!productId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ" },
        { status: 400 }
      );
    }

    const product = getProductById(productId);

    if (!product) {
      return NextResponse.json(
        { error: "ไม่พบสินค้า" },
        { status: 404 }
      );
    }

    const rooms = loadRooms();
    const now = nowIso();

    let room = rooms.find(
      (item) =>
        Number(item.productId) === productId &&
        String(item.customerUserId) === String(me.id)
    );

    if (!room) {
      room = {
        id: makeId("room"),
        productId,
        productName: String(product.name || `สินค้า ${productId}`),
        productSlug: String(product.slug || ""),
        productImage: (product as any).image || "/no-image.png",
        customerUserId: me.id,
        customerName: me.name,
        status: "open",
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        messages: [],
      };

      rooms.unshift(room);
    }

    // ===== USE NEW HELPER (was: hard-coded text message) =====
    const built = buildMessageFromBody(
      body,
      me.role === "admin" ? "admin" : "customer",
      me.name,
      now
    );

    if ("error" in built) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }

    room.messages.push(built);
    // =========================================================

    room.updatedAt = now;

    saveRooms(rooms);
    broadcastRoomUpdate(room, "room_updated");

    return NextResponse.json({
      ok: true,
      room,
    });
  } catch {
    return NextResponse.json(
      { error: "ส่งข้อความไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

// ✅ MODIFIED: PUT (admin reply) now also supports product / image messages.
// Old payload { id, message } still works; old payload { id, status } still works.
export async function PUT(request: NextRequest) {
  try {
    const me = getAuthUser(request);

    if (!me || me.role !== "admin") {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const roomId = String(body.id || "").trim();
    const status = String(body.status || "").trim();

    if (!roomId) {
      return NextResponse.json(
        { error: "ไม่พบ id ห้องแชท" },
        { status: 400 }
      );
    }

    const rooms = loadRooms();
    const roomIndex = rooms.findIndex((room) => room.id === roomId);

    if (roomIndex === -1) {
      return NextResponse.json(
        { error: "ไม่พบห้องแชท" },
        { status: 404 }
      );
    }

    const room = rooms[roomIndex];
    const now = nowIso();

    // ===== Detect "is this a message send?" =====
    // We treat the request as a message-send if any of these are present:
    //   - body.message (legacy text payload)
    //   - body.type === "product" with productId
    //   - body.type === "image" with imageUrl
    const rawType = String(body?.type || "").toLowerCase();
    const hasMessagePayload =
      Boolean(String(body?.message || "").trim()) ||
      (rawType === "product" && Boolean(Number(body?.productId))) ||
      (rawType === "image" && Boolean(String(body?.imageUrl || "").trim()));

    if (hasMessagePayload) {
      const built = buildMessageFromBody(
        body,
        "admin",
        me.name || "Admin",
        now
      );

      if ("error" in built) {
        return NextResponse.json({ error: built.error }, { status: 400 });
      }

      room.messages.push(built);
      room.updatedAt = now;
    }
    // ============================================

    if (status === "open" || status === "closed") {
      room.status = status;
      room.updatedAt = now;
    }

    rooms[roomIndex] = room;
    saveRooms(rooms);
    broadcastRoomUpdate(room, "room_updated");

    return NextResponse.json({
      ok: true,
      room,
    });
  } catch {
    return NextResponse.json(
      { error: "อัปเดตข้อมูลไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const me = getAuthUser(request);

    if (!me || me.role !== "admin") {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์" },
        { status: 403 }
      );
    }

    const roomId = request.nextUrl.searchParams.get("id");

    if (!roomId) {
      return NextResponse.json(
        { error: "ไม่พบ id" },
        { status: 400 }
      );
    }

    const rooms = loadRooms();
    const room = rooms.find((item) => item.id === roomId) || null;
    const filtered = rooms.filter((item) => item.id !== roomId);

    saveRooms(filtered);

    if (room) {
      broadcastRoomUpdate(room, "room_deleted");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "ลบข้อมูลไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
