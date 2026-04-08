import { useEffect, useRef, useState } from "react";
import useSettings from "../../hooks/useSettings";
import { Button, Input, InputRef, message, Switch, Table, TableProps, Upload } from "antd";
import MDEditor from "@uiw/react-md-editor";
import { Loading } from "../../components/Loading";
import { useWindowSize } from "../../hooks/useWindowSize";
import { formatWindowDate, fromDateTimeInputValue, toDateTimeInputValue } from "../../utils/signupWindow";

type Setting = {
  key: string;
  label: string;
  value: string | boolean;
  inputType?: "text" | "boolean" | "textarea" | "upload" | "datetime";
};

const EditableCell = ({
  value,
  inputType,
  onChange,
  settingKey,
  uploadSettingsFile,
}: {
  value: Setting["value"];
  inputType?: Setting["inputType"];
  onChange: (next: Setting["value"]) => void;
  settingKey: string;
  uploadSettingsFile: (file: File, settingsKey: string) => Promise<string>;
}) => {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<InputRef>(null);
  const [editValue, setEditValue] = useState("");
  const [dateTimeDraft, setDateTimeDraft] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setEditValue(typeof value === "string" ? value : "");
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    if (inputType === "datetime") {
      setDateTimeDraft(toDateTimeInputValue(editValue));
    }
  }, [editValue, inputType]);

  if (typeof value === "boolean") {
    return <Switch checked={value} onChange={onChange} />;
  }

  const onBlur = () => {
    onChange(editValue);
    setEditing(false);
  };

  if (editing) {
    if (inputType === "textarea") {
      return (
        <div>
          <MDEditor.Markdown
            source={editValue}
            style={{ background: "white", color: "black", textWrap: "wrap" }}
          />
          <MDEditor
            value={editValue}
            preview="edit"
            onChange={(text) => setEditValue(text ?? "")}
            onBlur={onBlur}
          />
        </div>
      );
    }
    if (inputType === "datetime") {
      return (
        <Input
          ref={inputRef}
          type="datetime-local"
          value={dateTimeDraft}
          onBlur={() => {
            onChange(fromDateTimeInputValue(dateTimeDraft));
            setEditing(false);
          }}
          onChange={(event) => setDateTimeDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      );
    }
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onBlur={onBlur}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    );
  } else {
    if (inputType === "datetime") {
      return (
        <div
          tabIndex={0}
          style={{ textWrap: "wrap" }}
          role="button"
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setEditing(true);
            }
          }}
        >
          {formatWindowDate(value ? new Date(value) : null)}
        </div>
      );
    }
    if (inputType === "textarea") {
      return (
        <div
          tabIndex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              setEditing(true);
            }
          }}
        >
          <MDEditor.Markdown
            source={value.trim().length > 0 ? value.trim() : "Click to edit"}
            style={{ background: "white", color: "black", textWrap: "wrap" }}
          />
        </div>
      );
    } else if (inputType === "upload") {
      return (
        <Upload
          customRequest={({file}) => {
            setUploading(true);
            uploadSettingsFile(file as File, settingKey)
              .then((url) => {
                onChange(url);
              })
              .catch(() => {
                message.error("Failed to upload file");
              })
              .finally(() => {
                setUploading(false);
              });
          }}
          showUploadList={false}
        >
          <Button type="primary" loading={uploading}>
            {"Upload File"}
          </Button>
        </Upload>
      )
    }
    return (
      <div
        tabIndex={0}
        style={{ textWrap: "wrap" }}
        role="button"
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setEditing(true);
          }
        }}
      >
        {value.trim().length > 0 ? value.trim() : "Click to edit"}
      </div>
    );
  }
};

const GlobalSettingsPage = () => {
  const { settingsState, updateSetting, uploadSettingsFile } = useSettings();
  const { isMobile } = useWindowSize();

  const items: Setting[] = [
    {
      key: "hero",
      inputType: "upload",
      label: "Link to hero image",
      value: settingsState.settings.hero,
    },
    {
      key: "constitution",
      inputType: "upload",
      label: "Link to constitution",
      value: settingsState.settings.constitution,
    },
    {
      key: "minutes",
      inputType: "upload",
      label: "Link to minutes from last GA",
      value: settingsState.settings.minutes,
    },
    {
      key: "homepageTitle",
      inputType: "text",
      label: "Homepage title",
      value: settingsState.settings.homepageTitle,
    },
    {
      key: "homepageDescription",
      inputType: "textarea",
      label: "Homepage description",
      value: settingsState.settings.homepageDescription,
    },
    {
      key: "getHelpTitle",
      inputType: "text",
      label: "Get help page title",
      value: settingsState.settings.getHelpTitle,
    },
    {
      key: "getHelpDescription",
      inputType: "textarea",
      label: "Get help page description",
      value: settingsState.settings.getHelpDescription,
    },
    {
      key: "joinScrollBarTitle",
      inputType: "text",
      label: "Join ScrollBar title",
      value: settingsState.settings.joinScrollBarTitle,
    },
    {
      key: "joinScrollBarText",
      inputType: "textarea",
      label: "Join ScrollBar text",
      value: settingsState.settings.joinScrollBarText,
    },
    {
      key: "inviteEmailBodyText",
      inputType: "textarea",
      label: "Invite email body text",
      value: settingsState.settings.inviteEmailBodyText || "",
    },
    {
      key: "rejectionEmailBodyText",
      inputType: "textarea",
      label: "Rejection email body text",
      value: settingsState.settings.rejectionEmailBodyText || "",
    },
    {
      key: "applicationSubmittedEmailBodyText",
      inputType: "textarea",
      label: "Application submitted email body text",
      value: settingsState.settings.applicationSubmittedEmailBodyText || "",
    },
    {
      key: "openForSignupsStart",
      inputType: "datetime",
      label: "Signups open from",
      value: settingsState.settings.openForSignupsStart || "",
    },
    {
      key: "openForSignupsEnd",
      inputType: "datetime",
      label: "Signups open until",
      value: settingsState.settings.openForSignupsEnd || "",
    },
  ];

  const columns: TableProps<Setting>["columns"] = [
    {
      title: "Key",
      dataIndex: "label",
      key: "key",
      width: isMobile ? "40%" : "15%",
    },
    {
      title: "Value",
      dataIndex: "value",
      key: "value",
      render: (value: Setting["value"], record: Setting) => (
        <EditableCell
          value={value}
          inputType={record.inputType}
          onChange={(next) => updateSetting(record.key, record.label, next)}
          settingKey={record.key}
          uploadSettingsFile={uploadSettingsFile}
        />
      ),
      ellipsis: isMobile,
    },
  ];

  if (settingsState.loading) {
    return <Loading />;
  }

  return (
    <div style={{ margin: 20 }}>
      <h1>Global Settings</h1>
      <Table<Setting>
        rowKey={(record) => record.key}
        dataSource={items}
        bordered
        columns={columns}
        pagination={false}
      />
    </div>
  );
};

export default GlobalSettingsPage;
