import { describe, expect, it } from "vitest";
import { readinessIssues } from "../../scripts/check-content";
import { profileSchema } from "../../src/config/profile";
import { projects } from "../../src/config/projects";
import { KNOWLEDGE_FILES } from "../../src/lib/knowledge-schema";

const profile = profileSchema.parse({ contactEmail: "anapaulapgavilan@gmail.com" });
describe("release readiness", () => {
  it("does not mistake template builds for release approval", () => {
    const issues = readinessIssues([], profile, projects, []);
    expect(issues).toContain("Missing approved content: 01-profile.md");
    expect(issues).toContain("Missing approved asset: cv");
    expect(issues).toContain("Missing approved profile: biography");
  });
  it("detects missing asset files even when references are configured", () => {
    const approved = profileSchema.parse({ ...profile, displayName: "Synthetic profile", biography: "Synthetic bio", oneLiner: "Synthetic title", photo: "/photo.jpg", cv: "/cv.pdf", illustration: "/avatar/ana-paula.png" });
    const sections = KNOWLEDGE_FILES.map((path) => ({ path }));
    expect(readinessIssues(sections, approved, projects, [])).toContain("Approved asset file unavailable: cv");
    expect(readinessIssues(sections, approved, projects, ["photo", "cv", "illustration"])).toEqual([]);
  });
});
