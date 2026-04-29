"use client";

import { useEffect, useState } from "react";

/**
 * Hook ตรวจสอบว่าจอเป็น mobile หรือไม่ (default: width <= 640px)
 *
 * รองรับ SSR — ครั้งแรกจะคืน false เสมอเพื่อไม่ให้ HTML ที่ server กับ client ต่างกัน
 * แล้วค่อย update หลังจาก mount เสร็จ
 */
export function useIsMobile(breakpoint: number = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const update = () => setIsMobile(mql.matches);
    update();

    // รองรับทั้ง browser ใหม่และเก่า
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    } else {
      mql.addListener(update);
      return () => mql.removeListener(update);
    }
  }, [breakpoint]);

  return isMobile;
}
