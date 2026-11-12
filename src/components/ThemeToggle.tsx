"use client";

export type Theme = "light" | "dark";

export function ThemeToggle({
  theme,
  onChange,
  labels,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
  labels: { label: string; light: string; dark: string };
}) {
  const nextTheme = theme === "light" ? "dark" : "light";
  return (
    <button
      aria-label={`${labels.label}: ${theme === "light" ? labels.light : labels.dark}`}
      className="theme-toggle"
      onClick={() => onChange(nextTheme)}
      type="button"
    >
      {theme === "light" ? labels.light : labels.dark}
    </button>
  );
}
