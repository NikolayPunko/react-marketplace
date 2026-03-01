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

function fmt(s) {
    if (!s) return "-";
    return String(s).replace("T", " ").replace("Z", "");
}

export default function AdminOrdersPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [orders, setOrders] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const [detailsLoading, setDetailsLoading] = useState(false);
    const [detailsError, setDetailsError] = useState("");
    const [details, setDetails] = useState(null);

    const [msg, setMsg] = useState("");

    const [newStatus, setNewStatus] = useState("DELIVERED");

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line
    }, []);

    async function loadOrders() {
        setLoading(true);
        setError("");
        setMsg("");
        try {
            const res = await api.get("/api/orders/admin");
            setOrders(res.data || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось загрузить все заказы");
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
            const res = await api.get(`/api/orders/admin/${orderId}`);
            setDetails(res.data);
        } catch (e) {
            setDetailsError(e?.response?.data?.message || "Не удалось загрузить детали заказа");
        } finally {
            setDetailsLoading(false);
        }
    }

    async function updateStatus() {
        setMsg("");
        setError("");
        setDetailsError("");

        if (!selectedId) {
            setMsg("Выберите заказ");
            return;
        }

        try {
            await api.put(`/api/orders/admin/${selectedId}/status`, null, {
                params: { status: newStatus },
            });
            setMsg("Статус обновлён");
            await loadOrders();
            await loadDetails(selectedId);
        } catch (e) {
            setDetailsError(e?.response?.data?.message || "Не удалось обновить статус");
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                <PageHeader title="Все заказы (ADMIN)" subtitle="Просмотр и смена статусов заказов" />

                <div className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                        Всего: <span className="font-semibold">{orders.length}</span>
                    </div>
                    <button
                        onClick={loadOrders}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                    >
                        Обновить
                    </button>
                </div>

                {loading && <div className="bg-white rounded-2xl shadow p-4 text-slate-600">Загрузка...</div>}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">{error}</div>
                )}

                {msg && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
                        {msg}
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
                        <h2 className="text-lg font-semibold mb-3">Список</h2>

                        {!orders.length && !loading ? (
                            <div className="text-slate-500 text-sm">Заказов нет</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {orders.map((o) => (
                                    <div key={o.id} className="py-3 flex items-center gap-3">
                                        <div className="w-20 text-sm text-slate-500">#{o.id}</div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={o.status} />
                                                <span className="text-sm text-slate-500">{fmt(o.createdAt || o.created_at)}</span>
                                            </div>
                                            <div className="text-sm text-slate-600 mt-1">
                                                Сумма: <span className="font-semibold">{o.totalAmount ?? o.total_amount ?? "-"}</span>
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

                    <div className="bg-white rounded-2xl shadow p-4">
                        <h2 className="text-lg font-semibold">Детали</h2>

                        {!selectedId && <div className="text-slate-500 text-sm mt-2">Выберите заказ слева</div>}

                        {detailsLoading && <div className="text-slate-600 text-sm mt-3">Загрузка...</div>}

                        {detailsError && (
                            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                {detailsError}
                            </div>
                        )}

                        {details && (
                            <div className="mt-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-slate-600">
                                        Заказ: <span className="font-semibold">#{details.id ?? details.order_id}</span>
                                    </div>
                                    <StatusBadge status={details.status} />
                                </div>

                                <div className="text-sm text-slate-600">
                                    Дата: <span className="font-medium">{fmt(details.createdAt || details.created_at)}</span>
                                </div>

                                <div className="text-sm text-slate-600">
                                    Сумма: <span className="font-semibold">{details.totalAmount ?? details.total_amount ?? "-"}</span>
                                </div>

                                <div className="border border-slate-200 rounded-xl p-3">
                                    <div className="text-sm font-semibold mb-2">Сменить статус</div>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-400"
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value)}
                                        >
                                            <option value="NEW">NEW</option>
                                            <option value="CREATED">CREATED</option>
                                            <option value="PAID">PAID</option>
                                            <option value="DELIVERED">DELIVERED</option>
                                            <option value="CANCELLED">CANCELLED</option>
                                        </select>

                                        <button
                                            onClick={updateStatus}
                                            className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                                        >
                                            Применить
                                        </button>
                                    </div>
                                </div>

                                <details className="text-xs">
                                    <summary className="cursor-pointer text-slate-600">Показать сырой JSON</summary>
                                    <pre className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-3 overflow-auto">
                    {JSON.stringify(details, null, 2)}
                  </pre>
                                </details>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}