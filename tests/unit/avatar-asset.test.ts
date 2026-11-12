import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { profile, profileSchema } from "../../src/config/profile";
import { readinessIssues } from "../../scripts/check-content";
import { projects } from "../../src/config/projects";

describe("owner-supplied layered illustration", () => {
  it("uses the supplied illustration, not a hero photograph", () => {
    expect(profile.illustration).toBe("/avatar/ana-paula-animated.svg");
    expect(profile.photo).toBeNull();
    expect(profile.cv).toBeNull();
    expect(profile.biography).toBeNull();
    expect(profileSchema.safeParse({ ...profile, illustration: "/avatar/other.png" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...profile, illustration: "/avatar/ana-paula.png" }).success).toBe(false);
  });

  it("preserves the supplied SVG unchanged", () => {
    const svg = readFileSync(resolve("public/avatar/ana-paula-animated.svg"));
    expect(createHash("sha256").update(svg).digest("hex")).toBe("2e33953d9b11c848a5363c617457f72fcbab3a87361329d6afd9e9a735a134db");
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
