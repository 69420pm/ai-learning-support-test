import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "tsconfig",
					root: "./packages/tsconfig",
					exclude: [...configDefaults.exclude, "**/dist/**"],
				},
			},
			{
				test: {
					name: "core",
					root: "./packages/core",
					exclude: [...configDefaults.exclude, "**/dist/**"],
				},
			},
			{
				extends: "./apps/web/vitest.config.ts",
				test: {
					name: "web",
					root: "./apps/web",
					exclude: [...configDefaults.exclude, "**/dist/**"],
				},
			},
		],
	},
});
