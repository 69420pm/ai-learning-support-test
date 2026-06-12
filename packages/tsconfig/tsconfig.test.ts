import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";

describe("tsconfig package", () => {
	const pkgDir = __dirname;

	it("should have a valid package.json with name @ai-learning-support/tsconfig", () => {
		const pkgJsonPath = path.join(pkgDir, "package.json");
		expect(fs.existsSync(pkgJsonPath)).toBe(true);
		const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
		expect(pkg.name).toBe("@ai-learning-support/tsconfig");
	});

	it("should contain base.json with correct compiler options", () => {
		const baseJsonPath = path.join(pkgDir, "base.json");
		expect(fs.existsSync(baseJsonPath)).toBe(true);
		const base = JSON.parse(fs.readFileSync(baseJsonPath, "utf-8"));
		expect(base.compilerOptions).toBeDefined();
		expect(base.compilerOptions.target).toBe("ES2022");
		expect(base.compilerOptions.strict).toBe(true);
	});

	it("should contain nextjs.json extending base.json", () => {
		const nextjsJsonPath = path.join(pkgDir, "nextjs.json");
		expect(fs.existsSync(nextjsJsonPath)).toBe(true);
		const nextjs = JSON.parse(fs.readFileSync(nextjsJsonPath, "utf-8"));
		expect(nextjs.extends).toBe("./base.json");
	});
});
