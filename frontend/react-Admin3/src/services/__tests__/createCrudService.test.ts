import { vi, describe, it, expect, beforeEach } from 'vitest';

describe("createCrudService", () => {
    let createCrudService: any;
    let createAdminCrudService: any;
    let httpService: any;

    beforeEach(async () => {
        vi.resetModules();

        vi.doMock("../httpService", () => ({
            __esModule: true,
            default: {
                get: vi.fn(),
                post: vi.fn(),
                put: vi.fn(),
                delete: vi.fn(),
            },
        }));

        const mod = await import("../createCrudService");
        createCrudService = mod.createCrudService;
        createAdminCrudService = mod.createAdminCrudService;
        httpService = (await import("../httpService")).default;
    });

    // ─── list ────────────────────────────────────────────────────────

    describe("list", () => {
        it("returns paginated response", async () => {
            const data = { results: [{ id: 1, name: "A" }], count: 1 };
            httpService.get.mockResolvedValue({ data });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.list({ page: 1 });

            expect(httpService.get).toHaveBeenCalledWith("/api/test/", { params: { page: 1 } });
            expect(result).toEqual({ results: data.results, count: 1 });
        });

        it("defaults to empty params", async () => {
            httpService.get.mockResolvedValue({ data: { results: [], count: 0 } });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            await service.list();

            expect(httpService.get).toHaveBeenCalledWith("/api/test/", { params: {} });
        });

        it("handles array response (non-paginated)", async () => {
            const items = [{ id: 1, name: "A" }];
            httpService.get.mockResolvedValue({ data: items });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.list();

            expect(result).toEqual({ results: items, count: 1 });
        });
    });

    // ─── getAll ──────────────────────────────────────────────────────

    describe("getAll", () => {
        it("returns array from paginated response", async () => {
            const items = [{ id: 1, name: "A" }];
            httpService.get.mockResolvedValue({ data: { results: items } });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.getAll();

            expect(result).toEqual(items);
        });

        it("returns array directly if response is array", async () => {
            const items = [{ id: 1, name: "A" }];
            httpService.get.mockResolvedValue({ data: items });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.getAll();

            expect(result).toEqual(items);
        });

        it("returns empty array on null data", async () => {
            httpService.get.mockResolvedValue({ data: null });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.getAll();

            expect(result).toEqual([]);
        });

        it("returns empty array and logs error on failure", async () => {
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
            httpService.get.mockRejectedValue(new Error("Network error"));

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test items" });
            const result = await service.getAll();

            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith(
                "Error fetching test items:",
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });
    });

    // ─── getById ─────────────────────────────────────────────────────

    describe("getById", () => {
        it("fetches entity by numeric id", async () => {
            const entity = { id: 42, name: "Test" };
            httpService.get.mockResolvedValue({ data: entity });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.getById(42);

            expect(httpService.get).toHaveBeenCalledWith("/api/test/42/");
            expect(result).toEqual(entity);
        });

        it("fetches entity by string id", async () => {
            httpService.get.mockResolvedValue({ data: { id: 1, name: "A" } });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            await service.getById("abc");

            expect(httpService.get).toHaveBeenCalledWith("/api/test/abc/");
        });
    });

    // ─── create ──────────────────────────────────────────────────────

    describe("create", () => {
        it("posts data and returns created entity", async () => {
            const input = { name: "New" };
            const created = { id: 99, ...input };
            httpService.post.mockResolvedValue({ data: created });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.create(input);

            expect(httpService.post).toHaveBeenCalledWith("/api/test/", input);
            expect(result).toEqual(created);
        });
    });

    // ─── update ──────────────────────────────────────────────────────

    describe("update", () => {
        it("puts data and returns updated entity", async () => {
            const input = { name: "Updated" };
            const updated = { id: 1, name: "Updated" };
            httpService.put.mockResolvedValue({ data: updated });

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            const result = await service.update(1, input);

            expect(httpService.put).toHaveBeenCalledWith("/api/test/1/", input);
            expect(result).toEqual(updated);
        });
    });

    // ─── delete ──────────────────────────────────────────────────────

    describe("delete", () => {
        it("deletes entity by id", async () => {
            httpService.delete.mockResolvedValue({});

            const service = createCrudService({ apiUrl: "/api/test", resourceName: "test" });
            await service.delete(1);

            expect(httpService.delete).toHaveBeenCalledWith("/api/test/1/");
        });
    });
});

// ─── createAdminCrudService ──────────────────────────────────────────

describe("createAdminCrudService", () => {
    let createAdminCrudService: any;
    let httpService: any;

    beforeEach(async () => {
        vi.resetModules();

        vi.doMock("../httpService", () => ({
            __esModule: true,
            default: {
                get: vi.fn(),
                post: vi.fn(),
                put: vi.fn(),
                delete: vi.fn(),
            },
        }));

        const mod = await import("../createCrudService");
        createAdminCrudService = mod.createAdminCrudService;
        httpService = (await import("../httpService")).default;
    });

    it("adminList fetches from admin URL", async () => {
        const data = { results: [{ id: 1 }], count: 1 };
        httpService.get.mockResolvedValue({ data });

        const service = createAdminCrudService({
            apiUrl: "/api/store/products",
            adminApiUrl: "/api/store/admin-products",
            resourceName: "store products",
        });
        const result = await service.adminList({ page: 1 });

        expect(httpService.get).toHaveBeenCalledWith("/api/store/admin-products/", {
            params: { page: 1 },
        });
        expect(result).toEqual({ results: [{ id: 1 }], count: 1 });
    });

    it("list fetches from public URL (inherited)", async () => {
        httpService.get.mockResolvedValue({ data: { results: [], count: 0 } });

        const service = createAdminCrudService({
            apiUrl: "/api/store/products",
            adminApiUrl: "/api/store/admin-products",
            resourceName: "store products",
        });
        await service.list();

        expect(httpService.get).toHaveBeenCalledWith("/api/store/products/", { params: {} });
    });

    it("delete uses admin URL (override)", async () => {
        httpService.delete.mockResolvedValue({});

        const service = createAdminCrudService({
            apiUrl: "/api/store/products",
            adminApiUrl: "/api/store/admin-products",
            resourceName: "store products",
        });
        await service.delete(42);

        expect(httpService.delete).toHaveBeenCalledWith("/api/store/admin-products/42/");
    });

    it("create uses public URL (inherited)", async () => {
        httpService.post.mockResolvedValue({ data: { id: 1 } });

        const service = createAdminCrudService({
            apiUrl: "/api/store/products",
            adminApiUrl: "/api/store/admin-products",
            resourceName: "store products",
        });
        await service.create({ name: "A" });

        expect(httpService.post).toHaveBeenCalledWith("/api/store/products/", { name: "A" });
    });
});
