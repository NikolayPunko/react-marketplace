import axios from "axios";
import { getToken, logout } from "../auth/auth";

const api = axios.create({
    baseURL: "http://localhost:8080",
});

api.interceptors.request.use((config) => {
    const token = getToken();

    config.headers = config.headers || {};

    if (token) config.headers.Authorization = `Bearer ${token}`;

    // важно: чтобы Spring точно понял JSON
    if (!config.headers["Content-Type"] && !(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/json";
    }

    return config;
});

api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            logout();
            window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default api;