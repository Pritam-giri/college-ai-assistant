import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "college_ai_chat_settings";

const DEFAULT_SETTINGS = {
  enterToSend: true,
  showTimestamps: true,
  autoScroll: true,
};

const SettingsContext = createContext(null);

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage errors (private browsing, quota, etc.)
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const value = {
    enterToSend: settings.enterToSend,
    showTimestamps: settings.showTimestamps,
    autoScroll: settings.autoScroll,
    setEnterToSend: (next) => updateSetting("enterToSend", next),
    setShowTimestamps: (next) => updateSetting("showTimestamps", next),
    setAutoScroll: (next) => updateSetting("autoScroll", next),
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside a SettingsProvider.");
  }

  return context;
}
