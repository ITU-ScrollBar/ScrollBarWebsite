import { Button, Input, InputRef, Space, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { useRef, useState } from "react";
import type { ColumnType, FilterDropdownProps } from "antd/es/table/interface";
import { UserAvatar } from "../../../../../components/UserAvatar";
import { Tender } from "../../../../../types/types-file";

export function ExpandableCell({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!text) return <span style={{ color: "#bbb" }}>—</span>;
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      onClick={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((prev) => !prev);
        }
      }}
      style={
        expanded
          ? { whiteSpace: "pre-wrap", outline: "none", cursor: "default" }
          : {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
            maxWidth: 240,
          }
      }
    >
      {text}
    </div>
  );
}

export function numTag(val: number, color: string) {
  return val > 0 ? <Tag color={color}>{val}</Tag> : <span style={{ color: "#bbb" }}>0</span>;
}

export function useNameFilter() {
  const searchInput = useRef<InputRef>(null);
  const [searchText, setSearchText] = useState("");

  const filterDropdown = ({ confirm }: FilterDropdownProps) => (
    <div style={{ padding: 8 }}>
      <Input
        ref={searchInput}
        placeholder="Search name"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        onPressEnter={() => confirm()}
        style={{ display: "block", marginBottom: 8 }}
      />
      <Space>
        <Button type="primary" icon={<SearchOutlined />} size="small" onClick={() => confirm()}>
          Search
        </Button>
        <Button size="small" onClick={() => { setSearchText(""); confirm(); }}>
          Reset
        </Button>
      </Space>
    </div>
  );

  const filterIcon = <SearchOutlined style={{ color: searchText ? "#1890ff" : undefined }} />;
  const onOpenChange = (open: boolean) => {
    if (open) setTimeout(() => searchInput.current?.select(), 100);
  };

  return { searchText, filterDropdown, filterIcon, onOpenChange };
}

export type NameFilterControls = ReturnType<typeof useNameFilter>;

export function filterByName<T extends { displayName: string }>(rows: T[], searchText: string): T[] {
  if (!searchText) return rows;
  const lower = searchText.toLowerCase();
  return rows.filter((row) => row.displayName.toLowerCase().includes(lower));
}

export function nameColumn<T extends { displayName: string; tenderRecord: Tender | undefined }>(
  filter: NameFilterControls
): ColumnType<T> {
  return {
    title: "Tender",
    dataIndex: "displayName",
    key: "displayName",
    filterDropdown: filter.filterDropdown,
    filterIcon: filter.filterIcon,
    onFilterDropdownOpenChange: filter.onOpenChange,
    sorter: (a, b) => a.displayName.localeCompare(b.displayName),
    render: (_: unknown, row: T) => (
      <Space size="small">
        {row.tenderRecord && <UserAvatar user={row.tenderRecord} size={24} showHats={false} />}
        <span>{row.displayName}</span>
      </Space>
    ),
  };
}

export function commentsColumn<T extends { comments: string }>(): ColumnType<T> {
  return {
    title: "Any other comments",
    dataIndex: "comments",
    key: "comments",
    sorter: (a, b) => a.comments.localeCompare(b.comments),
    render: (val: string) => <ExpandableCell text={val || undefined} />,
  };
}
