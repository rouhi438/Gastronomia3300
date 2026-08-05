import AdminOrderWatcher from "@/components/AdminOrderWatcher";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomCartBar from "@/components/BottomCartBar";
import "@/app/globals.css";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="shop-layout"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        paddingTop: "90px",
        backgroundColor: "var(--bg)",
        transition: "background-color 0.3s ease",
      }}
    >
      <AdminOrderWatcher />

      <Header />

      <main style={{ flex: 1 }}>{children}</main>

      <Footer />

      <BottomCartBar />
    </div>
  );
}
