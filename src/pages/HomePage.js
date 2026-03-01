import React from "react";
import { Link } from "react-router-dom";
import { getEmail, getRoles, logout } from "../auth/auth";

function Badge({ children }) {
    return (
        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium">
      {children}
    </span>
    );
}

function CardLink({ to, title, desc }) {
    return (
        <Link
            to={to}
            className="bg-white rounded-2xl shadow p-5 hover:shadow-md transition border border-transparent hover:border-slate-200"
        >
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-sm text-slate-500 mt-1">{desc}</div>
        </Link>
    );
}

export default function HomePage() {
    const email = getEmail();
    const roles = getRoles();

    const isAdmin = roles.includes("ADMIN");
    const isSeller = roles.includes("SELLER");
    const isBuyer = roles.includes("BUYER");

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto p-4">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow p-6 flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold">Marketplace</h1>
                        <div className="mt-2 text-sm text-slate-600">
                            <div>
                                Вы вошли как: <span className="font-medium">{email}</span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                                {roles.length ? roles.map((r) => <Badge key={r}>{r}</Badge>) : <Badge>-</Badge>}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            logout();
                            window.location.href = "/login";
                        }}
                        className="rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
                    >
                        Выйти
                    </button>
                </div>

                {/* Cards */}
                <div className="mt-6 grid md:grid-cols-3 gap-4">
                    <CardLink
                        to="/products"
                        title="Каталог"
                        desc="Просмотр товаров, корзина (BUYER), управление (SELLER)"
                    />

                    {isBuyer && (
                        <CardLink
                            to="/my-orders"
                            title="Мои заказы"
                            desc="История заказов и детали"
                        />
                    )}

                    {isSeller && (
                        <CardLink
                            to="/seller-orders"
                            title="Заказы продавца"
                            desc="Заказы, где есть ваши товары"
                        />
                    )}

                    {isAdmin && (
                        <CardLink
                            to="/admin"
                            title="Админ-панель"
                            desc="Отчёты, экспорт, логи, backup/restore, SQL"
                        />
                    )}

                    {isAdmin && (
                        <CardLink
                            to="/admin-orders"
                            title="Все заказы"
                            desc="Просмотр всех заказов и смена статуса"
                        />
                    )}
                </div>

                {/* Hint */}
                <div className="mt-6 text-xs text-slate-500">
                    Если кнопка недоступна — значит у текущей роли нет доступа к соответствующему разделу.
                </div>
            </div>
        </div>
    );
}