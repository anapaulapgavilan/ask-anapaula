import { profile } from "../config/profile";
import type { Language } from "../lib/i18n";
import { uiCopy } from "../lib/i18n";

type HeroCopy = Pick<(typeof uiCopy)[Language], "eyebrow" | "title" | "biography" | "phrase">;

export function Hero({ copy }: { copy: HeroCopy }) {
  return (
    <section aria-labelledby="profile-title" className="hero">
      <div className="hero-copy">
        <p className="section-kicker">{copy.eyebrow}</p>
        <h1 id="profile-title">{copy.title}</h1>
        <p className="hero-biography">{copy.biography}</p>
        <p className="hero-phrase">{copy.phrase}</p>
        <a className="text-link" href={`mailto:${profile.contactEmail}`}>
          {profile.contactEmail}
        </a>
      </div>
    </section>
  );
}
