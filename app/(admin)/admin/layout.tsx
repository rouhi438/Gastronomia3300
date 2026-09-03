import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminHeader from "@/components/AdminHeader";
import AdminOrderWatcher from "@/components/AdminOrderWatcher";
import { createClient } from "@/lib/supabase/server";

import styles from "./admin-layout.module.css";

export const metadata: Metadata = {
  title: "Adminportal | Gastronomia 3300",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth?redirect=/admin/orders");
  }

  if (user.app_metadata?.role !== "admin") {
    redirect("/");
  }

  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";

  const adminLabel = fullName || user.email || "Admin";

  return (
    <div className={styles.portal}>
      <AdminOrderWatcher />

      <AdminHeader userLabel={adminLabel} />

      <div className={styles.content}>{children}</div>
    </div>
  );
}
