"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutAllUserTokens = exports.logoutUser = exports.refreshAccessToken = exports.updateAvatar = exports.updateProfile = exports.getCurrentUser = exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../../libs/prisma"));
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 72;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || "1d";
const REFRESH_TOKEN_TTL_DAYS = (() => {
    const value = Number.parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "30", 10);
    return Number.isFinite(value) && value > 0 ? value : 30;
})();
const publicUserSelect = {
    id: true,
    email: true,
    phone: true,
    gender: true,
    birth_date: true,
    avatar_url: true,
    full_name: true,
    role: true,
    status: true,
    created_at: true,
    updated_at: true,
};
const normalizeEmail = (email) => email.trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH;
const normalizeGender = (value) => {
    if (!value)
        return null;
    const raw = value.toLowerCase();
    if (["male", "nam"].includes(raw))
        return "male";
    if (["female", "nu", "nữ"].includes(raw))
        return "female";
    if (["other", "khac", "khác"].includes(raw))
        return "other";
    return null;
};
const requireJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT secret is not set");
    return secret;
};
const createAccessToken = (user) => {
    if (user.status && user.status !== "active") {
        throw new Error("User is inactive");
    }
    return jsonwebtoken_1.default.sign({
        userId: user.id,
        role: user.role,
    }, requireJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};
const hashToken = (token) => crypto_1.default.createHash("sha256").update(token).digest("hex");
const createRefreshToken = async (userId) => {
    const rawToken = crypto_1.default.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma_1.default.refresh_tokens.create({
        data: {
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
        },
    });
    return { token: rawToken, expiresAt };
};
const registerUser = async (data) => {
    if (!data.email || !data.password) {
        throw new Error("Email and password are required");
    }
    const email = normalizeEmail(data.email);
    const phone = data.phone?.trim() || null;
    if (!isValidEmail(email)) {
        throw new Error("Invalid email format");
    }
    if (!isValidPassword(data.password)) {
        throw new Error("Password must be at least 6 characters");
    }
    const existingUser = await prisma_1.default.users.findUnique({
        where: { email },
        select: { id: true },
    });
    if (existingUser) {
        throw new Error("Email already exists");
    }
    if (phone) {
        const existingPhone = await prisma_1.default.users.findFirst({
            where: { phone },
            select: { id: true },
        });
        if (existingPhone) {
            throw new Error("Phone already exists");
        }
    }
    const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
    const fullName = data.full_name?.trim() || null;
    const user = await prisma_1.default.users.create({
        data: {
            email,
            password_hash: hashedPassword,
            full_name: fullName,
            phone,
            role: "customer",
            status: "active",
        },
        select: publicUserSelect,
    });
    return user;
};
exports.registerUser = registerUser;
const loginUser = async (input) => {
    const identifier = (input.identifier || input.email || input.phone || "").trim();
    if (!identifier || !input.password) {
        throw new Error("Email/phone and password are required");
    }
    let user = null;
    if (isValidEmail(identifier)) {
        const email = normalizeEmail(identifier);
        user = await prisma_1.default.users.findUnique({
            where: { email },
            select: { ...publicUserSelect, password_hash: true },
        });
    }
    else {
        user = await prisma_1.default.users.findFirst({
            where: { phone: identifier },
            select: { ...publicUserSelect, password_hash: true },
        });
    }
    if (!user)
        throw new Error("User not found");
    const isMatch = await bcrypt_1.default.compare(input.password, user.password_hash);
    if (!isMatch)
        throw new Error("Invalid credentials");
    const token = createAccessToken(user);
    const refresh = await createRefreshToken(user.id);
    const { password_hash, ...publicUser } = user;
    return { user: publicUser, token, refresh_token: refresh.token };
};
exports.loginUser = loginUser;
const getCurrentUser = async (userId) => {
    const user = await prisma_1.default.users.findUnique({
        where: { id: userId },
        select: publicUserSelect,
    });
    if (!user)
        throw new Error("User not found");
    return user;
};
exports.getCurrentUser = getCurrentUser;
const updateProfile = async (userId, input) => {
    const data = {};
    if (input.email !== undefined) {
        const email = input.email?.trim();
        if (!email) {
            throw new Error("Email là bắt buộc");
        }
        const normalized = normalizeEmail(email);
        if (!isValidEmail(normalized)) {
            throw new Error("Email không hợp lệ");
        }
        const existing = await prisma_1.default.users.findFirst({
            where: { email: normalized, NOT: { id: userId } },
            select: { id: true },
        });
        if (existing) {
            throw new Error("Email đã tồn tại");
        }
        data.email = normalized;
    }
    if (input.full_name !== undefined) {
        const fullName = input.full_name?.trim();
        data.full_name = fullName || null;
    }
    if (input.phone !== undefined) {
        const phone = input.phone?.trim();
        if (!phone) {
            data.phone = null;
        }
        else {
            const existing = await prisma_1.default.users.findFirst({
                where: { phone, NOT: { id: userId } },
                select: { id: true },
            });
            if (existing) {
                throw new Error("Số điện thoại đã tồn tại");
            }
            data.phone = phone;
        }
    }
    if (input.gender !== undefined) {
        const normalized = normalizeGender(input.gender);
        if (!normalized && input.gender) {
            throw new Error("Giới tính không hợp lệ");
        }
        data.gender = normalized;
    }
    if (input.birth_date !== undefined) {
        const birth = input.birth_date?.trim();
        if (!birth) {
            data.birth_date = null;
        }
        else {
            const parsed = new Date(birth);
            if (Number.isNaN(parsed.getTime())) {
                throw new Error("Ngày sinh không hợp lệ");
            }
            data.birth_date = parsed;
        }
    }
    if (input.avatar_url !== undefined) {
        const avatar = input.avatar_url?.trim();
        if (!avatar) {
            data.avatar_url = null;
        }
        else if (avatar.length > 1500000) {
            throw new Error("Ảnh quá lớn");
        }
        else {
            data.avatar_url = avatar;
        }
    }
    const user = await prisma_1.default.users.update({
        where: { id: userId },
        data,
        select: publicUserSelect,
    });
    return user;
};
exports.updateProfile = updateProfile;
const updateAvatar = async (userId, avatarUrl) => {
    const user = await prisma_1.default.users.update({
        where: { id: userId },
        data: { avatar_url: avatarUrl },
        select: publicUserSelect,
    });
    return user;
};
exports.updateAvatar = updateAvatar;
const refreshAccessToken = async (input) => {
    if (!input.refresh_token) {
        throw new Error("Refresh token is required");
    }
    const tokenHash = hashToken(input.refresh_token);
    const stored = await prisma_1.default.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
    });
    if (!stored || stored.revoked_at) {
        throw new Error("Invalid refresh token");
    }
    if (stored.expires_at.getTime() <= Date.now()) {
        await prisma_1.default.refresh_tokens.update({
            where: { token_hash: tokenHash },
            data: { revoked_at: new Date() },
        });
        throw new Error("Refresh token expired");
    }
    const user = await prisma_1.default.users.findUnique({
        where: { id: stored.user_id },
        select: { id: true, role: true, status: true },
    });
    if (!user || user.status !== "active") {
        throw new Error("User not found");
    }
    await prisma_1.default.refresh_tokens.update({
        where: { token_hash: tokenHash },
        data: { revoked_at: new Date() },
    });
    const refresh = await createRefreshToken(user.id);
    const token = createAccessToken(user);
    return { token, refresh_token: refresh.token };
};
exports.refreshAccessToken = refreshAccessToken;
const logoutUser = async (input) => {
    if (!input.refresh_token) {
        throw new Error("Refresh token is required");
    }
    const tokenHash = hashToken(input.refresh_token);
    const stored = await prisma_1.default.refresh_tokens.findUnique({
        where: { token_hash: tokenHash },
    });
    if (!stored || stored.revoked_at) {
        return;
    }
    await prisma_1.default.refresh_tokens.update({
        where: { token_hash: tokenHash },
        data: { revoked_at: new Date() },
    });
};
exports.logoutUser = logoutUser;
const logoutAllUserTokens = async (userId) => {
    await prisma_1.default.refresh_tokens.updateMany({
        where: { user_id: userId, revoked_at: null },
        data: { revoked_at: new Date() },
    });
};
exports.logoutAllUserTokens = logoutAllUserTokens;
