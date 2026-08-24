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
    let disposed = false;
    let watching = false;
    let intervalId: number | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const stopWatching = () => {
      watching = false;
      isAdminRef.current = false;
      redirectingRef.current = false;

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }

      document.removeEventListener("visibilitychange", handlePageVisible);
      window.removeEventListener("focus", handleWindowFocus);

      if (channel) {
        const currentChannel = channel;
        channel = null;

        void supabase.removeChannel(currentChannel);
      }
    };

    const runCheck = async () => {
      const isAuthorized = await checkPendingOrder();

      if (!isAuthorized) {
        stopWatching();
      }
    };

    function handlePageVisible() {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    }

    function handleWindowFocus() {
      void runCheck();
    }

    const startWatching = () => {
      if (disposed || watching) {
        return;
      }

      watching = true;
      isAdminRef.current = true;

      void runCheck();

      intervalId = window.setInterval(() => {
        void runCheck();
      }, CHECK_INTERVAL_MS);

      document.addEventListener("visibilitychange", handlePageVisible);
      window.addEventListener("focus", handleWindowFocus);

      channel = supabase
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
    };

    const syncAdminSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (disposed) {
        return;
      }

      if (user?.app_metadata?.role === "admin") {
        startWatching();
      } else {
        stopWatching();
      }
    };

    void syncAdminSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.app_metadata?.role === "admin") {
        startWatching();
      } else {
        stopWatching();
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
      stopWatching();
    };
  }, [checkPendingOrder, openNewOrderPage, supabase]);
  return null;
}
