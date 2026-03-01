import React, { useEffect, useState } from "react";
import api from "../api/api";
import PageHeader from "../components/PageHeader";

function StatusBadge({ status }) {
    const s = String(status || "").toUpperCase();

    const map = {
        NEW: "bg-slate-100 text-slate-700",
        CREATED: "bg-slate-100 text-slate-700",
        PAID: "bg-emerald-100 text-emerald-800",
        DELIVERED: "bg-blue-100 text-blue-800",
        CANCELLED: "bg-red-100 text-red-800",
    };

    const cls = map[s] || "bg-slate-100 text-slate-700";

    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {s || "UNKNOWN"}
    </span>
    );
}

function fmtDate(s) {
    if (!s) return "-";
    return String(s).replace("T", " ").replace("Z", "");
}

function normalizeOrderRow(o) {
    // list: {id, status, total_amount, created_at}
    return {
        id: o.id,
        status: o.status,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
    };
}

function normalizeOrderDetails(d) {
    // details: {order_id, status, created_at, total_amount, items:{value:"[...]"}}
    let itemsArr = [];

    try {
        const raw = d?.items?.value;
        if (raw) itemsArr = JSON.parse(raw);
    } catch {
        itemsArr = [];
    }

    return {
        id: d.order_id,
        status: d.status,
        createdAt: d.created_at,
        totalAmount: d.total_amount,
        items: itemsArr, // [{productId,name,qty,price}]
    };
}

export default function MyOrdersPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [orders, setOrders] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [details, setDetails] = useState(null);

    const [msg, setMsg] = useState("");

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line
    }, []);

    async function loadOrders() {
        setLoading(true);
        setError("");
        setMsg("");
        try {
            const res = await api.get("/api/orders/my");
            const list = (res.data || []).map(normalizeOrderRow);
            setOrders(list);
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось загрузить заказы");
        } finally {
            setLoading(false);
        }
    }

    async function loadDetails(orderId) {
        setSelectedId(orderId);
        setDetails(null);
        setDetailsLoading(true);
        setDetailsError("");
        setMsg("");

        try {
            const res = await api.get(`/api/orders/my/${orderId}`);
            setDetails(normalizeOrderDetails(res.data));
        } catch (e) {
            setDetailsError(e?.response?.data?.message || "Не удалось загрузить детали заказа");
        } finally {
            setDetailsLoading(false);
        }
    }

    async function cancelOrder(orderId) {
        setMsg("");
        setError("");
        setDetailsError("");

        try {
            await api.post(`/api/orders/my/${orderId}/cancel`);
            setMsg("Заказ отменён");
            await loadOrders();
            if (selectedId === orderId) {
                await loadDetails(orderId);
            }
        } catch (e) {
            setMsg("");
            setDetailsError(e?.response?.data?.message || "Не удалось отменить заказ");
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                <PageHeader
                    title="Мои заказы"
                    subtitle="Список заказов BUYER, просмотр деталей и отмена"
                />

                <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        Всего заказов: <span className="font-semibold">{orders.length}</span>
                    </div>
                    <button
                        onClick={loadOrders}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                    >
                        Обновить
                    </button>
                </div>

                {loading && (
                    <div className="bg-white rounded-2xl shadow p-4 text-slate-600">
                        Загрузка...
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
                        {error}
                    </div>
                )}

                {msg && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
                        {msg}
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-4">
                    {/* left: list */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
                        <h2 className="text-lg font-semibold mb-3">Список</h2>

                        {!orders.length && !loading ? (
                            <div className="text-slate-500 text-sm">Заказов пока нет</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {orders.map((o) => (
                                    <div key={o.id} className="py-3 flex items-center gap-3">
                                        <div className="w-20 text-sm text-slate-500">#{o.id}</div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={o.status} />
                                                <span className="text-sm text-slate-500">
                          {fmtDate(o.createdAt)}
                        </span>
                                            </div>

                                            <div className="text-sm text-slate-600 mt-1">
                                                Сумма: <span className="font-semibold">{o.totalAmount ?? "-"}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => loadDetails(o.id)}
                                            className={`rounded-xl px-3 py-2 text-sm border transition ${
                                                selectedId === o.id
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "bg-white border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                            Детали
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* right: details */}
                    <div className="bg-white rounded-2xl shadow p-4">
                        <h2 className="text-lg font-semibold">Детали</h2>

                        {!selectedId && (
                            <div className="text-slate-500 text-sm mt-2">
                                Выберите заказ слева
                            </div>
                        )}

                        {detailsLoading && (
                            <div className="text-slate-600 text-sm mt-3">Загрузка деталей...</div>
                        )}

                        {detailsError && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                {detailsError}
                            </div>
                        )}

                        {details && (
                            <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        Заказ: <span className="font-semibold">#{details.id}</span>
                                    </div>
                                    <StatusBadge status={details.status} />
                                </div>

                                <div className="text-sm text-slate-600">
                                    Дата: <span className="font-medium">{fmtDate(details.createdAt)}</span>
                                </div>

                                <div className="text-sm text-slate-600">
                                    Сумма: <span className="font-semibold">{details.totalAmount ?? "-"}</span>
                                </div>

                                <div>
                                    <div className="text-sm font-semibold mb-2">Товары</div>

                                    {!details.items?.length ? (
                                        <div className="text-slate-500 text-sm">Нет позиций</div>
                                    ) : (
                                        <div className="space-y-2">
                                            {details.items.map((it, idx) => (
                                                <div key={idx} className="border border-slate-200 rounded-xl p-3">
                                                    <div className="font-medium">{it.name || `productId=${it.productId}`}</div>
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        Кол-во:{" "}
                                                        <span className="font-medium text-slate-700">{it.qty}</span>{" "}
                                                        • Цена:{" "}
                                                        <span className="font-medium text-slate-700">{it.price}</span>{" "}
                                                        • Сумма:{" "}
                                                        <span className="font-medium text-slate-700">
                              {Number(it.price || 0) * Number(it.qty || 0)}
                            </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {["NEW", "CREATED"].includes(String(details.status || "").toUpperCase()) ? (
                                    <button
                                        onClick={() => cancelOrder(details.id)}
                                        className="w-full rounded-xl border border-red-200 text-red-700 py-2 text-sm hover:bg-red-50 transition"
                                    >
                                        Отменить заказ
                                    </button>
                                ) : (
                                    <div className="text-xs text-slate-500">
                                        Отмена доступна только для новых заказов
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}