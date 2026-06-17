import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import webConfig from "./apps/web/vitest.config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "tsconfig",
					root: path.resolve(__dirname, "packages/tsconfig"),
					exclude: [...configDefaults.exclude, "**/dist/**"],
				},
			},
			{
				test: {
					name: "core",
					root: path.resolve(__dirname, "packages/core"),
					exclude: [...configDefaults.exclude, "**/dist/**"],
				},
			},
			{
				...webConfig,
				test: {
					...webConfig.test,
					name: "web",
					root: path.resolve(__dirname, "apps/web"),
					exclude: [...configDefaults.exclude, "**/dist/**"],
				},
			},
		],
	},
});
