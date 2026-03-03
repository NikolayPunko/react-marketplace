import React, { useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { getRoles } from "../auth/auth";
import PageHeader from "../components/PageHeader";

function cn(...arr) {
    return arr.filter(Boolean).join(" ");
}

const CART_KEY = "cart";

function readCart() {
    try {
        const raw = localStorage.getItem(CART_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function writeCart(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function ProductsPage() {
    const roles = getRoles();
    const isBuyer = roles.includes("BUYER");
    const isSeller = roles.includes("SELLER");
    const isAdmin = roles.includes("ADMIN");

    const [tab, setTab] = useState(isSeller ? "my" : "all"); // seller сразу видит "мои"
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [products, setProducts] = useState([]);
    const [myProducts, setMyProducts] = useState([]);

    const [categories, setCategories] = useState([]);

    const [search, setSearch] = useState("");

    const [cart, setCart] = useState(readCart());
    const [orderMsg, setOrderMsg] = useState("");

    // форма создания товара (seller)
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState("");
    const [newStock, setNewStock] = useState("");
    const [newCategoryId, setNewCategoryId] = useState("");

    // --- ОЦЕНКИ (BUYER) ---
    const [ratingByProduct, setRatingByProduct] = useState({}); // { [productId]: 1..5 }
    const [ratingMsg, setRatingMsg] = useState("");

    const [reviewsOpen, setReviewsOpen] = useState({}); // { [productId]: true/false }
    const [reviewsByProduct, setReviewsByProduct] = useState({}); // { [productId]: [...] }
    const [reviewsLoading, setReviewsLoading] = useState({}); // { [productId]: true/false }
    const [deliveryAddress, setDeliveryAddress] = useState("");

    // ---------- загрузка ----------
    useEffect(() => {
        loadCategories();
        loadAllProducts();
        if (isSeller) loadMyProducts();
        // eslint-disable-next-line
    }, []);

    async function loadCategories() {
        try {
            const res = await api.get("/api/categories");
            setCategories(res.data || []);
            if (!newCategoryId && res.data?.length) {
                setNewCategoryId(String(res.data[0].id));
            }
        } catch (e) {
            // каталог без категорий жить может
        }
    }

    async function loadAllProducts() {
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/api/products");
            setProducts(res.data || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось загрузить товары");
        } finally {
            setLoading(false);
        }
    }

    async function loadMyProducts() {
        if (!isSeller) return;
        setLoading(true);
        setError("");
        try {
            const res = await api.get("/api/products/my");
            setMyProducts(res.data || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось загрузить ваши товары");
        } finally {
            setLoading(false);
        }
    }

    async function toggleReviews(productId) {
        setError("");
        setOrderMsg("");
        setRatingMsg("");

        const isOpen = !!reviewsOpen[productId];

        // закрываем
        if (isOpen) {
            setReviewsOpen((prev) => ({ ...prev, [productId]: false }));
            return;
        }

        // открываем и грузим
        setReviewsOpen((prev) => ({ ...prev, [productId]: true }));
        setReviewsLoading((prev) => ({ ...prev, [productId]: true }));

        try {
            const res = await api.get(`/api/reviews/product/${productId}`);
            setReviewsByProduct((prev) => ({ ...prev, [productId]: res.data || [] }));
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось загрузить оценки товара");
        } finally {
            setReviewsLoading((prev) => ({ ...prev, [productId]: false }));
        }
    }

    // ---------- фильтр ----------
    const visibleProducts = useMemo(() => {
        const list = tab === "my" ? myProducts : products;
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((p) => (p.name || "").toLowerCase().includes(q));
    }, [tab, products, myProducts, search]);

    // ---------- корзина ----------
    function addToCart(p) {
        setOrderMsg("");
        setCart((prev) => {
            const copy = [...prev];
            const idx = copy.findIndex((x) => x.productId === p.id);
            if (idx >= 0) copy[idx].quantity += 1;
            else copy.push({ productId: p.id, name: p.name, price: p.price, quantity: 1 });
            writeCart(copy);
            return copy;
        });
    }

    function incItem(productId) {
        setCart((prev) => {
            const copy = prev.map((x) =>
                x.productId === productId ? { ...x, quantity: x.quantity + 1 } : x
            );
            writeCart(copy);
            return copy;
        });
    }

    function decItem(productId) {
        setCart((prev) => {
            const copy = prev
                .map((x) => (x.productId === productId ? { ...x, quantity: x.quantity - 1 } : x))
                .filter((x) => x.quantity > 0);
            writeCart(copy);
            return copy;
        });
    }

    function clearCart() {
        setCart([]);
        writeCart([]);
    }

    const cartTotal = useMemo(() => {
        return cart.reduce((s, x) => s + Number(x.price || 0) * x.quantity, 0);
    }, [cart]);

    async function createOrder() {
        setOrderMsg("");
        setError("");
        setRatingMsg("");

        if (!cart.length) {
            setOrderMsg("Корзина пустая");
            return;
        }

        try {
            const payload = {
                items: cart.map((x) => ({
                    productId: x.productId,
                    quantity: x.quantity,
                })),
                address: deliveryAddress,
            };

            const res = await api.post("/api/orders", payload);
            clearCart();
            setOrderMsg("Заказ создан успешно");
            return res.data;
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось создать заказ");
        }
    }

    // ---------- BUYER: оценить товар ----------
    async function submitRating(productId) {
        setError("");
        setOrderMsg("");
        setRatingMsg("");

        const rating = Number(ratingByProduct[productId] || 5);

        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
            setError("Оценка должна быть от 1 до 5");
            return;
        }

        try {
            await api.post("/api/reviews", { productId, rating });
            setRatingMsg("Оценка сохранена. Рейтинг продавца обновился автоматически.");

            // обновим список товаров, чтобы подтянуть sellers.rating
            await loadAllProducts();
            if (isSeller) await loadMyProducts();
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось сохранить оценку");
        }
    }

    // ---------- seller: создать товар ----------
    async function createProduct() {
        setError("");
        setOrderMsg("");
        setRatingMsg("");

        const name = newName.trim();
        const price = Number(newPrice);
        const stock = Number(newStock);
        const categoryId = Number(newCategoryId);

        if (!name) return setError("Название товара обязательно");
        if (!Number.isFinite(price) || price <= 0) return setError("Цена должна быть > 0");
        if (!Number.isFinite(stock) || stock < 0) return setError("Остаток должен быть >= 0");
        if (!Number.isFinite(categoryId)) return setError("Выберите категорию");

        try {
            await api.post("/api/products", {
                name,
                price,
                stockQuantity: stock,
                categoryId,
            });

            setNewName("");
            setNewPrice("");
            setNewStock("");

            await loadAllProducts();
            await loadMyProducts();

            setOrderMsg("Товар создан");
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось создать товар");
        }
    }

    // ---------- seller/admin: удалить товар ----------
    async function deleteProduct(productId) {
        setError("");
        setOrderMsg("");
        setRatingMsg("");

        try {
            await api.delete(`/api/products/${productId}`);
            await loadAllProducts();
            if (isSeller) await loadMyProducts();
            setOrderMsg("Товар удалён");
        } catch (e) {
            setError(e?.response?.data?.message || "Не удалось удалить товар");
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                <PageHeader title="Товары" subtitle="Каталог, корзина (BUYER), управление товарами (SELLER)" />

                {/* Tabs + Search */}
                <div className="bg-white rounded-2xl shadow p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTab("all")}
                            className={cn(
                                "rounded-xl px-4 py-2 text-sm border transition",
                                tab === "all"
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white border-slate-200 hover:bg-slate-100"
                            )}
                        >
                            Все товары
                        </button>

                        {isSeller && (
                            <button
                                onClick={() => setTab("my")}
                                className={cn(
                                    "rounded-xl px-4 py-2 text-sm border transition",
                                    tab === "my"
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white border-slate-200 hover:bg-slate-100"
                                )}
                            >
                                Мои товары
                            </button>
                        )}
                    </div>

                    <div className="flex-1" />

                    <input
                        className="w-full md:w-80 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="Поиск по названию..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Messages */}
                {loading && (
                    <div className="bg-white rounded-2xl shadow p-4 text-slate-600">Загрузка...</div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">{error}</div>
                )}

                {orderMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
                        {orderMsg}
                    </div>
                )}

                {ratingMsg && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800">
                        {ratingMsg}
                    </div>
                )}

                <div className="grid lg:grid-cols-3 gap-4">
                    {/* Left: Products list */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold">{tab === "my" ? "Мои товары" : "Каталог"}</h2>
                            <button
                                onClick={() => {
                                    loadAllProducts();
                                    if (isSeller) loadMyProducts();
                                }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                            >
                                Обновить
                            </button>
                        </div>

                        {!visibleProducts.length ? (
                            <div className="text-slate-500 text-sm">Нет товаров</div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {visibleProducts.map((p) => {
                                    const sellerName = p?.seller?.storeName || p?.seller?.store_name || "—";
                                    const sellerRating = p?.seller?.rating ?? "—";

                                    return (
                                        <div key={p.id} className="py-3 flex items-start gap-3">
                                            <div className="flex-1">
                                                <div className="font-medium">{p.name}</div>

                                                <div className="text-sm text-slate-500">
                                                    Цена: <span className="font-medium text-slate-700">{p.price}</span> • Остаток:{" "}
                                                    <span className="font-medium text-slate-700">
                            {p.stockQuantity ?? p.stock_quantity}
                          </span>
                                                    {p.categoryName ? (
                                                        <>
                                                            {" "}
                                                            • Категория:{" "}
                                                            <span className="font-medium text-slate-700">{p.categoryName}</span>
                                                        </>
                                                    ) : null}
                                                </div>

                                                {tab === "all" && (
                                                    <div className="text-sm text-slate-500 mt-1">
                                                        Продавец: <span className="font-medium text-slate-700">{sellerName}</span> • Рейтинг:{" "}
                                                        <span className="font-semibold text-slate-800">{sellerRating}</span>
                                                    </div>
                                                )}

                                                {/* BUYER: оценка товара (минимально) */}
                                                {isBuyer && tab === "all" && (
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <select
                                                            value={ratingByProduct[p.id] || 5}
                                                            onChange={(e) =>
                                                                setRatingByProduct((prev) => ({ ...prev, [p.id]: Number(e.target.value) }))
                                                            }
                                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-400"
                                                        >
                                                            <option value={1}>1</option>
                                                            <option value={2}>2</option>
                                                            <option value={3}>3</option>
                                                            <option value={4}>4</option>
                                                            <option value={5}>5</option>
                                                        </select>

                                                        <button
                                                            onClick={() => submitRating(p.id)}
                                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                                                        >
                                                            Оценить
                                                        </button>

                                                        {/* Кнопка показать оценки */}
                                                        {tab === "all" && (
                                                            <div className="mt-2">
                                                                <button
                                                                    onClick={() => toggleReviews(p.id)}
                                                                    className="text-sm text-slate-600 hover:underline"
                                                                >
                                                                    {reviewsOpen[p.id] ? "Скрыть оценки" : "Показать оценки"}
                                                                </button>

                                                                {reviewsOpen[p.id] && (
                                                                    <div className="mt-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
                                                                        {reviewsLoading[p.id] ? (
                                                                            <div className="text-sm text-slate-600">Загрузка...</div>
                                                                        ) : (reviewsByProduct[p.id] || []).length === 0 ? (
                                                                            <div className="text-sm text-slate-600">Оценок пока нет</div>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                {(reviewsByProduct[p.id] || []).map((r) => (
                                                                                    <div key={r.id} className="text-sm text-slate-700">
                                                                                        <span className="font-medium">{r.email}</span> • оценка:{" "}
                                                                                        <span className="font-semibold">{r.rating}</span>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}

                                                    </div>
                                                )}
                                            </div>

                                            {/* BUYER */}
                                            {isBuyer && tab === "all" && (
                                                <button
                                                    onClick={() => addToCart(p)}
                                                    className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm hover:bg-slate-800 transition"
                                                >
                                                    В корзину
                                                </button>
                                            )}

                                            {/* SELLER/ADMIN delete */}
                                            {(isAdmin || (isSeller && tab === "my")) && (
                                                <button
                                                    onClick={() => deleteProduct(p.id)}
                                                    className="rounded-xl border border-red-200 text-red-700 px-3 py-2 text-sm hover:bg-red-50 transition"
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Right: Cart + Seller create */}
                    <div className="space-y-4">
                        {/* Cart for BUYER */}
                        {isBuyer && (
                            <div className="bg-white rounded-2xl shadow p-4">
                                <h2 className="text-lg font-semibold">Корзина</h2>

                                {!cart.length ? (
                                    <div className="text-slate-500 text-sm mt-2">Корзина пустая</div>
                                ) : (
                                    <div className="mt-3 space-y-3">
                                        {cart.map((x) => (
                                            <div key={x.productId} className="border border-slate-200 rounded-xl p-3">
                                                <div className="font-medium">{x.name}</div>
                                                <div className="text-sm text-slate-500 mt-1">
                                                    Цена: {x.price} • Сумма: {Number(x.price || 0) * x.quantity}
                                                </div>

                                                <div className="mt-2 flex items-center gap-2">
                                                    <button
                                                        onClick={() => decItem(x.productId)}
                                                        className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 transition"
                                                    >
                                                        −
                                                    </button>
                                                    <div className="min-w-[40px] text-center font-medium">{x.quantity}</div>
                                                    <button
                                                        onClick={() => incItem(x.productId)}
                                                        className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 transition"
                                                    >
                                                        +
                                                    </button>

                                                    <div className="flex-1" />

                                                    <button
                                                        onClick={() => {
                                                            setCart((prev) => {
                                                                const copy = prev.filter((i) => i.productId !== x.productId);
                                                                writeCart(copy);
                                                                return copy;
                                                            });
                                                        }}
                                                        className="text-sm text-red-600 hover:underline"
                                                    >
                                                        Удалить
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="flex items-center justify-between pt-2">
                                            <div className="text-sm text-slate-600">Итого:</div>
                                            <div className="text-lg font-semibold">{cartTotal}</div>
                                        </div>

                                        <div className="flex gap-2">
                                            <div>
                                                <label className="text-sm text-slate-600">Адрес доставки</label>
                                                <input
                                                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                                    value={deliveryAddress}
                                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                                    placeholder="Например: Moscow, Tverskaya 10"
                                                />
                                            </div>
                                            <button
                                                onClick={createOrder}
                                                className="flex-1 rounded-xl bg-slate-900 text-white py-2 text-sm hover:bg-slate-800 transition"
                                            >
                                                Оформить заказ
                                            </button>
                                            <button
                                                onClick={clearCart}
                                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 transition"
                                            >
                                                Очистить
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Create product for SELLER */}
                        {isSeller && (
                            <div className="bg-white rounded-2xl shadow p-4">
                                <h2 className="text-lg font-semibold">Добавить товар</h2>

                                <div className="mt-3 space-y-3">
                                    <div>
                                        <label className="text-sm text-slate-600">Название</label>
                                        <input
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="Например: USB Cable"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-slate-600">Цена</label>
                                            <input
                                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                                value={newPrice}
                                                onChange={(e) => setNewPrice(e.target.value)}
                                                placeholder="100"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm text-slate-600">Остаток</label>
                                            <input
                                                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                                value={newStock}
                                                onChange={(e) => setNewStock(e.target.value)}
                                                placeholder="10"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm text-slate-600">Категория</label>
                                        <select
                                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-slate-400"
                                            value={newCategoryId}
                                            onChange={(e) => setNewCategoryId(e.target.value)}
                                        >
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        {!categories.length && (
                                            <div className="text-xs text-slate-500 mt-1">Категории не загрузились — проверь /api/categories</div>
                                        )}
                                    </div>

                                    <button
                                        onClick={createProduct}
                                        className="w-full rounded-xl bg-slate-900 text-white py-2 text-sm hover:bg-slate-800 transition"
                                    >
                                        Создать
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* подсказка для ролей */}
                        {!isBuyer && !isSeller && (
                            <div className="bg-white rounded-2xl shadow p-4 text-sm text-slate-600">
                                Эта страница работает лучше, если зайти как BUYER или SELLER.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}