import React, { useState, useEffect } from "react";
import type { MenuProps } from 'antd';
import { Dropdown, Space, Typography } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import { StudyLine } from "../../types/types-file";
import { getStudyLines } from "../../firebase/api/authentication";

interface StudyLinePickerProps {
  value?: string;
  onChange?: (studyLine: string) => void;
  fontSize?: number;
  bold?: boolean;
}

export default function StudyLinePicker({ value, onChange, fontSize = 16, bold = false }: StudyLinePickerProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
  const [studyLines, setStudyLines] = useState<StudyLine[]>([]);

  useEffect(() => {
      getStudyLines().then((response) => {
        const studylines: StudyLine[] = response.map((doc: any) => doc as StudyLine);
        setStudyLines(studylines);
      });
    }, []);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const selectedStudyLine = e.key;
    setSelectedValue(selectedStudyLine);
    if (onChange && selectedStudyLine) {
      onChange(selectedStudyLine);
    }
  };

  const items: MenuProps['items'] = studyLines.map((sl) => ({
    key: sl.id,
    label: sl.prefix ? `${sl.prefix} in ${sl.name}` : sl.name,
  }));

  const selectedStudyLine = studyLines.find(sl => sl.id === selectedValue);
  const displayText = (selectedStudyLine?.prefix ? `${selectedStudyLine.prefix} in ` : "") + (selectedStudyLine?.name || "Select study line");

  return (
    <Dropdown
      menu={{
        items,
        onClick: handleMenuClick,
        selectable: true,
        selectedKeys: selectedValue ? [selectedValue] : [],
      }}
      trigger={['click']}
    >
      <Typography.Link
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: bold ? "bold" : "normal",
          color: "inherit",
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        <Space>
          {displayText}
          <DownOutlined />
        </Space>
      </Typography.Link>
    </Dropdown>
  );
}