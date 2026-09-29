import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "college_ai_theme";
const VALID_THEMES = ["light", "dark", "system"];

const ThemeContext = createContext(null);

function getSystemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function loadTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.includes(saved) ? saved : "system";
  } catch {
    return "system";
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(loadTheme);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    theme === "system" ? getSystemTheme() : theme
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors (private browsing, quota, etc.)
    }

    if (theme !== "system") {
      setResolvedTheme(theme);
      return;
    }

    setResolvedTheme(getSystemTheme());

    if (!window.matchMedia) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event) => {
      setResolvedTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (nextTheme) => {
    if (VALID_THEMES.includes(nextTheme)) {
      setThemeState(nextTheme);
    }
  };

  const value = { theme, resolvedTheme, setTheme };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider.");
  }

  return context;
}
