import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthUser = {
  id: string | number;
  name?: string;
  email?: string;
  role?: string;
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

function getSubscribers() {
  if (!global.__inquirySubscribers) {
    global.__inquirySubscribers = new Set<Subscriber>();
  }
  return global.__inquirySubscribers;
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

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function GET(request: NextRequest) {
  const me = getAuthUser(request);

  if (!me) {
    return new Response("Unauthorized", { status: 401 });
  }

  const productIdParam = request.nextUrl.searchParams.get("productId");
  const productId = productIdParam ? Number(productIdParam) : undefined;

  const encoder = new TextEncoder();
  const subscribers = getSubscribers();

  let subscriberId = "";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // ignore
        }
      };

      subscriberId = makeId("sub");

      const subscriber: Subscriber = {
        id: subscriberId,
        userId: me.id,
        role: me.role,
        productId,
        send,
      };

      subscribers.add(subscriber);

      send({
        type: "connected",
        ok: true,
        at: new Date().toISOString(),
      });

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          subscribers.forEach((s) => {
            if (s.id === subscriberId) subscribers.delete(s);
          });
        }
      }, 25000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        subscribers.forEach((s) => {
          if (s.id === subscriberId) subscribers.delete(s);
        });

        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
    cancel() {
      subscribers.forEach((s) => {
        if (s.id === subscriberId) subscribers.delete(s);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}