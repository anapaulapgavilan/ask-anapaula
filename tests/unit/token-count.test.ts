import { describe, expect, it } from "vitest";
import { assertTokenCeiling } from "../../scripts/check-tokens";
describe("provider token ceiling", () => {
  it("accepts 29,999 and rejects 30,000 or invalid counts", () => {
    expect(() => assertTokenCeiling(29999)).not.toThrow();
    for (const count of [30000, 30001, -1, 1.5, NaN]) expect(() => assertTokenCeiling(count)).toThrow();
  });
});
