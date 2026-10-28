import { describe, expect, it } from "vitest";
import { parseEnvironment } from "../../src/lib/env-schema";
import { profileSchema } from "../../src/config/profile";
import { projects } from "../../src/config/projects";

const configured = {
  ANTHROPIC_API_KEY: "synthetic-key",
  ANTHROPIC_MODEL: "synthetic-model",
  UPSTASH_REDIS_REST_URL: "https://example.test",
  UPSTASH_REDIS_REST_TOKEN: "synthetic-token",
  IP_HASH_SECRET: "ab".repeat(32),
  NEXT_PUBLIC_CONTACT_EMAIL: "anapaulapgavilan@gmail.com",
  NEXT_PUBLIC_SITE_URL: "https://example.test",
  REDIS_KEY_PREFIX: "integration:synthetic",
};

describe("configuration", () => {
  it("allows explicit setup-only builds with no credentials", () => {
    expect(parseEnvironment({}).chatEnabled).toBe(false);
    expect(parseEnvironment({ CHAT_ENABLED: "" }).chatEnabled).toBe(false);
  });
  it("never enables chat through a truthy non-boolean string", () => {
    expect(() => parseEnvironment({ CHAT_ENABLED: "yes" })).toThrow(/CHAT_ENABLED/);
    expect(() => parseEnvironment({ CHAT_ENABLED: "true" })).toThrow(/configuration/);
  });
  it("validates all required runtime values without printing them", () => {
    expect(parseEnvironment(configured).chatEnabled).toBe(false);
    expect(parseEnvironment({ ...configured, CHAT_ENABLED: "true" }).chatEnabled).toBe(true);
    for (const [key, value] of [
      ["IP_HASH_SECRET", "weak-secret"],
      ["UPSTASH_REDIS_REST_URL", "http://example.test"],
      ["NEXT_PUBLIC_SITE_URL", "https://example.test/path"],
      ["NEXT_PUBLIC_CONTACT_EMAIL", "unapproved@example.test"],
    ]) {
      expect(() => parseEnvironment({ ...configured, [key]: value })).toThrow(key);
      expect(() => parseEnvironment({ ...configured, [key]: value })).not.toThrow(value);
    }
  });
  it("keeps all unapproved profile facts and project destinations unavailable", () => {
    const profile = profileSchema.parse({ contactEmail: configured.NEXT_PUBLIC_CONTACT_EMAIL });
    expect(profile.biography).toBeNull();
    expect(profile.photo).toBeNull();
    expect(profile.cv).toBeNull();
    expect(profile.illustration).toBeNull();
    expect(projects).toHaveLength(4);
    expect(projects.every((project) => project.url === null && project.description === null)).toBe(true);
    expect(() => profileSchema.parse({ contactEmail: configured.NEXT_PUBLIC_CONTACT_EMAIL, linkedinUrl: "javascript:alert(1)" })).toThrow();
  });
});
