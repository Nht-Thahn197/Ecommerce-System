"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSelectableCategory = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.listCategories = void 0;
const prisma_1 = __importDefault(require("../../libs/prisma"));
const categorySelect = {
    id: true,
    name: true,
    parent_id: true,
    created_at: true,
    _count: {
        select: {
            other_categories: true,
            products: true,
        },
    },
};
const parseBoolean = (value) => ["1", "true", "yes", "on"].includes((value || "").toLowerCase());
const normalizeName = (value) => value?.trim() || "";
const buildCategoryViews = (rows) => {
    const rowMap = new Map();
    rows.forEach((row) => rowMap.set(row.id, row));
    const breadcrumbCache = new Map();
    const depthCache = new Map();
    const getBreadcrumb = (id, trail = new Set()) => {
        const cached = breadcrumbCache.get(id);
        if (cached)
            return cached;
        const row = rowMap.get(id);
        if (!row)
            return "";
        if (trail.has(id))
            return row.name;
        const nextTrail = new Set(trail);
        nextTrail.add(id);
        const breadcrumb = row.parent_id
            ? [getBreadcrumb(row.parent_id, nextTrail), row.name].filter(Boolean).join(" > ")
            : row.name;
        breadcrumbCache.set(id, breadcrumb);
        return breadcrumb;
    };
    const getDepth = (id, trail = new Set()) => {
        const cached = depthCache.get(id);
        if (cached !== undefined)
            return cached;
        const row = rowMap.get(id);
        if (!row?.parent_id || trail.has(id)) {
            depthCache.set(id, 0);
            return 0;
        }
        const nextTrail = new Set(trail);
        nextTrail.add(id);
        const depth = getDepth(row.parent_id, nextTrail) + 1;
        depthCache.set(id, depth);
        return depth;
    };
    const items = rows
        .map((row) => ({
        id: row.id,
        name: row.name,
        parent_id: row.parent_id ?? null,
        parent_name: row.parent_id ? rowMap.get(row.parent_id)?.name ?? null : null,
        created_at: row.created_at ?? null,
        depth: getDepth(row.id),
        breadcrumb: getBreadcrumb(row.id),
        is_leaf: row._count.other_categories === 0,
        children_count: row._count.other_categories,
        product_count: row._count.products,
    }))
        .sort((left, right) => {
        const pathCompare = left.breadcrumb.localeCompare(right.breadcrumb, "vi");
        if (pathCompare !== 0)
            return pathCompare;
        return left.id - right.id;
    });
    const itemMap = new Map();
    items.forEach((item) => itemMap.set(item.id, { ...item, children: [] }));
    const roots = [];
    items.forEach((item) => {
        const treeItem = itemMap.get(item.id);
        if (item.parent_id && itemMap.has(item.parent_id)) {
            itemMap.get(item.parent_id).children.push(treeItem);
            return;
        }
        roots.push(treeItem);
    });
    const sortTree = (nodes) => {
        nodes.sort((left, right) => left.name.localeCompare(right.name, "vi"));
        nodes.forEach((node) => sortTree(node.children));
    };
    sortTree(roots);
    return { items, tree: roots };
};
const listCategoryRows = () => prisma_1.default.categories.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: categorySelect,
});
const assertSiblingNameAvailable = async (name, parentId, excludeId) => {
    const where = {
        parent_id: parentId,
        name: {
            equals: name,
            mode: "insensitive",
        },
    };
    if (excludeId !== undefined) {
        where.id = { not: excludeId };
    }
    const existing = await prisma_1.default.categories.findFirst({
        where,
        select: { id: true },
    });
    if (existing) {
        throw new Error("Danh mục cùng cấp đã tồn tại");
    }
};
const assertParentExists = async (parentId) => {
    if (parentId === null)
        return;
    const parent = await prisma_1.default.categories.findUnique({
        where: { id: parentId },
        select: { id: true },
    });
    if (!parent) {
        throw new Error("Danh mục cha không tồn tại");
    }
};
const assertNoCycle = async (categoryId, parentId) => {
    if (parentId === null)
        return;
    if (parentId === categoryId) {
        throw new Error("Danh mục không thể là cha của chính nó");
    }
    const rows = await prisma_1.default.categories.findMany({
        select: { id: true, parent_id: true },
    });
    const parentMap = new Map();
    rows.forEach((row) => parentMap.set(row.id, row.parent_id ?? null));
    let currentParentId = parentId;
    while (currentParentId !== null) {
        if (currentParentId === categoryId) {
            throw new Error("Không thể chuyển danh mục vào chính cây con của nó");
        }
        currentParentId = parentMap.get(currentParentId) ?? null;
    }
};
const getListItemById = async (id) => {
    const rows = await listCategoryRows();
    const { items } = buildCategoryViews(rows);
    return items.find((item) => item.id === id) || null;
};
const listCategories = async (query) => {
    const rows = await listCategoryRows();
    const { items, tree } = buildCategoryViews(rows);
    const leafOnly = parseBoolean(query.leaf_only);
    const data = leafOnly ? items.filter((item) => item.is_leaf) : items;
    return {
        data,
        tree,
        meta: {
            total: items.length,
            root_count: items.filter((item) => item.parent_id === null).length,
            leaf_count: items.filter((item) => item.is_leaf).length,
        },
    };
};
exports.listCategories = listCategories;
const getCategoryById = async (id) => {
    const category = await getListItemById(id);
    if (!category) {
        throw new Error("Danh mục không tồn tại");
    }
    return category;
};
exports.getCategoryById = getCategoryById;
const createCategory = async (input) => {
    const name = normalizeName(input.name);
    const parentId = input.parent_id ?? null;
    if (!name) {
        throw new Error("Tên danh mục là bắt buộc");
    }
    await assertParentExists(parentId);
    await assertSiblingNameAvailable(name, parentId);
    const category = await prisma_1.default.categories.create({
        data: {
            name,
            parent_id: parentId,
        },
        select: { id: true },
    });
    return (0, exports.getCategoryById)(category.id);
};
exports.createCategory = createCategory;
const updateCategory = async (id, input) => {
    const existing = await prisma_1.default.categories.findUnique({
        where: { id },
        select: { id: true, name: true, parent_id: true },
    });
    if (!existing) {
        throw new Error("Danh mục không tồn tại");
    }
    const hasName = Object.prototype.hasOwnProperty.call(input, "name");
    const hasParent = Object.prototype.hasOwnProperty.call(input, "parent_id");
    if (!hasName && !hasParent) {
        throw new Error("Không có dữ liệu cập nhật");
    }
    const name = hasName ? normalizeName(input.name) : existing.name;
    const parentId = hasParent ? input.parent_id ?? null : existing.parent_id ?? null;
    if (!name) {
        throw new Error("Tên danh mục là bắt buộc");
    }
    await assertParentExists(parentId);
    await assertNoCycle(id, parentId);
    await assertSiblingNameAvailable(name, parentId, id);
    await prisma_1.default.categories.update({
        where: { id },
        data: {
            name,
            parent_id: parentId,
        },
    });
    return (0, exports.getCategoryById)(id);
};
exports.updateCategory = updateCategory;
const deleteCategory = async (id) => {
    const category = await prisma_1.default.categories.findUnique({
        where: { id },
        select: {
            id: true,
            _count: {
                select: {
                    other_categories: true,
                    products: true,
                },
            },
        },
    });
    if (!category) {
        throw new Error("Danh mục không tồn tại");
    }
    if (category._count.other_categories > 0) {
        throw new Error("Không thể xoá danh mục đang có danh mục con");
    }
    if (category._count.products > 0) {
        throw new Error("Không thể xoá danh mục đang được gán cho sản phẩm");
    }
    await prisma_1.default.categories.delete({ where: { id } });
};
exports.deleteCategory = deleteCategory;
const ensureSelectableCategory = async (categoryId) => {
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
        throw new Error("Danh mục không hợp lệ");
    }
    const category = await prisma_1.default.categories.findUnique({
        where: { id: categoryId },
        select: {
            id: true,
            name: true,
            _count: {
                select: {
                    other_categories: true,
                },
            },
        },
    });
    if (!category) {
        throw new Error("Danh mục không tồn tại");
    }
    if (category._count.other_categories > 0) {
        throw new Error("Vui lòng chọn danh mục cuối cùng để đăng sản phẩm");
    }
    return category;
};
exports.ensureSelectableCategory = ensureSelectableCategory;
