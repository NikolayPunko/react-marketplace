import React from "react";
import { Navigate } from "react-router-dom";
import { getRoles, isLoggedIn } from "./auth";

export default function RequireAuth({ roles = [], children }) {
    if (!isLoggedIn()) return <Navigate to="/login" replace />;

    const userRoles = getRoles();

    // если роли не требуются — просто пропускаем
    if (!roles.length) return children;

    // если требуется хотя бы одна роль
    const ok = roles.some((r) => userRoles.includes(r));
    if (!ok) return <Navigate to="/" replace />;

    return children;
}