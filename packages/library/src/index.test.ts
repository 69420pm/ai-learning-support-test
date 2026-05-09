import { expect, test } from "vitest";
import { libraryVersion } from "./index.js";

test("smoke test", () => {
	expect(libraryVersion).toBe("1.0.0");
});
