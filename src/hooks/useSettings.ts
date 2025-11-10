import { useEffect, useState } from 'react';
import { streamSettings, updateSettings, uploadFile } from '../firebase/api/settings';
import { Settings } from '../types/types-file';
import { message } from 'antd';

type SettingsState = {
    loading: boolean;
    settings: Settings;
}

export default function useSettings() {
    const [settingsState, setSettingsState] = useState<SettingsState>({
        loading: true,
        settings: {} as Settings,
    });

    useEffect(() => {
        setSettingsState((prev) => ({ ...prev, loading: true }));
        const unsubscribe = streamSettings((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as Settings;
                setSettingsState((prev) => ({ ...prev, settings: data, loading: false }));
            } else {
                setSettingsState((prev) => ({ ...prev, settings: {} as Settings, loading: false }));
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

    return { settingsState, updateSetting, uploadSettingsFile };
}