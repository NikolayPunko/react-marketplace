import React, { useState } from "react";
import api from "../api/api";
import { saveAuth } from "../auth/auth";

export default function LoginPage() {
    const [email, setEmail] = useState("admin@test.com");
    const [password, setPassword] = useState("1111");
    const [error, setError] = useState("");

    const onLogin = async (e) => {
        e.preventDefault();
        setError("");

        try {
            const res = await api.post("/api/auth/login", { email, password });
            const token = res.data.token;

            const me = await api.get("/api/auth/me", {
                headers: { Authorization: `Bearer ${token}` },
            });

            saveAuth({
                token,
                roles: me.data.roles,
                email: me.data.email,
            });

            window.location.href = "/";
        } catch (err) {
            setError(err?.response?.data?.message || "Login failed");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
                <h1 className="text-2xl font-semibold mb-1">Вход</h1>
                <p className="text-sm text-slate-500 mb-6">
                    Введите email и пароль для входа в систему
                </p>

                <form onSubmit={onLogin} className="space-y-4">
                    <div>
                        <label className="text-sm text-slate-600">Email</label>
                        <input
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm text-slate-600">Пароль</label>
                        <input
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="1111"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-slate-900 text-white py-2 hover:bg-slate-800 transition"
                    >
                        Войти
                    </button>
                </form>

                <div className="mt-6 text-xs text-slate-500 leading-relaxed">
                    Тестовые аккаунты:
                    <div className="mt-1">
                        admin@test.com / seller@test.com / buyer@test.com
                    </div>
                    <div>Пароль: 1111</div>
                </div>
            </div>
        </div>
    );
}