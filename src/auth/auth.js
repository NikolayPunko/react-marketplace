const TOKEN_KEY = "token";
const ROLES_KEY = "roles";
const EMAIL_KEY = "email";

export function saveAuth({ token, roles, email }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles || []));
    localStorage.setItem(EMAIL_KEY, email || "");
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

export function getRoles() {
    try {
        return JSON.parse(localStorage.getItem(ROLES_KEY) || "[]");
    } catch {
        return [];
    }
}

export function getEmail() {
    return localStorage.getItem(EMAIL_KEY) || "";
}

export function isLoggedIn() {
    return !!getToken();
}

export function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(EMAIL_KEY);
}