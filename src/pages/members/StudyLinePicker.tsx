import React, { useState, useEffect, useMemo } from "react";
import type { MenuProps } from 'antd';
import { Dropdown, Space } from 'antd';
import { DownOutlined } from '@ant-design/icons';

import { StudyLine } from "../../types/types-file";
import { getStudyLines } from "../../firebase/api/authentication";

interface StudyLinePickerProps {
  value?: string;
  onChange?: (studyLine: string) => void;
  fontSize?: number;
  bold?: boolean;
  filterStudyLine?: (studyLine: StudyLine) => boolean;
}

export default function StudyLinePicker({
  value,
  onChange,
  fontSize = 16,
  bold = false,
  filterStudyLine,
}: StudyLinePickerProps) {
  const [selectedValue, setSelectedValue] = useState<string | undefined>(value);
  const [studyLines, setStudyLines] = useState<StudyLine[]>([]);

  useEffect(() => {
    getStudyLines().then((response) => {
      const studylines: StudyLine[] = response.map((doc: any) => doc as StudyLine);
      setStudyLines(studylines);
    });
  }, []);

  useEffect(() => {
    setSelectedValue(value);
  }, [value]);

  const visibleStudyLines = useMemo(() => {
    const filtered = filterStudyLine ? studyLines.filter(filterStudyLine) : studyLines;

    return [...filtered].sort((a, b) => {
      const prefixA = (a.prefix ?? "").trim();
      const prefixB = (b.prefix ?? "").trim();
      const hasPrefixA = prefixA.length > 0;
      const hasPrefixB = prefixB.length > 0;

      if (hasPrefixA && !hasPrefixB) return -1;
      if (!hasPrefixA && hasPrefixB) return 1;

      if (hasPrefixA && hasPrefixB) {
        const byPrefix = prefixA.localeCompare(prefixB, undefined, { sensitivity: "base" });
        if (byPrefix !== 0) return byPrefix;
      }

      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
  }, [studyLines, filterStudyLine]);

  const handleMenuClick: MenuProps['onClick'] = (e) => {
    const selectedStudyLine = e.key;
    setSelectedValue(selectedStudyLine);
    if (onChange && selectedStudyLine) {
      onChange(selectedStudyLine);
    }
  };

  const items: MenuProps['items'] = visibleStudyLines.map((sl) => ({
    key: sl.id,
    label: sl.prefix ? `${sl.prefix} in ${sl.name}` : sl.name,
  }));

  const selectedStudyLine = visibleStudyLines.find(sl => sl.id === selectedValue);
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
      <button
        type="button"
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
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
      </button>
    </Dropdown>
  );
}