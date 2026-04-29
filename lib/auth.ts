// /lib/auth.ts
import "server-only";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_DISPLAY_NAME,
  ADMIN_PASSWORD,
  ADMIN_ROLE,
  ADMIN_SESSION_TOKEN,
  ADMIN_USERNAME,
  AUTH_COOKIE_NAME,
} from "@/lib/auth-config";

export type CurrentUser = {
  username: string;
  name: string;
  role: string;
};

export function verifyAdminLogin(username: string, password: string) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token !== ADMIN_SESSION_TOKEN) {
    return null;
  }

  return {
    username: ADMIN_USERNAME,
    name: ADMIN_DISPLAY_NAME,
    role: ADMIN_ROLE,
  };
}

export function setAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: ADMIN_SESSION_TOKEN,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}