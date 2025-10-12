import { useEffect, useState } from 'react';
import { streamSettings, updateSettings } from '../firebase/api/settings';
import { Settings } from '../types/types-file';

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

    const updateSetting = (field: string, value: any) => {
        updateSettings(field, value);
    };

    return { settingsState, updateSetting };
}