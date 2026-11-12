"use client";

import { useEffect, useState } from "react";
import { profile } from "../config/profile";
import { uiCopy, type Language } from "../lib/i18n";
import { AnimatedAvatar, type AvatarPresentationState } from "./AnimatedAvatar";
import { Chat } from "./Chat";
import { Hero } from "./Hero";
import { LanguageToggle } from "./LanguageToggle";
import { PrivacyFooter } from "./PrivacyFooter";
import { ProjectCards } from "./ProjectCards";
import { ThemeToggle, type Theme } from "./ThemeToggle";

export function ProfileExperience() {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("light");
  const [avatarState, setAvatarState] = useState<AvatarPresentationState>({
    status: "idle",
    requestId: null,
  });
  const content = uiCopy[language];

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <>
      <a className="skip-link" href="#main">{content.skip}</a>
      <main className="page-shell" id="main">
        <header className="site-header">
          <a className="wordmark" href="#main">AP<span>.</span></a>
          <div className="header-controls">
            <LanguageToggle language={language} label={content.language} onChange={setLanguage} />
            <ThemeToggle labels={{ label: content.themeLabel, light: content.light, dark: content.dark }} onChange={setTheme} theme={theme} />
          </div>
        </header>

        <div className="top-avatar">
          <AnimatedAvatar
            language={language}
            label={content.chat.avatar}
            pauseLabel={content.chat.pause}
            resumeLabel={content.chat.resume}
            requestId={avatarState.requestId}
            status={avatarState.status}
            statusLabel={{
              idle: content.chat.ready,
              thinking: content.chat.thinking,
              responding: content.chat.responding,
              error: content.chat.failed,
            }}
            unavailableLabel={content.chat.avatarUnavailable}
          />
        </div>

        <Chat copy={content.chat} language={language} onAvatarStateChange={setAvatarState} />

        <Hero copy={content} />

        <section aria-labelledby="experience-title" className="content-section">
          <p className="section-kicker">{language === "en" ? "Career" : "Trayectoria"}</p>
          <h2 id="experience-title">{content.experience}</h2>
          <div className="experience-list">
            {content.experienceItems.map(([role, detail]) => (
              <article className="experience-item" key={role}>
                <h3>{role}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-label={language === "en" ? "Education and contributions" : "Formación y contribuciones"} className="two-column content-section">
          <div>
            <p className="section-kicker">{language === "en" ? "Learning" : "Formación"}</p>
            <h2>{content.education}</h2>
            <p>{content.educationText}</p>
          </div>
          <div>
            <p className="section-kicker">{language === "en" ? "Selected work" : "Trabajo seleccionado"}</p>
            <h2>{content.outcomes}</h2>
            <p>{content.outcomesText}</p>
          </div>
        </section>

        <section aria-labelledby="materials-title" className="materials-section">
          <p className="section-kicker">{content.materials}</p>
          <h2 id="materials-title">{content.materials}</h2>
          <p>{content.materialsText}</p>
        </section>

        <ProjectCards copy={content} language={language} />

        <section aria-labelledby="contact-title" className="contact-section">
          <p className="section-kicker">{content.contact}</p>
          <h2 id="contact-title">{language === "en" ? "Let’s connect" : "Conversemos"}</h2>
          <p>{content.contactText}</p>
          <a className="primary-link" href={`mailto:${profile.contactEmail}`}>{profile.contactEmail}</a>
          {profile.githubUrl ? (
            <p>
              <a className="text-link" href={profile.githubUrl}>{content.githubProfile}</a>
            </p>
          ) : null}
          {profile.linkedinUrl ? (
            <p>
              <a className="text-link" href={profile.linkedinUrl}>{content.linkedinProfile}</a>
            </p>
          ) : null}
        </section>

        <PrivacyFooter language={language} />
      </main>
    </>
  );
}
