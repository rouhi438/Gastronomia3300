"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type PendingOrderResponse = {
  order?: {
    id: number;
    created_at: string;
  } | null;
  error?: string;
};

const CHECK_INTERVAL_MS = 5000;

const PROCESSING_PATHS = [
  "/admin/new-order",
  "/admin/select-time",
  "/admin/order-accepted",
];

function isProcessingOrder(pathname: string): boolean {
  return PROCESSING_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export default function AdminOrderWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  const supabase = useMemo(() => createClient(), []);

  const pathnameRef = useRef(pathname);
  const redirectingRef = useRef(false);
  const isAdminRef = useRef(false);

  useEffect(() => {
    pathnameRef.current = pathname;
    redirectingRef.current = false;
  }, [pathname]);

  const openNewOrderPage = useCallback(() => {
    const currentPath = pathnameRef.current;

    if (redirectingRef.current || isProcessingOrder(currentPath)) {
      return;
    }

    redirectingRef.current = true;

    router.replace("/admin/new-order");
  }, [router]);

  const checkPendingOrder = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/admin/orders/pending", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        isAdminRef.current = false;
        return false;
      }

      if (!response.ok) {
        return isAdminRef.current;
      }

      const result = (await response.json()) as PendingOrderResponse;

      isAdminRef.current = true;

      if (result.order) {
        openNewOrderPage();
      }

      return true;
    } catch (error: unknown) {
      console.error("Pending order check failed:", error);

      return isAdminRef.current;
    }
  }, [openNewOrderPage]);

  useEffect(() => {
    let intervalId: number | null = null;

    void checkPendingOrder();

    intervalId = window.setInterval(() => {
      void checkPendingOrder();
    }, CHECK_INTERVAL_MS);

    const handlePageVisible = () => {
      if (document.visibilityState === "visible") {
        void checkPendingOrder();
      }
    };

    const handleWindowFocus = () => {
      void checkPendingOrder();
    };

    document.addEventListener("visibilitychange", handlePageVisible);

    window.addEventListener("focus", handleWindowFocus);

    const channel = supabase
      .channel("admin-order-watcher")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          const newOrder = payload.new as {
            status?: unknown;
          };

          if (isAdminRef.current && newOrder.status === "pending") {
            openNewOrderPage();
          }
        },
      )
      .subscribe();

    return () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      document.removeEventListener("visibilitychange", handlePageVisible);

      window.removeEventListener("focus", handleWindowFocus);

      void supabase.removeChannel(channel);
    };
  }, [checkPendingOrder, openNewOrderPage, supabase]);

  return null;
}
