"use client";

/**
 * 阅读设置全局状态，供详情页右侧栏与 PoemReader 共用。
 * @author poetry
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "poetry-reading-settings";

export type PoemFont = "song" | "kai" | "calligraphy" | "handwriting" | "artistic";

export interface ReadingSettings {
  variant: "s" | "t";
  font: PoemFont;
  showPinyin: boolean;
  showAnnotation: boolean;
}

const defaultSettings: ReadingSettings = {
  variant: "s",
  font: "song",
  showPinyin: true,
  showAnnotation: true,
};

function loadSettings(): ReadingSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<ReadingSettings>;
    const fontKeys: PoemFont[] = ["song", "kai", "calligraphy", "handwriting", "artistic"];
    const font = parsed.font && fontKeys.includes(parsed.font as PoemFont)
      ? (parsed.font as PoemFont)
      : "song";
    return {
      variant: parsed.variant === "t" ? "t" : "s",
      font,
      showPinyin: parsed.showPinyin !== false,
      showAnnotation: parsed.showAnnotation !== false,
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s: ReadingSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

type SetReadingSettings = <K extends keyof ReadingSettings>(
  key: K,
  value: ReadingSettings[K]
) => void;

const ReadingSettingsContext = createContext<{
  settings: ReadingSettings;
  set: SetReadingSettings;
} | null>(null);

export function ReadingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReadingSettings>(defaultSettings);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const set = useCallback(<K extends keyof ReadingSettings>(
    key: K,
    value: ReadingSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <ReadingSettingsContext.Provider value={{ settings, set }}>
      {children}
    </ReadingSettingsContext.Provider>
  );
}

export function useReadingSettings() {
  const ctx = useContext(ReadingSettingsContext);
  if (!ctx) {
    return {
      settings: defaultSettings,
      set: (() => {}) as SetReadingSettings,
    };
  }
  return ctx;
}
