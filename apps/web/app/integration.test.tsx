import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Page from "./page";
import { core } from "@ai-learning-support/core";

vi.mock("next/navigation", () => ({
	redirect: vi.fn(),
}));


describe("E2E Integration and Monorepo Validation (#12)", () => {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const webDir = path.resolve(__dirname, "..");

	it("should render the Page component and display the real core package message without mocking", () => {
		const html = renderToStaticMarkup(<Page />);
		expect(html).toContain("Hello World");
		expect(html).toContain(core());
		expect(core()).toBe("core");
	});

	it("should have @ai-learning-support/core as a workspace dependency in apps/web/package.json", () => {
		const pkgJsonPath = path.join(webDir, "package.json");
		expect(fs.existsSync(pkgJsonPath)).toBe(true);
		const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
		expect(pkg.dependencies).toBeDefined();
		expect(pkg.dependencies["@ai-learning-support/core"]).toBe("workspace:*");
	});

	it("should extend @ai-learning-support/tsconfig/nextjs.json in apps/web/tsconfig.json", () => {
		const tsconfigPath = path.join(webDir, "tsconfig.json");
		expect(fs.existsSync(tsconfigPath)).toBe(true);
		const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
		expect(tsconfig.extends).toBe("@ai-learning-support/tsconfig/nextjs.json");
	});
});
