import { projects } from "../config/projects";
import type { Language } from "../lib/i18n";
import { uiCopy } from "../lib/i18n";

type ProjectCopy = Pick<(typeof uiCopy)[Language], "projects" | "projectUnavailable" | "repositoryLink">;

export function ProjectCards({ language, copy }: { language: Language; copy: ProjectCopy }) {
  return (
    <section aria-labelledby="projects-title" className="content-section projects-section">
      <p className="section-kicker">{language === "en" ? "Selected GitHub projects" : "Proyectos seleccionados de GitHub"}</p>
      <h2 id="projects-title">{copy.projects}</h2>
      <div className="project-grid">
        {projects.map((project) => (
          <article className="project-card" key={project.id}>
            <h3>{project.label}</h3>
            <p>{project.description?.[language] ?? copy.projectUnavailable}</p>
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${copy.repositoryLink}: ${project.label}`}
              >
                {copy.repositoryLink}
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
