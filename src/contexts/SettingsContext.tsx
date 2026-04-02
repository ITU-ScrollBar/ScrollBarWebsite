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

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settingsState, setSettingsState] = useState<SettingsState>({
    loading: true,
    settings: {} as Settings,
  });

  useEffect(() => {
    setSettingsState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamSettings((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Settings;
        setSettingsState({ loading: false, settings: data });
      } else {
        setSettingsState({ loading: false, settings: {} as Settings });
      }
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
