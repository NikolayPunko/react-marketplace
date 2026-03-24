import React, { useState } from "react";
import api from "../api/api";
import { saveAuth } from "../auth/auth";

export default function LoginPage() {
    // Состояние для переключения между формами
    const [isLogin, setIsLogin] = useState(true);

    // Общие поля
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Поле для регистрации
    const [isSeller, setIsSeller] = useState(false);

    // Обработчик входа
    const onLogin = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

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
            setError(err?.response?.data?.message || "Ошибка входа");
        }
    };

    // Обработчик регистрации
    const onRegister = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email || !password) {
            setError("Заполните email и пароль");
            return;
        }

        if (password.length < 4) {
            setError("Пароль должен содержать минимум 4 символа");
            return;
        }

        try {
            await api.post("/api/auth/register", {
                email,
                password,
                isSeller: isSeller
            });

            setSuccess("Регистрация успешна! Теперь вы можете войти.");
            setEmail("");
            setPassword("");
            setIsSeller(false);

            // Автоматически переключаемся на форму входа через 2 секунды
            setTimeout(() => {
                setIsLogin(true);
                setSuccess("");
            }, 2000);
        } catch (err) {
            setError(err?.response?.data?.message || "Ошибка регистрации");
        }
    };

    // Переключение между формами
    const toggleForm = () => {
        setIsLogin(!isLogin);
        setError("");
        setSuccess("");
        setEmail("");
        setPassword("");
        setIsSeller(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
                <h1 className="text-2xl font-semibold mb-1">
                    {isLogin ? "Вход" : "Регистрация"}
                </h1>
                <p className="text-sm text-slate-500 mb-6">
                    {isLogin
                        ? "Введите email и пароль для входа в систему"
                        : "Создайте новый аккаунт для доступа к платформе"}
                </p>

                {isLogin ? (
                    // Форма входа
                    <form onSubmit={onLogin} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-600">Email</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm text-slate-600">Пароль</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••"
                                required
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
                ) : (
                    // Форма регистрации
                    <form onSubmit={onRegister} className="space-y-4">
                        <div>
                            <label className="text-sm text-slate-600">Email</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm text-slate-600">Пароль</label>
                            <input
                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="минимум 4 символа"
                                required
                                minLength={4}
                            />
                        </div>

                        {/* Чекбокс для выбора роли */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isSeller"
                                checked={isSeller}
                                onChange={(e) => setIsSeller(e.target.checked)}
                                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                            />
                            <label htmlFor="isSeller" className="text-sm text-slate-600">
                                Зарегистрироваться как продавец
                            </label>
                        </div>

                        <div className="text-xs text-slate-500">
                            {isSeller
                                ? "✓ Как продавец вы сможете добавлять и управлять товарами"
                                : "✓ Как покупатель вы сможете покупать товары и оставлять отзывы"}
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full rounded-xl bg-slate-900 text-white py-2 hover:bg-slate-800 transition"
                        >
                            Зарегистрироваться
                        </button>
                    </form>
                )}

                {/* Кнопка переключения между формами */}
                <div className="mt-6 text-center">
                    <button
                        onClick={toggleForm}
                        className="text-sm text-slate-600 hover:text-slate-900 transition"
                    >
                        {isLogin
                            ? "Нет аккаунта? Зарегистрироваться"
                            : "Уже есть аккаунт? Войти"}
                    </button>
                </div>

                {/* Тестовые данные (только для входа) */}
                {isLogin && (
                    <div className="mt-6 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
                        <div className="font-medium mb-1">Тестовые аккаунты:</div>
                        <div>admin@test.com / seller@test.com / buyer@test.com</div>
                        <div>Пароль: 1111</div>
                    </div>
                )}
            </div>
        </div>
    );
}