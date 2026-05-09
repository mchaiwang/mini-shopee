import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== existing message type (unchanged) =====
type InquiryMessage = {
  id: string;
  sender: "customer" | "admin";
  senderName: string;
  message: string;
  createdAt: string;
  type?: "text" | "product" | "image";
  productId?: number;
  productName?: string;
  productSlug?: string;
  productImage?: string;
  imageUrl?: string;
};

// ===== order snapshot stored on the room (read-only at chat time) =====
type OrderItemSnapshot = {
  id?: string | number;
  name?: string;
  image?: string;
  qty?: number;
  price?: number;
};

type OrderSnapshot = {
  orderId: string;
  customerName?: string;
  phone?: string;
  address?: string;
  total?: number;
  status?: string;
  items?: OrderItemSnapshot[];
  createdAt?: string;
};

// ===== room type — extended with optional order/guest fields =====
// Old fields are kept; new fields are all optional → backward compatible.
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

  // ===== ADDED: order-aware / guest-aware fields =====
  orderId?: string;            // เลขคำสั่งซื้อที่ผูกกับห้อง (ถ้ามี)
  isGuest?: boolean;           // true = ลูกค้าไม่ได้ลงทะเบียน
  guestToken?: string;         // token สำหรับยืนยัน guest (ถ้า isGuest)
  guestPhone?: string;         // เบอร์ของ guest (ใช้ระบุตัวรอง)
  customerPhone?: string;      // เบอร์ของลูกค้า (ทั้ง member และ guest)
  channel?: "inquire" | "order_chat" | "remind"; // ทักแชทธรรมดา / จากออเดอร์ / ทวงของ
  orderSnapshot?: OrderSnapshot; // ข้อมูลออเดอร์ ณ ตอนเปิดห้อง
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
  // ===== ADDED: subscribers identified by guestToken =====
  guestToken?: string;
  send: (payload: unknown) => void;
};

declare global {
  // eslint-disable-next-line no-var
  var __inquirySubscribers: Set<Subscriber> | undefined;
}

const DATA_DIR = path.join(process.cwd(), "data");
const INQUIRIES_PATH = path.join(DATA_DIR, "inquiries.json");
const PRODUCTS_PATH = path.join(DATA_DIR, "products.json");
const ORDERS_PATH = path.join(DATA_DIR, "orders.json");

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

// ===== ADDED: helpers for orders =====
function normalizePhone(phone: string) {
  return String(phone || "").replace(/\D/g, "");
}

function getOrderById(orderId: string) {
  if (!orderId) return null;
  const orders = readJSONFile<any[]>(ORDERS_PATH, []);
  if (!Array.isArray(orders)) return null;

  const target = String(orderId).trim();
  return (
    orders.find((o: any) => {
      const candidates = [o?.id, o?.orderId, o?._id]
        .filter(Boolean)
        .map((v: any) => String(v).trim());
      return candidates.includes(target);
    }) || null
  );
}

function buildOrderSnapshot(rawOrder: any): OrderSnapshot {
  const items: OrderItemSnapshot[] = Array.isArray(rawOrder?.items)
    ? rawOrder.items.map((it: any) => ({
        id: it?.id,
        name: it?.name || it?.title || "สินค้า",
        image: it?.image || "",
        qty: Number(it?.qty || it?.quantity || 1),
        price: Number(it?.price || 0),
      }))
    : [];

  const phone =
    rawOrder?.phone ||
    rawOrder?.customerPhone ||
    rawOrder?.tel ||
    rawOrder?.shippingPhone ||
    rawOrder?.deliveryPhone ||
    rawOrder?.shippingAddress?.phone ||
    "";

  const customerName =
    rawOrder?.fullName ||
    rawOrder?.name ||
    rawOrder?.customerName ||
    rawOrder?.shippingAddress?.fullName ||
    "";

  const address =
    rawOrder?.address ||
    rawOrder?.shippingAddress?.address ||
    rawOrder?.shippingAddressText ||
    "";

  return {
    orderId: String(rawOrder?.id || rawOrder?.orderId || rawOrder?._id || ""),
    customerName: String(customerName || ""),
    phone: String(phone || ""),
    address: String(address || ""),
    total: Number(
      rawOrder?.total || rawOrder?.totalPrice || rawOrder?.grandTotal || 0
    ),
    status: String(rawOrder?.status || ""),
    items,
    createdAt: String(rawOrder?.createdAt || rawOrder?.date || ""),
  };
}

// Build a friendly first message describing the order
function buildOrderFirstMessage(channel: string, snap: OrderSnapshot) {
  const lines: string[] = [];

  if (channel === "remind") {
    lines.push("📦 ลูกค้ากดทวงของจากคำสั่งซื้อนี้");
  } else {
    lines.push("💬 ลูกค้าติดต่อสอบถามจากคำสั่งซื้อนี้");
  }

  lines.push("");
  lines.push(`เลขคำสั่งซื้อ: #${snap.orderId || "-"}`);
  if (snap.customerName) lines.push(`ชื่อผู้รับ: ${snap.customerName}`);
  if (snap.phone) lines.push(`เบอร์โทร: ${snap.phone}`);
  if (snap.status) lines.push(`สถานะล่าสุด: ${snap.status}`);

  if (Array.isArray(snap.items) && snap.items.length > 0) {
    lines.push("");
    lines.push("รายการสินค้า:");
    snap.items.forEach((it) => {
      const name = it.name || "สินค้า";
      const qty = Number(it.qty || 1);
      lines.push(`• ${name} x ${qty}`);
    });
  }

  if (snap.total) {
    lines.push("");
    lines.push(`ยอดรวม: ฿${Number(snap.total).toLocaleString("th-TH")}`);
  }

  return lines.join("\n");
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
      subscriber.userId &&
      String(subscriber.userId) === String(room.customerUserId);
    // ===== ADDED: guest subscribers identified by guestToken =====
    const isGuestOwner =
      subscriber.guestToken &&
      room.guestToken &&
      subscriber.guestToken === room.guestToken;

    if (!isAdmin && !isOwner && !isGuestOwner) return;

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

// helper that builds a typed message from request body (unchanged behavior)
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
    baseMsg.message = String(body?.message || "").trim();
    return baseMsg;
  }

  // type === "product"
  const productId = Number(body?.productId);
  if (!productId) return { error: "ไม่พบสินค้าที่จะส่ง" };

  const productInfo = getProductById(productId);
  baseMsg.productId = productId;
  baseMsg.productName = String(
    body?.productName || productInfo?.name || `สินค้า ${productId}`
  );
  baseMsg.productSlug = String(body?.productSlug || productInfo?.slug || "");
  baseMsg.productImage = String(
    body?.productImage || (productInfo as any)?.image || "/no-image.png"
  );
  baseMsg.message = String(body?.message || "").trim();
  return baseMsg;
}

// ===== ADDED: extract guestToken from request (header / query / body fallback) =====
function getGuestTokenFromRequest(request: NextRequest, body?: any): string {
  const headerToken = request.headers.get("x-guest-token") || "";
  const queryToken = request.nextUrl.searchParams.get("guestToken") || "";
  const bodyToken = body?.guestToken ? String(body.guestToken) : "";
  return String(headerToken || queryToken || bodyToken || "").trim();
}

// ===== ADDED: visibility rule for a room when authed user / guest token / admin asks =====
function canSeeRoom(
  room: InquiryRoom,
  me: { id: string; role: string } | null,
  guestToken: string
) {
  if (me?.role === "admin") return true;
  if (me && String(room.customerUserId) === String(me.id)) return true;
  if (
    guestToken &&
    room.guestToken &&
    room.isGuest &&
    String(room.guestToken) === String(guestToken)
  ) {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const me = getAuthUser(request);
    const guestToken = getGuestTokenFromRequest(request);

    let rooms = loadRooms();

    const productIdParam = request.nextUrl.searchParams.get("productId");
    const orderIdParam = request.nextUrl.searchParams.get("orderId");
    const adminMode = request.nextUrl.searchParams.get("admin") === "1";
    const allMode = request.nextUrl.searchParams.get("all") === "1";
    const roomId = request.nextUrl.searchParams.get("id");

    // Guest path: must have guestToken to read anything
    if (!me && !guestToken) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    // Filter rooms by visibility
    rooms = rooms.filter((room) =>
      canSeeRoom(
        room,
        me ? { id: me.id, role: me.role } : null,
        guestToken
      )
    );

    // Specific room by id
    if (roomId) {
      const room = rooms.find((item) => item.id === roomId) || null;
      return NextResponse.json({ room });
    }

    // ===== Admin views =====
    if (adminMode) {
      if (!me || me.role !== "admin") {
        return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
      }

      // admin gets the FULL list (canSeeRoom passes everything for admin)
      let adminRooms = loadRooms();

      if (productIdParam) {
        const productId = Number(productIdParam);
        adminRooms = adminRooms.filter(
          (room) => Number(room.productId) === Number(productId)
        );
      }
      if (orderIdParam) {
        adminRooms = adminRooms.filter(
          (room) => String(room.orderId || "") === String(orderIdParam)
        );
      }

      adminRooms = [...adminRooms].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return NextResponse.json({ rooms: adminRooms });
    }

    // ===== Lookup by orderId (used by /order-chat) =====
    if (orderIdParam) {
      const room =
        [...rooms]
          .filter((room) => String(room.orderId || "") === String(orderIdParam))
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )[0] || null;

      return NextResponse.json({ room });
    }

    // ===== List mode for /my-chats =====
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

    // ===== Lookup by productId (used by /chat/product/[id]) =====
    if (productIdParam) {
      const productId = Number(productIdParam);

      const room =
        [...rooms]
          .filter(
            (room) =>
              Number(room.productId) === Number(productId) &&
              !room.orderId // ห้องสำหรับสินค้า ไม่ใช่ห้องของออเดอร์
          )
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
  } catch (error) {
    console.error("GET /api/inquiries error:", error);
    return NextResponse.json(
      { error: "โหลดข้อมูลแชทไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

// ===== POST =====
// Modes:
// (A) Existing product-inquiry mode: { productId, message?, type?, ... }  (auth required)
// (B) NEW order-chat mode: { orderId, source: "order_chat" | "remind",
//        guestToken?, guestName?, guestPhone? }
//     - if logged in → use auth user
//     - if not       → use/create guestToken; identify order by orderId+phone match
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const me = getAuthUser(request);

    // ----- branch (B): order-chat / remind -----
    if (body?.orderId) {
      return await handleOrderChatPost(request, body, me);
    }

    // ----- branch (A): legacy product inquiry — UNCHANGED behavior -----
    if (!me) {
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      );
    }

    const productId = Number(body.productId);

    if (!productId) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ครบ" },
        { status: 400 }
      );
    }

    const product = getProductById(productId);

    if (!product) {
      return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });
    }

    const rooms = loadRooms();
    const now = nowIso();

    let room = rooms.find(
      (item) =>
        Number(item.productId) === productId &&
        String(item.customerUserId) === String(me.id) &&
        !item.orderId
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
        channel: "inquire",
        isGuest: false,
      };

      rooms.unshift(room);
    }

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
    room.updatedAt = now;

    saveRooms(rooms);
    broadcastRoomUpdate(room, "room_updated");

    return NextResponse.json({
      ok: true,
      room,
    });
  } catch (error) {
    console.error("POST /api/inquiries error:", error);
    return NextResponse.json(
      { error: "ส่งข้อความไม่สำเร็จ" },
      { status: 500 }
    );
  }
}

// ===== ADDED: order-chat / remind handler =====
async function handleOrderChatPost(
  request: NextRequest,
  body: any,
  me: ReturnType<typeof getAuthUser>
) {
  const orderId = String(body.orderId || "").trim();
  const source: "order_chat" | "remind" =
    body?.source === "remind" ? "remind" : "order_chat";

  if (!orderId) {
    return NextResponse.json(
      { error: "ไม่พบเลขคำสั่งซื้อ" },
      { status: 400 }
    );
  }

  // Lookup the order to build a snapshot
  const rawOrder = getOrderById(orderId);
  if (!rawOrder) {
    return NextResponse.json(
      { error: "ไม่พบคำสั่งซื้อนี้ในระบบ" },
      { status: 404 }
    );
  }

  const snapshot = buildOrderSnapshot(rawOrder);

  // Guest path: client supplies (or we generate) a guestToken
  let guestToken = "";
  let isGuest = !me;
  if (!me) {
    guestToken =
      String(body?.guestToken || "").trim() ||
      `gtok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }

  // For guest mode we additionally check the phone matches the order
  if (isGuest) {
    const claimedPhone = normalizePhone(
      String(body?.guestPhone || snapshot.phone || "")
    );
    const orderPhone = normalizePhone(snapshot.phone || "");

    if (!orderPhone) {
      return NextResponse.json(
        { error: "คำสั่งซื้อนี้ไม่มีเบอร์โทรในระบบ ไม่สามารถเปิดแชทได้" },
        { status: 400 }
      );
    }

    if (!claimedPhone || claimedPhone !== orderPhone) {
      return NextResponse.json(
        {
          error:
            "ไม่สามารถยืนยันสิทธิ์ของลูกค้าได้ กรุณาเข้าหน้าตรวจสอบคำสั่งซื้อด้วยเบอร์โทรที่สั่งซื้อ",
        },
        { status: 403 }
      );
    }
  }

  const rooms = loadRooms();
  const now = nowIso();

  // Find an existing room for this order
  let room = rooms.find((r) => String(r.orderId || "") === String(orderId));

  // If room exists but belongs to a different identity, prefer the existing one
  // when identity matches; otherwise still return the existing one (no duplicates).
  if (!room) {
    // Build a productId hint: take the first item's id (best-effort)
    const firstItem = Array.isArray(snapshot.items)
      ? snapshot.items[0]
      : null;
    const productIdGuess = Number(firstItem?.id || 0) || 0;
    const productInfo = productIdGuess
      ? getProductById(productIdGuess)
      : null;
    const productNameGuess =
      productInfo?.name ||
      firstItem?.name ||
      `คำสั่งซื้อ #${orderId}`;
    const productSlugGuess = productInfo?.slug || "";
    const productImageGuess =
      (productInfo as any)?.image ||
      firstItem?.image ||
      "/no-image.png";

    const customerUserId = me ? me.id : `guest_${guestToken}`;
    const customerName = me
      ? me.name
      : String(body?.guestName || snapshot.customerName || "ลูกค้าไม่ลงทะเบียน");
    const customerPhone = String(snapshot.phone || body?.guestPhone || "");

    room = {
      id: makeId("room"),
      productId: productIdGuess,
      productName: String(productNameGuess),
      productSlug: String(productSlugGuess),
      productImage: String(productImageGuess),
      customerUserId,
      customerName,
      status: "open",
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      messages: [],

      // order/guest fields
      orderId,
      isGuest,
      guestToken: isGuest ? guestToken : undefined,
      guestPhone: isGuest ? customerPhone : undefined,
      customerPhone,
      channel: source,
      orderSnapshot: snapshot,
    };

    rooms.unshift(room);

    // Auto first message describing the order
    const firstMessage: InquiryMessage = {
      id: makeId("msg"),
      sender: "customer",
      senderName: customerName,
      message: buildOrderFirstMessage(source, snapshot),
      createdAt: now,
      type: "text",
    };
    room.messages.push(firstMessage);
  } else {
    // Existing room — refresh snapshot status (so admin sees the latest order
    // status) but DO NOT duplicate the first message.
    room.orderSnapshot = snapshot;
    if (!room.channel) room.channel = source;
    if (!room.customerPhone) room.customerPhone = String(snapshot.phone || "");
    room.updatedAt = now;
  }

  saveRooms(rooms);
  broadcastRoomUpdate(room, "room_updated");

  return NextResponse.json({
    ok: true,
    room,
    guestToken: isGuest ? guestToken : undefined,
  });
}

// ===== PUT (admin replies / send messages / change status) =====
// EXTENDED: customer (authed OR guest with token) can also send a message
// into a room they own (only if the room has an orderId — i.e. order-chat room).
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const me = getAuthUser(request);
    const guestToken = getGuestTokenFromRequest(request, body);

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

    // Permission resolution
    const isAdmin = me?.role === "admin";
    const isMember =
      !!me && String(room.customerUserId) === String(me.id);
    const isGuestOwner =
      !!guestToken &&
      room.isGuest &&
      String(room.guestToken || "") === String(guestToken);

    if (!isAdmin && !isMember && !isGuestOwner) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const now = nowIso();

    // ===== detect message-send payload =====
    const rawType = String(body?.type || "").toLowerCase();
    const hasMessagePayload =
      Boolean(String(body?.message || "").trim()) ||
      (rawType === "product" && Boolean(Number(body?.productId))) ||
      (rawType === "image" && Boolean(String(body?.imageUrl || "").trim()));

    if (hasMessagePayload) {
      // Customer-side messaging only allowed when room is open
      if (!isAdmin && room.status === "closed") {
        return NextResponse.json(
          { error: "ห้องแชทถูกปิดแล้ว" },
          { status: 400 }
        );
      }

      const sender: "customer" | "admin" = isAdmin ? "admin" : "customer";
      const senderName = isAdmin
        ? me?.name || "Admin"
        : me?.name || room.customerName || "ลูกค้า";

      const built = buildMessageFromBody(body, sender, senderName, now);

      if ("error" in built) {
        return NextResponse.json({ error: built.error }, { status: 400 });
      }

      room.messages.push(built);
      room.updatedAt = now;
    }

    // status changes are admin-only
    if (status === "open" || status === "closed") {
      if (!isAdmin) {
        return NextResponse.json(
          { error: "ไม่มีสิทธิ์เปลี่ยนสถานะห้อง" },
          { status: 403 }
        );
      }
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
  } catch (error) {
    console.error("PUT /api/inquiries error:", error);
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
      return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
    }

    const roomId = request.nextUrl.searchParams.get("id");

    if (!roomId) {
      return NextResponse.json({ error: "ไม่พบ id" }, { status: 400 });
    }

    const rooms = loadRooms();
    const room = rooms.find((item) => item.id === roomId) || null;
    const filtered = rooms.filter((item) => item.id !== roomId);

    saveRooms(filtered);

    if (room) {
      broadcastRoomUpdate(room, "room_deleted");
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/inquiries error:", error);
    return NextResponse.json(
      { error: "ลบข้อมูลไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
