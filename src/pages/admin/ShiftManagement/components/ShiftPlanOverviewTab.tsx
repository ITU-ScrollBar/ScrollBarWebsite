import { useRef, useState, useMemo } from "react";
import { Button, Input, InputRef, Popconfirm, Segmented, Space, Table, Tag } from "antd";
import type { ColumnType, FilterDropdownProps } from "antd/es/table/interface";
import { DeleteOutlined, SearchOutlined } from "@ant-design/icons";
import { useEngagementContext } from "../../../../contexts/EngagementContext";
import { UserAvatar } from "../../../../components/UserAvatar";
import {
  engagementType,
  Shift,
  ShiftPlanningPeriod,
  ShiftPlanningResponse,
  Tender,
} from "../../../../types/types-file";

type ViewKey = "assigned" | "passive" | "legacy" | "leaving";

function ExpandableCell({ text }: { text?: string }) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  if (!text) return <span style={{ color: "#bbb" }}>—</span>;
  return (
    <div
      ref={ref}
      tabIndex={0}
      onClick={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      style={
        expanded
          ? { whiteSpace: "pre-wrap", outline: "none", cursor: "default" }
          : { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", maxWidth: 240 }
      }
    >
      {text}
    </div>
  );
}

function numTag(val: number, color: string) {
  return val > 0 ? <Tag color={color}>{val}</Tag> : <span style={{ color: "#bbb" }}>0</span>;
}

function useNameFilter() {
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

function nameColumn<T extends { displayName: string; tenderRecord: Tender | undefined }>(
  filter: ReturnType<typeof useNameFilter>
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

function commentsColumn<T extends { comments: string }>(): ColumnType<T> {
  return {
    title: "Any other comments",
    dataIndex: "comments",
    key: "comments",
    sorter: (a, b) => a.comments.localeCompare(b.comments),
    render: (val: string) => <ExpandableCell text={val || undefined} />,
  };
}

type Props = {
  selectedPeriod: ShiftPlanningPeriod;
  periodShifts: Shift[];
  tenders: Tender[];
  responses: ShiftPlanningResponse[];
  deleteTender: (id: string) => void;
};

export default function ShiftPlanOverviewTab({
  periodShifts,
  tenders,
  responses,
  deleteTender,
}: Props) {
  const { engagementState } = useEngagementContext();
  const [view, setView] = useState<ViewKey>("assigned");
  const nameFilter = useNameFilter();

  const periodShiftIds = useMemo(() => new Set(periodShifts.map((s) => s.id)), [periodShifts]);
  const shiftById = useMemo(() => new Map(periodShifts.map((s) => [s.id, s])), [periodShifts]);

  const periodEngagements = useMemo(
    () => engagementState.engagements.filter((e) => periodShiftIds.has(e.shiftId)),
    [engagementState.engagements, periodShiftIds]
  );

  const engagementsByUser = useMemo(() => {
    const map = new Map<string, typeof periodEngagements>();
    for (const eng of periodEngagements) {
      if (!eng.userId) continue;
      const list = map.get(eng.userId) ?? [];
      list.push(eng);
      map.set(eng.userId, list);
    }
    return map;
  }, [periodEngagements]);

  const tenderMap = useMemo(() => new Map(tenders.map((t) => [t.uid, t])), [tenders]);
  const responseMap = useMemo(
    () => new Map(responses.map((r) => [r.userId, r])),
    [responses]
  );

  function filterName<T extends { displayName: string }>(rows: T[]): T[] {
    if (!nameFilter.searchText) return rows;
    const lower = nameFilter.searchText.toLowerCase();
    return rows.filter((r) => r.displayName.toLowerCase().includes(lower));
  }

  // ── View 1: Assigned ────────────────────────────────────────────────────────
  type AssignedRow = {
    uid: string; tenderRecord: Tender | undefined; displayName: string;
    opening: number; middle: number; closing: number;
    tenderShifts: number; anchorShifts: number; total: number; comments: string;
  };

  const assignedRows = useMemo<AssignedRow[]>(() => {
    return Array.from(engagementsByUser.keys()).map((uid) => {
      const userEngs = engagementsByUser.get(uid) ?? [];
      let opening = 0, middle = 0, closing = 0, tenderShifts = 0, anchorShifts = 0;
      for (const eng of userEngs) {
        const cat = shiftById.get(eng.shiftId)?.category;
        if (cat === "opening") opening += 1;
        else if (cat === "middle") middle += 1;
        else if (cat === "closing") closing += 1;
        if (eng.type === engagementType.TENDER) tenderShifts += 1;
        else if (eng.type === engagementType.ANCHOR) anchorShifts += 1;
      }
      const tender = tenderMap.get(uid);
      return {
        uid,
        tenderRecord: tender,
        displayName: tender?.displayName ?? uid,
        opening, middle, closing, tenderShifts, anchorShifts,
        total: userEngs.length,
        comments: responseMap.get(uid)?.comments ?? "",
      };
    }).filter((r) => r.total > 0);
  }, [engagementsByUser, shiftById, tenderMap, responseMap]);

  const numSorter = (key: keyof AssignedRow) =>
    (a: AssignedRow, b: AssignedRow) => (a[key] as number) - (b[key] as number);

  const assignedColumns: ColumnType<AssignedRow>[] = [
    nameColumn<AssignedRow>(nameFilter),
    { title: "Opening", dataIndex: "opening", key: "opening", sorter: numSorter("opening"), align: "center", render: (v: number) => numTag(v, "blue") },
    { title: "Middle", dataIndex: "middle", key: "middle", sorter: numSorter("middle"), align: "center", render: (v: number) => numTag(v, "cyan") },
    { title: "Closing", dataIndex: "closing", key: "closing", sorter: numSorter("closing"), align: "center", render: (v: number) => numTag(v, "geekblue") },
    { title: "Tender shifts", dataIndex: "tenderShifts", key: "tenderShifts", sorter: numSorter("tenderShifts"), align: "center", render: (v: number) => numTag(v, "green") },
    { title: "Anchor shifts", dataIndex: "anchorShifts", key: "anchorShifts", sorter: numSorter("anchorShifts"), align: "center", render: (v: number) => numTag(v, "gold") },
    commentsColumn<AssignedRow>(),
  ];

  // ── View 2: Passive ─────────────────────────────────────────────────────────
  type PassiveRow = { uid: string; tenderRecord: Tender | undefined; displayName: string; passiveReason: string; comments: string };

  const passiveRows = useMemo<PassiveRow[]>(() => {
    return tenders
      .filter((t) => responseMap.get(t.uid)?.participationStatus === "passive")
      .map((t) => ({
        uid: t.uid, tenderRecord: t, displayName: t.displayName,
        passiveReason: responseMap.get(t.uid)?.passiveReason ?? "",
        comments: responseMap.get(t.uid)?.comments ?? "",
      }));
  }, [tenders, responseMap]);

  const passiveColumns: ColumnType<PassiveRow>[] = [
    nameColumn<PassiveRow>(nameFilter),
    { title: "Reason for being passive", dataIndex: "passiveReason", key: "passiveReason", sorter: (a, b) => a.passiveReason.localeCompare(b.passiveReason), render: (v: string) => <ExpandableCell text={v || undefined} /> },
    commentsColumn<PassiveRow>(),
  ];

  // ── View 3: Legacy ──────────────────────────────────────────────────────────
  type LegacyRow = { uid: string; tenderRecord: Tender | undefined; displayName: string; privateEmail: string; comments: string };

  const legacyRows = useMemo<LegacyRow[]>(() => {
    return tenders
      .filter((t) => responseMap.get(t.uid)?.participationStatus === "legacy")
      .map((t) => ({
        uid: t.uid, tenderRecord: t, displayName: t.displayName,
        privateEmail: responseMap.get(t.uid)?.privateEmail ?? "",
        comments: responseMap.get(t.uid)?.comments ?? "",
      }));
  }, [tenders, responseMap]);

  const legacyColumns: ColumnType<LegacyRow>[] = [
    nameColumn<LegacyRow>(nameFilter),
    { title: "Private email for Teams", dataIndex: "privateEmail", key: "privateEmail", sorter: (a, b) => a.privateEmail.localeCompare(b.privateEmail), render: (v: string) => v || <span style={{ color: "#bbb" }}>—</span> },
    commentsColumn<LegacyRow>(),
  ];

  // ── View 4: Leaving ─────────────────────────────────────────────────────────
  type LeavingRow = { uid: string; tenderRecord: Tender | undefined; displayName: string; comments: string };

  const leavingRows = useMemo<LeavingRow[]>(() => {
    return tenders
      .filter((t) => responseMap.get(t.uid)?.participationStatus === "leave")
      .map((t) => ({
        uid: t.uid, tenderRecord: t, displayName: t.displayName,
        comments: responseMap.get(t.uid)?.comments ?? "",
      }));
  }, [tenders, responseMap]);

  const leavingColumns: ColumnType<LeavingRow>[] = [
    nameColumn<LeavingRow>(nameFilter),
    commentsColumn<LeavingRow>(),
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_: unknown, row: LeavingRow) => (
        <Popconfirm
          title={`Delete ${row.displayName}?`}
          description="This is a soft delete. The user will be removed from the system."
          onConfirm={() => deleteTender(row.uid)}
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button size="small" danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  const filteredLeaving = filterName(leavingRows);

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Segmented<ViewKey>
          value={view}
          onChange={setView}
          options={[
            { label: `Assigned (${assignedRows.length})`, value: "assigned" },
            { label: `Passive (${passiveRows.length})`, value: "passive" },
            { label: `Legacy (${legacyRows.length})`, value: "legacy" },
            { label: `Leaving (${leavingRows.length})`, value: "leaving" },
          ]}
        />
        {view === "leaving" && leavingRows.length > 0 && (
          <Popconfirm
            title="Delete all leaving members?"
            description={`This will soft-delete ${leavingRows.length} member${leavingRows.length === 1 ? "" : "s"}.`}
            onConfirm={() => leavingRows.forEach((r) => deleteTender(r.uid))}
            okText="Delete all"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>Delete all leaving</Button>
          </Popconfirm>
        )}
      </div>

      {view === "assigned" && (
        <Table<AssignedRow>
          dataSource={filterName(assignedRows)}
          columns={assignedColumns}
          rowKey="uid"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      )}
      {view === "passive" && (
        <Table<PassiveRow>
          dataSource={filterName(passiveRows)}
          columns={passiveColumns}
          rowKey="uid"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      )}
      {view === "legacy" && (
        <Table<LegacyRow>
          dataSource={filterName(legacyRows)}
          columns={legacyColumns}
          rowKey="uid"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      )}
      {view === "leaving" && (
        <Table<LeavingRow>
          dataSource={filteredLeaving}
          columns={leavingColumns}
          rowKey="uid"
          size="small"
          pagination={{ pageSize: 50, showSizeChanger: false }}
        />
      )}
    </Space>
  );
}
