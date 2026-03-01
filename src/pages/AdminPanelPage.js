import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import PageHeader from "../components/PageHeader";

function cn(...arr) {
    return arr.filter(Boolean).join(" ");
}

function fmtDateTime(s) {
    if (!s) return "-";
    return String(s).replace("T", " ").replace("Z", "");
}

function DataTable({ data }) {
    const headers = useMemo(() => {
        if (!data?.length) return [];
        return Object.keys(data[0]);
    }, [data]);

    if (!data?.length) {
        return <div className="text-sm text-slate-500">Нет данных</div>;
    }

    return (
        <div className="overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                <tr>
                    {headers.map((h) => (
                        <th key={h} className="text-left font-semibold text-slate-700 px-3 py-2 whitespace-nowrap">
                            {h}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, idx) => (
                    <tr key={idx} className="border-t border-slate-200">
                        {headers.map((h) => (
                            <td key={h} className="px-3 py-2 whitespace-nowrap">
                                {row[h] === null || row[h] === undefined ? "" : String(row[h])}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminPanelPage() {
    const [tab, setTab] = useState("reports");

    // ---------- REPORTS ----------
    const reportDefs = [
        { key: "top-products", name: "Топ товаров", paramsHint: "limit" },
        { key: "top-sellers", name: "Топ продавцов", paramsHint: "start,end" },
        { key: "avg-check-by-month", name: "Средний чек по месяцам", paramsHint: "" },
        { key: "category-revenue-share", name: "Доля выручки по категориям", paramsHint: "" },
        { key: "users-without-orders", name: "Пользователи без заказов", paramsHint: "" },
        { key: "payments-by-status", name: "Платежи по статусам", paramsHint: "" },
        { key: "low-stock", name: "Товары с низким остатком", paramsHint: "threshold" },
        { key: "logins-by-day", name: "Логины по дням", paramsHint: "start,end" },
        { key: "audit-summary", name: "Сводка audit", paramsHint: "start,end" },
    ];

    const [reportKey, setReportKey] = useState("top-products");
    const [reportParams, setReportParams] = useState({
        limit: "5",
        threshold: "5",
        start: "2026-02-01",
        end: "2026-03-01",
        orderId: "1"
    });

    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState("");
    const [reportData, setReportData] = useState([]);

    async function downloadReport(ext) {
        setReportError("");

        try {
            // путь экспорта на бэке
            let path = `/api/reports/export/${reportKey}.${ext}`;

            // параметры такие же как в runReport
            const params = {};
            if (reportKey === "top-products") params.limit = reportParams.limit;
            if (reportKey === "low-stock") params.threshold = reportParams.threshold;
            if (["top-sellers", "logins-by-day", "audit-summary"].includes(reportKey)) {
                params.start = reportParams.start;
                params.end = reportParams.end;
            }

            const res = await api.get(path, {
                params,
                responseType: "blob",
            });

            // пробуем вытащить filename из Content-Disposition
            const cd = res.headers["content-disposition"] || "";
            let filename = `${reportKey}.${ext}`;
            const m = cd.match(/filename="([^"]+)"/);
            if (m && m[1]) filename = m[1];

            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            setReportError(e?.response?.data?.message || `Не удалось скачать ${ext.toUpperCase()}`);
        }
    }
    async function runReport() {
        setReportLoading(true);
        setReportError("");
        setReportData([]);

        try {
            let url = `/api/reports/${reportKey}`;

            // особый отчёт order-details/{id} если он у тебя есть
            if (reportKey === "order-details") {
                url = `/api/reports/order-details/${reportParams.orderId}`;
            }

            const params = {};
            if (reportKey === "top-products") params.limit = reportParams.limit;
            if (reportKey === "low-stock") params.threshold = reportParams.threshold;
            if (["top-sellers", "logins-by-day", "audit-summary"].includes(reportKey)) {
                params.start = reportParams.start;
                params.end = reportParams.end;
            }

            const res = await api.get(url, { params });
            setReportData(res.data || []);
        } catch (e) {
            setReportError(e?.response?.data?.message || "Ошибка выполнения отчёта");
        } finally {
            setReportLoading(false);
        }
    }

    // ---------- EXPORT ----------
    function exportUrl(ext) {
        // пример: /api/reports/export/top-products.xlsx?limit=5
        let file = `${reportKey}.${ext}`;
        if (reportKey === "order-details") file = `order-details.${ext}`; // если будет нужно

        const base = `http://localhost:8080/api/reports/export/${file}`;
        const q = new URLSearchParams();

        if (reportKey === "top-products") q.set("limit", reportParams.limit);
        if (reportKey === "low-stock") q.set("threshold", reportParams.threshold);
        if (["top-sellers", "logins-by-day", "audit-summary"].includes(reportKey)) {
            q.set("start", reportParams.start);
            q.set("end", reportParams.end);
        }

        const qs = q.toString();
        return qs ? `${base}?${qs}` : base;
    }

    // ---------- LOGS ----------
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState("");
    const [auditRows, setAuditRows] = useState([]);

    const [loginsLoading, setLoginsLoading] = useState(false);
    const [loginsError, setLoginsError] = useState("");
    const [loginsRows, setLoginsRows] = useState([]);

    const [auditFilters, setAuditFilters] = useState({
        start: "",
        end: "",
        tableName: "",
        action: "",
        limit: "200",
    });

    const [loginFilters, setLoginFilters] = useState({
        start: "",
        end: "",
        email: "",
        limit: "200",
    });

    const [auditTableNames, setAuditTableNames] = useState([]);
    const [auditActions, setAuditActions] = useState([]);

    async function loadAuditFiltersLists() {
        try {
            const tn = await api.get("/api/admin/logs/audit/table-names");
            const ac = await api.get("/api/admin/logs/audit/actions");
            setAuditTableNames(tn.data || []);
            setAuditActions(ac.data || []);
        } catch {
            // не критично
        }
    }

    async function loadAudit() {
        setAuditLoading(true);
        setAuditError("");
        setAuditRows([]);
        try {
            const params = {
                limit: auditFilters.limit || 200,
            };
            if (auditFilters.start) params.start = auditFilters.start;
            if (auditFilters.end) params.end = auditFilters.end;
            if (auditFilters.tableName) params.tableName = auditFilters.tableName;
            if (auditFilters.action) params.action = auditFilters.action;

            const res = await api.get("/api/admin/logs/audit", { params });
            setAuditRows(res.data || []);
        } catch (e) {
            setAuditError(e?.response?.data?.message || "Не удалось загрузить audit log");
        } finally {
            setAuditLoading(false);
        }
    }

    async function loadLogins() {
        setLoginsLoading(true);
        setLoginsError("");
        setLoginsRows([]);
        try {
            const params = {
                limit: loginFilters.limit || 200,
            };
            if (loginFilters.start) params.start = loginFilters.start;
            if (loginFilters.end) params.end = loginFilters.end;
            if (loginFilters.email) params.email = loginFilters.email;

            const res = await api.get("/api/admin/logs/logins", { params });
            setLoginsRows(res.data || []);
        } catch (e) {
            setLoginsError(e?.response?.data?.message || "Не удалось загрузить login history");
        } finally {
            setLoginsLoading(false);
        }
    }

    // ---------- BACKUP/RESTORE ----------
    const [backupMsg, setBackupMsg] = useState("");
    const [backupErr, setBackupErr] = useState("");

    async function createBackup() {
        setBackupMsg("");
        setBackupErr("");
        try {
            const res = await api.post("/api/admin/backup/create", null, {
                responseType: "blob",
            });

            const cd = res.headers["content-disposition"] || "";
            let filename = "backup.sql";
            const m = cd.match(/filename="([^"]+)"/);
            if (m && m[1]) filename = m[1];

            const blob = new Blob([res.data], { type: "application/sql" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setBackupMsg("Бэкап скачан");
        } catch (e) {
            setBackupErr(e?.response?.data?.message || "Не удалось создать бэкап");
        }
    }

    async function restoreBackup(file) {
        setBackupMsg("");
        setBackupErr("");
        if (!file) return;

        try {
            const form = new FormData();
            form.append("file", file);

            await api.post("/api/admin/backup/restore", form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setBackupMsg("Восстановление выполнено");
        } catch (e) {
            setBackupErr(e?.response?.data?.message || "Не удалось восстановить базу");
        }
    }

    // ---------- ADMIN SQL ----------
    const [sql, setSql] = useState("SELECT id, email, created_at FROM users ORDER BY id;");
    const [sqlLoading, setSqlLoading] = useState(false);
    const [sqlError, setSqlError] = useState("");
    const [sqlData, setSqlData] = useState([]);

    async function runSql() {
        setSqlLoading(true);
        setSqlError("");
        setSqlData([]);
        try {
            const res = await api.post("/api/admin/query", { sql });
            setSqlData(res.data || []);
        } catch (e) {
            setSqlError(e?.response?.data?.message || "Ошибка SQL запроса");
        } finally {
            setSqlLoading(false);
        }
    }

    // при первом заходе на вкладку logs — подгрузим справочники
    useEffect(() => {
        if (tab === "logs") {
            loadAuditFiltersLists();
        }
        // eslint-disable-next-line
    }, [tab]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                <PageHeader
                    title="Админ-панель"
                    subtitle="Отчёты, экспорт, логи, резервное копирование, SQL запросы"
                />

                {/* Tabs */}
                <div className="bg-white rounded-2xl shadow p-2 flex flex-wrap gap-2">
                    <button
                        onClick={() => setTab("reports")}
                        className={cn(
                            "rounded-xl px-4 py-2 text-sm border transition",
                            tab === "reports"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        Отчёты
                    </button>

                    <button
                        onClick={() => setTab("logs")}
                        className={cn(
                            "rounded-xl px-4 py-2 text-sm border transition",
                            tab === "logs"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        Логи
                    </button>

                    <button
                        onClick={() => setTab("backup")}
                        className={cn(
                            "rounded-xl px-4 py-2 text-sm border transition",
                            tab === "backup"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        Backup / Restore
                    </button>

                    <button
                        onClick={() => setTab("sql")}
                        className={cn(
                            "rounded-xl px-4 py-2 text-sm border transition",
                            tab === "sql"
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white border-slate-200 hover:bg-slate-100"
                        )}
                    >
                        SQL Query
                    </button>
                </div>

                {/* -------- REPORTS -------- */}
                {tab === "reports" && (
                    <div className="bg-white rounded-2xl shadow p-4 space-y-4">
                        <div className="grid md:grid-cols-3 gap-3">
                            <div className="md:col-span-2">
                                <label className="text-sm text-slate-600">Отчёт</label>
                                <select
                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-400"
                                    value={reportKey}
                                    onChange={(e) => setReportKey(e.target.value)}
                                >
                                    {reportDefs.map((r) => (
                                        <option key={r.key} value={r.key}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-slate-600">Параметры</label>
                                <div className="mt-1 space-y-2">
                                    {reportKey === "top-products" && (
                                        <input
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                            placeholder="limit"
                                            value={reportParams.limit}
                                            onChange={(e) => setReportParams((p) => ({ ...p, limit: e.target.value }))}
                                        />
                                    )}

                                    {reportKey === "low-stock" && (
                                        <input
                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                            placeholder="threshold"
                                            value={reportParams.threshold}
                                            onChange={(e) => setReportParams((p) => ({ ...p, threshold: e.target.value }))}
                                        />
                                    )}

                                    {["top-sellers", "logins-by-day", "audit-summary"].includes(reportKey) && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                                placeholder="start YYYY-MM-DD"
                                                value={reportParams.start}
                                                onChange={(e) => setReportParams((p) => ({ ...p, start: e.target.value }))}
                                            />
                                            <input
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                                placeholder="end YYYY-MM-DD"
                                                value={reportParams.end}
                                                onChange={(e) => setReportParams((p) => ({ ...p, end: e.target.value }))}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={runReport}
                                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                            >
                                Выполнить
                            </button>

                            <button
                                onClick={() => downloadReport("csv")}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 transition"
                            >
                                Скачать CSV
                            </button>

                            <button
                                onClick={() => downloadReport("xlsx")}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 transition"
                            >
                                Скачать XLSX
                            </button>

                            <button
                                onClick={() => downloadReport("pdf")}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 transition"
                            >
                                Скачать PDF
                            </button>
                        </div>

                        {reportLoading && <div className="text-sm text-slate-600">Загрузка...</div>}
                        {reportError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                {reportError}
                            </div>
                        )}

                        <DataTable data={reportData} />
                    </div>
                )}

                {/* -------- LOGS -------- */}
                {tab === "logs" && (
                    <div className="grid lg:grid-cols-2 gap-4">
                        {/* audit */}
                        <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Audit log</h2>
                                <button
                                    onClick={loadAudit}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                                >
                                    Загрузить
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-2">
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="start YYYY-MM-DD"
                                    value={auditFilters.start}
                                    onChange={(e) => setAuditFilters((p) => ({ ...p, start: e.target.value }))}
                                />
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="end YYYY-MM-DD"
                                    value={auditFilters.end}
                                    onChange={(e) => setAuditFilters((p) => ({ ...p, end: e.target.value }))}
                                />
                                <select
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-400"
                                    value={auditFilters.tableName}
                                    onChange={(e) => setAuditFilters((p) => ({ ...p, tableName: e.target.value }))}
                                >
                                    <option value="">table_name (all)</option>
                                    {auditTableNames.map((x, i) => (
                                        <option key={i} value={x.table_name}>
                                            {x.table_name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-400"
                                    value={auditFilters.action}
                                    onChange={(e) => setAuditFilters((p) => ({ ...p, action: e.target.value }))}
                                >
                                    <option value="">action (all)</option>
                                    {auditActions.map((x, i) => (
                                        <option key={i} value={x.action}>
                                            {x.action}
                                        </option>
                                    ))}
                                </select>

                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="limit (max 1000)"
                                    value={auditFilters.limit}
                                    onChange={(e) => setAuditFilters((p) => ({ ...p, limit: e.target.value }))}
                                />
                            </div>

                            {auditLoading && <div className="text-sm text-slate-600">Загрузка...</div>}
                            {auditError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                    {auditError}
                                </div>
                            )}

                            <DataTable
                                data={(auditRows || []).map((r) => ({
                                    ...r,
                                    created_at: r.created_at ? fmtDateTime(r.created_at) : r.created_at,
                                }))}
                            />
                        </div>

                        {/* logins */}
                        <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Login history</h2>
                                <button
                                    onClick={loadLogins}
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                                >
                                    Загрузить
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-2">
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="start YYYY-MM-DD"
                                    value={loginFilters.start}
                                    onChange={(e) => setLoginFilters((p) => ({ ...p, start: e.target.value }))}
                                />
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="end YYYY-MM-DD"
                                    value={loginFilters.end}
                                    onChange={(e) => setLoginFilters((p) => ({ ...p, end: e.target.value }))}
                                />
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 md:col-span-2"
                                    placeholder="email contains..."
                                    value={loginFilters.email}
                                    onChange={(e) => setLoginFilters((p) => ({ ...p, email: e.target.value }))}
                                />
                                <input
                                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                    placeholder="limit (max 1000)"
                                    value={loginFilters.limit}
                                    onChange={(e) => setLoginFilters((p) => ({ ...p, limit: e.target.value }))}
                                />
                            </div>

                            {loginsLoading && <div className="text-sm text-slate-600">Загрузка...</div>}
                            {loginsError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                    {loginsError}
                                </div>
                            )}

                            <DataTable
                                data={(loginsRows || []).map((r) => ({
                                    ...r,
                                    login_time: r.login_time ? fmtDateTime(r.login_time) : r.login_time,
                                }))}
                            />
                        </div>
                    </div>
                )}

                {/* -------- BACKUP -------- */}
                {tab === "backup" && (
                    <div className="bg-white rounded-2xl shadow p-4 space-y-4">
                        <h2 className="text-lg font-semibold">Backup / Restore</h2>

                        <div className="flex flex-wrap gap-2 items-center">
                            <button
                                onClick={createBackup}
                                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                            >
                                Скачать backup (.sql)
                            </button>

                            <label className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 transition cursor-pointer">
                                Восстановить из файла (.sql)
                                <input
                                    type="file"
                                    accept=".sql"
                                    className="hidden"
                                    onChange={(e) => restoreBackup(e.target.files?.[0])}
                                />
                            </label>
                        </div>

                        {backupMsg && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-800 text-sm">
                                {backupMsg}
                            </div>
                        )}

                        {backupErr && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                {backupErr}
                            </div>
                        )}

                        <div className="text-xs text-slate-500">
                            Рекомендация: restore выполнять, когда никто не работает с БД.
                        </div>
                    </div>
                )}

                {/* -------- SQL -------- */}
                {tab === "sql" && (
                    <div className="bg-white rounded-2xl shadow p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">SQL Query (SELECT)</h2>
                            <button
                                onClick={runSql}
                                className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                            >
                                Выполнить
                            </button>
                        </div>

                        <textarea
                            className="w-full h-32 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 font-mono"
                            value={sql}
                            onChange={(e) => setSql(e.target.value)}
                        />

                        {sqlLoading && <div className="text-sm text-slate-600">Загрузка...</div>}
                        {sqlError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                                {sqlError}
                            </div>
                        )}

                        <DataTable data={sqlData} />
                    </div>
                )}
            </div>
        </div>
    );
}