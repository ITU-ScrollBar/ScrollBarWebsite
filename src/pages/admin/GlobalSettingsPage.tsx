import { useEffect, useRef, useState } from "react";
import useSettings from "../../hooks/useSettings";
import { Input, InputRef, Switch, Table, TableProps } from "antd";
import MDEditor from '@uiw/react-md-editor';
import { Loading } from "../../components/Loading";

type Setting = {
    key: string;
    label: string;
    value: string | boolean;
    inputType?: "text" | "boolean" | "textarea";
}

const EditableCell = ({ value, inputType, onChange }: { value: Setting["value"], inputType?: Setting["inputType"], onChange: (next: Setting["value"]) => void }) => {
    const [editing, setEditing] = useState(false);
    const inputRef = useRef<InputRef>(null);
    const [editValue, setEditValue] = useState("Hello, World!");

    useEffect(() => {
        setEditValue(value as string);
    }, [value]);

    useEffect(() => {
        if (editing) {
            inputRef.current?.focus();
        }
    }, [editing]);

    if (typeof value === 'boolean') {
        return <Switch checked={value} onChange={onChange} />;
    }

    if (editing) {
        if (inputType === "textarea") {
            return (
                <div>
                    <MDEditor.Markdown source={editValue} style={{ background: 'white', color: 'black' }} />
                    <MDEditor value={editValue} preview="edit" onChange={(text) => setEditValue(text ?? "")} onBlur={() => { onChange(editValue); setEditing(false) }} />
                </div>);
        }
        return <Input ref={inputRef} value={value} onBlur={() => setEditing(false)} onChange={(e) => onChange(e.target.value)} />;
    } else {
        if (inputType === "textarea") {
            return (
            <div onClick={() => setEditing(true)}>
                <MDEditor.Markdown source={value} style={{ background: 'white', color: 'black' }} />
            </div>)
        }
        return <div tabIndex={0} role="button" onClick={() => setEditing(true)}>{value}</div>;
    }
    
};

const GlobalSettingsPage = () => {
    const { settingsState, updateSetting } = useSettings();

    const items: Setting[] = [
        { key: 'hero', inputType: 'text', label: 'Link to hero image', value: settingsState.settings.hero },
        { key: 'constitution', inputType: 'text', label: 'Link to constitution', value: settingsState.settings.constitution },
        { key: 'minutes', inputType: 'text', label: 'Link to minutes from last GA', value: settingsState.settings.minutes },
        { key: 'homepageTitle', inputType: 'text', label: 'Homepage title', value: settingsState.settings.homepageTitle },
        { key: 'homepageDescription', inputType: 'textarea', label: 'Homepage description', value: settingsState.settings.homepageDescription },
        { key: 'joinScrollBarLink', inputType: 'text', label: 'Join ScrollBar link', value: settingsState.settings.joinScrollBarLink },
        { key: 'joinScrollBarTitle', inputType: 'text', label: 'Join ScrollBar title', value: settingsState.settings.joinScrollBarTitle },
        { key: 'joinScrollBarText', inputType: 'textarea', label: 'Join ScrollBar text', value: settingsState.settings.joinScrollBarText },
        { key: 'openForSignups', inputType: 'boolean', label: 'Show join ScrollBar section', value: settingsState.settings.openForSignups },
    ];

    const columns: TableProps<Setting>['columns'] = [
        {
            title: 'Key',
            dataIndex: 'label',
            key: 'key',
            width: '15%',
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            render: (value: Setting['value'], record: Setting) => (
                <EditableCell value={value} inputType={record.inputType} onChange={(next) => updateSetting(record.key, record.label, next)} />
            ),
        },
    ];

    if (settingsState.loading) {
        return <Loading />;
    }

    return (
        <div style={{ margin: 20 }}>
            <h1>Global Settings</h1>
            <Table<Setting> rowKey={(record => record.key)} dataSource={items} bordered columns={columns} pagination={false} />
        </div>
    );
};

export default GlobalSettingsPage;