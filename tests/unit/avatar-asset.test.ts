import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { profile, profileSchema } from "../../src/config/profile";
import { readinessIssues } from "../../scripts/check-content";
import { projects } from "../../src/config/projects";

describe("owner-approved PNG illustration", () => {
  it("uses only the supplied illustration, not an invented SVG or hero photograph", () => {
    expect(profile.illustration).toBe("/avatar/ana-paula.png");
    expect(profile.photo).toBeNull();
    expect(profile.cv).toBeNull();
    expect(profile.biography).toBeNull();
    expect(profileSchema.safeParse({ ...profile, illustration: "/avatar/other.png" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, illustration: "/avatar/ana-paula.svg" }).success).toBe(false);
  });

  it("preserves the approved pixels in a local nonanimated PNG without text metadata", () => {
    const png = readFileSync(resolve("public/avatar/ana-paula.png"));
    expect(createHash("sha256").update(png).digest("hex")).toBe("b300483f0c8e8cadf716cdab83d878c8d345e30b361a31a647b7f3e10dd86710");
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const chunks: string[] = [];
    let offset = 8;
    while (offset < png.length) {
      const size = png.readUInt32BE(offset);
      const kind = png.toString("ascii", offset + 4, offset + 8);
      expect(offset + size + 12).toBeLessThanOrEqual(png.length);
      chunks.push(kind);
      if (kind === "IHDR") {
        expect(size).toBe(13);
        expect(png.readUInt32BE(offset + 8)).toBe(793);
        expect(png.readUInt32BE(offset + 12)).toBe(700);
      }
      offset += size + 12;
    }
    expect(offset).toBe(png.length);
    expect(chunks).toEqual(["IHDR", "sRGB", "gAMA", "pHYs", "IDAT", "IEND"]);
  });

  it("requires the actual illustration file and keeps unrelated approvals blocked", () => {
    expect(readinessIssues([], profile, projects, [])).toContain("Approved asset file unavailable: illustration");
    const issues = readinessIssues([], profile, projects, ["illustration"]);
    expect(issues).not.toContain("Missing approved asset: illustration");
    expect(issues).toContain("Missing approved asset: photo");
    expect(issues).toContain("Missing approved asset: cv");
    expect(issues).toContain("Missing approved profile: biography");
  });
});
