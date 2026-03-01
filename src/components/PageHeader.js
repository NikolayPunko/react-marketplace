import React from "react";
import { Link } from "react-router-dom";
import { getEmail, getRoles, logout } from "../auth/auth";

function RoleBadge({ children }) {
    return (
        <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-medium">
      {children}
    </span>
    );
}

function NavBtn({ to, children }) {
    return (
        <Link
            to={to}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 transition"
        >
            {children}
        </Link>
    );
}

export default function PageHeader({ title, subtitle }) {
    const email = getEmail();
    const roles = getRoles();

    const isAdmin = roles.includes("ADMIN");
    const isBuyer = roles.includes("BUYER");
    const isSeller = roles.includes("SELLER");

    return (
        <div className="bg-white rounded-2xl shadow p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-semibold">{title}</h1>
                    <Link to="/" className="text-sm text-slate-600 hover:underline">
                        На главную
                    </Link>
                </div>

                {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}

                {email && (
                    <div className="mt-2 text-sm text-slate-600 flex flex-wrap items-center gap-2">
            <span>
              Пользователь: <span className="font-medium">{email}</span>
            </span>
                        {roles.map((r) => (
                            <RoleBadge key={r}>{r}</RoleBadge>
                        ))}
                    </div>
                )}
            </div>

            {/* Кнопки справа — показываем только по ролям */}
            <div className="flex flex-wrap items-center gap-2">
                <NavBtn to="/products">Каталог</NavBtn>

                {isBuyer && <NavBtn to="/my-orders">Мои заказы</NavBtn>}

                {isSeller && <NavBtn to="/seller-orders">Заказы продавца</NavBtn>}

                {isAdmin && <NavBtn to="/admin">Admin</NavBtn>}

                {isAdmin && <NavBtn to="/admin-orders">Все заказы</NavBtn>}

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
        </div>
    );
}