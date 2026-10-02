import { useRef } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "" }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const transitionTimer = useRef(null);
  const activeTheme = theme === "system" ? resolvedTheme : theme;
  const nextTheme = activeTheme === "dark" ? "light" : "dark";

  const chooseTheme = (value) => {
    document.documentElement.classList.add("theme-transitioning");
    window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
      transitionTimer.current = null;
    }, 320);
    setTheme(value);
  };

  return (
    <div className={`header-theme-toggle theme-toggle ${className}`.trim()} role="group" aria-label="Color theme">
      <button
        type="button"
        className={`theme-switch is-${activeTheme}`}
        role="switch"
        aria-checked={activeTheme === "dark"}
        onClick={() => chooseTheme(nextTheme)}
        title={`Switch to ${nextTheme} mode`}
        aria-label={`Switch to ${nextTheme} mode`}
      >
        <span className="theme-switch-icon theme-switch-icon--light"><Sun size={15} aria-hidden="true" /></span>
        <span className="theme-switch-icon theme-switch-icon--dark"><Moon size={15} aria-hidden="true" /></span>
        <span className="theme-switch-knob" aria-hidden="true" />
      </button>
      <button
        type="button"
        className={`theme-system${theme === "system" ? " active" : ""}`}
        onClick={() => chooseTheme("system")}
        title="Use system theme"
        aria-label="Use system theme"
        aria-pressed={theme === "system"}
      >
        <Monitor size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
