import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { streamSettings, updateSettings, uploadFile } from "../firebase/api/settings";
import { Settings } from "../types/types-file";

type SettingsState = {
  loading: boolean;
  settings: Settings;
};

type SettingsContextType = {
  settingsState: SettingsState;
  updateSetting: (field: string, displayName: string, value: any) => void;
  uploadSettingsFile: (file: File, settingsKey: string) => Promise<string>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// The last settings doc is kept in localStorage so repeat visits render right
// away (the home page's hero video URL lives here) and refresh from the snapshot.
const CACHE_KEY = "settings";

const readCachedSettings = (): Settings | null => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null");
  } catch {
    return null;
  }
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settingsState, setSettingsState] = useState<SettingsState>(() => {
    const cached = readCachedSettings();
    return { loading: !cached, settings: cached ?? ({} as Settings) };
  });

  useEffect(() => {
    const unsubscribe = streamSettings({
      next: (snapshot) => {
        const data = (snapshot.exists() ? snapshot.data() : {}) as Settings;
        setSettingsState({ loading: false, settings: data });
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        } catch {
          // Storage can be full or blocked; the cache is only a speed-up.
        }
      },
      error: (error) => {
        message.error("An error occurred loading settings: " + error.message);
        setSettingsState((prev) => ({ ...prev, loading: false }));
      },
    });

    return unsubscribe;
  }, []);

  const updateSetting = (field: string, displayName: string, value: any) => {
    updateSettings(field, value);
    message.success(`Updated ${displayName} successfully`);
  };

  const uploadSettingsFile = async (file: File, settingsKey: string): Promise<string> => {
    return uploadFile(file, settingsKey);
  };

  const value = useMemo(
    () => ({
      settingsState,
      updateSetting,
      uploadSettingsFile,
    }),
    [settingsState]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export const useSettingsContext = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
