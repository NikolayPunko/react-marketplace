import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import RequireAuth from "./auth/RequireAuth";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import AdminPanelPage from "./pages/AdminPanelPage";

import SellerOrdersPage from "./pages/SellerOrdersPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                    path="/"
                    element={
                        <RequireAuth>
                            <HomePage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/products"
                    element={
                        <RequireAuth>
                            <ProductsPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/my-orders"
                    element={
                        <RequireAuth roles={["BUYER"]}>
                            <MyOrdersPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/seller-orders"
                    element={
                        <RequireAuth roles={["SELLER"]}>
                            <SellerOrdersPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/admin"
                    element={
                        <RequireAuth roles={["ADMIN"]}>
                            <AdminPanelPage />
                        </RequireAuth>
                    }
                />

                <Route
                    path="/admin-orders"
                    element={
                        <RequireAuth roles={["ADMIN"]}>
                            <AdminOrdersPage />
                        </RequireAuth>
                    }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}