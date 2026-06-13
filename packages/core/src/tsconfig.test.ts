/// <reference types="node" />
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("tsconfig migration", () => {
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const coreDir = path.resolve(__dirname, "..");
	const rootDir = path.resolve(coreDir, "../..");

	it("should have @ai-learning-support/tsconfig in packages/core/package.json devDependencies", () => {
		const pkgJsonPath = path.join(coreDir, "package.json");
		expect(fs.existsSync(pkgJsonPath)).toBe(true);
		const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
		expect(pkg.devDependencies).toBeDefined();
		expect(pkg.devDependencies["@ai-learning-support/tsconfig"]).toBe("workspace:*");
	});

	it("should extend @ai-learning-support/tsconfig/base.json in packages/core/tsconfig.json", () => {
		const tsconfigPath = path.join(coreDir, "tsconfig.json");
		expect(fs.existsSync(tsconfigPath)).toBe(true);
		const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
		expect(tsconfig.extends).toBe("@ai-learning-support/tsconfig/base.json");
	});

	it("should not have tsconfig.base.json at the root of the workspace", () => {
		const rootTsconfigBase = path.join(rootDir, "tsconfig.base.json");
		expect(fs.existsSync(rootTsconfigBase)).toBe(false);
	});
});
