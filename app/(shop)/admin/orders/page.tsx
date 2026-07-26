"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

type OrderStatus = "pending" | "accepted" | "ready" | "completed" | "cancelled";

interface OrderItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  size: string;
  extras: string[];
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  total_price: number;
  status: OrderStatus;
  estimated_time: number | null;
  created_at: string;
  delivery_method: "pickup" | "delivery";
  order_items: OrderItem[];
}

const statusLabels: Record<OrderStatus, string> = {
  pending: "Afventer",
  accepted: "Accepteret",
  ready: "Klar",
  completed: "Leveret",
  cancelled: "Annulleret",
};

const statusColors: Record<OrderStatus, string> = {
  pending: "#f59e0b",
  accepted: "#10b981",
  ready: "#3b82f6",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const prevOrderCountRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = async () => {
    const token = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    try {
      const res = await fetch("/api/admin/orders", {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Refresh-Token": refreshToken || "",
        },
      });

      if (res.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        router.push("/auth");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch orders");
      }

      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    intervalRef.current = setInterval(fetchOrders, 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [router]);

  const groupOrdersByDate = (orders: Order[]) => {
    const groups: Record<
      string,
      { label: string; orders: Order[]; total: number }
    > = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    orders.forEach((order) => {
      const date = new Date(order.created_at);
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().split("T")[0];

      let label = key;
      if (date.getTime() === today.getTime()) label = "I dag";
      else if (date.getTime() === yesterday.getTime()) label = "I går";

      if (!groups[key]) {
        groups[key] = { label, orders: [], total: 0 };
      }
      groups[key].orders.push(order);
      groups[key].total += order.total_price;
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => (a < b ? 1 : -1));
    const sortedGroups: Record<
      string,
      { label: string; orders: Order[]; total: number }
    > = {};
    sortedKeys.forEach((key) => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  };

  const groupedOrders = groupOrdersByDate(orders);

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedOrder(null);
  };

  if (loading) {
    return <div className={styles.loading}>Indlæser ordrer...</div>;
  }

  if (error) {
    return <div className={styles.error}>Fejl: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ordreoversigt</h1>

      {orders.length === 0 ? (
        <p className={styles.empty}>Ingen ordrer endnu.</p>
      ) : (
        <div className={styles.groups}>
          {Object.entries(groupedOrders).map(([key, group]) => {
            const isExpanded = expandedGroups.has(key);
            return (
              <div key={key} className={styles.group}>
                <div
                  className={styles.groupHeader}
                  onClick={() => toggleGroup(key)}
                >
                  <div className={styles.groupLabel}>
                    <span className={styles.groupTitle}>{group.label}</span>
                    <span className={styles.groupCount}>
                      {group.orders.length} ordrer
                    </span>
                  </div>
                  <div className={styles.groupTotal}>
                    <span className={styles.groupTotalLabel}>I alt:</span>
                    <span className={styles.groupTotalAmount}>
                      {group.total} kr.
                    </span>
                    <span className={styles.groupArrow}>
                      {isExpanded ? "▾" : "▸"}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.groupOrders}>
                    {group.orders.map((order) => (
                      <div
                        key={order.id}
                        className={styles.orderCard}
                        onClick={() => handleOrderClick(order)}
                      >
                        <div className={styles.orderCardHeader}>
                          <div className={styles.orderCardLeft}>
                            <span className={styles.orderCardId}>
                              #{order.id}
                            </span>
                            <span className={styles.orderCardTime}>
                              {new Date(order.created_at).toLocaleTimeString(
                                "da-DK",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          </div>
                          <div className={styles.orderCardRight}>
                            <span
                              className={styles.orderCardStatus}
                              style={{
                                backgroundColor:
                                  statusColors[order.status] + "20",
                                color: statusColors[order.status],
                              }}
                            >
                              {statusLabels[order.status]}
                            </span>
                            <span className={styles.orderCardTotal}>
                              {order.total_price} kr.
                            </span>
                          </div>
                        </div>
                        <div className={styles.orderCardCustomer}>
                          <span className={styles.orderCardName}>
                            {order.customer_name}
                          </span>
                          {order.customer_address && (
                            <span className={styles.orderCardAddress}>
                              • {order.customer_address}
                            </span>
                          )}
                          <span className={styles.orderCardPhone}>
                            • {order.customer_phone}
                          </span>
                        </div>
                        <div className={styles.orderCardItems}>
                          {order.order_items.slice(0, 2).map((item, idx) => (
                            <span key={idx} className={styles.orderCardItem}>
                              {item.quantity}× {item.item_name}
                            </span>
                          ))}
                          {order.order_items.length > 2 && (
                            <span className={styles.orderCardMore}>
                              + {order.order_items.length - 2} flere
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== Detail Modal ===== */}
      {showDetail && selectedOrder && (
        <div className={styles.modalOverlay} onClick={closeDetail}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={closeDetail}>
              ✕
            </button>
            <h2 className={styles.modalTitle}>Ordre #{selectedOrder.id}</h2>
            <div className={styles.modalBody}>
              <p>
                <strong>Kunde:</strong> {selectedOrder.customer_name}
              </p>
              <p>
                <strong>Tlf:</strong> {selectedOrder.customer_phone}
              </p>
              {selectedOrder.customer_address && (
                <p>
                  <strong>Adresse:</strong> {selectedOrder.customer_address}
                </p>
              )}
              <p>
                <strong>Type:</strong>{" "}
                {selectedOrder.delivery_method === "pickup"
                  ? "Afhentning"
                  : "Levering"}
              </p>
              <p>
                <strong>Status:</strong>{" "}
                {statusLabels[selectedOrder.status] || selectedOrder.status}
              </p>
              {selectedOrder.estimated_time && (
                <p>
                  <strong>Forventet tid:</strong> {selectedOrder.estimated_time}{" "}
                  min
                </p>
              )}
              <p>
                <strong>Dato:</strong>{" "}
                {new Date(selectedOrder.created_at).toLocaleString("da-DK")}
              </p>
              <hr className={styles.modalDivider} />
              <h4>Varer</h4>
              <ul className={styles.modalItems}>
                {selectedOrder.order_items.map((item) => (
                  <li key={item.id}>
                    {item.quantity}× {item.item_name}
                    {item.size && item.size !== "normal" && (
                      <span className={styles.modalMeta}> ({item.size})</span>
                    )}
                    {item.extras && item.extras.length > 0 && (
                      <span className={styles.modalMeta}>
                        {" "}
                        (+{item.extras.join(", ")})
                      </span>
                    )}
                    <span className={styles.modalItemPrice}>
                      {item.unit_price * item.quantity} kr.
                    </span>
                  </li>
                ))}
              </ul>
              <div className={styles.modalTotal}>
                <strong>I alt:</strong> {selectedOrder.total_price} kr.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
