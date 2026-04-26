import { Table } from "antd";
import { useMemo } from "react";
import type { ColumnType } from "antd/es/table/interface";
import { Engagement, engagementType, Shift, ShiftPlanningResponse, Tender } from "../../../../../types/types-file";
import {
  NameFilterControls,
  commentsColumn,
  filterByName,
  nameColumn,
  numTag,
} from "./ShiftPlanOverviewShared";

export type AssignedRow = {
  uid: string;
  tenderRecord: Tender | undefined;
  displayName: string;
  opening: number;
  middle: number;
  closing: number;
  tenderShifts: number;
  anchorShifts: number;
  total: number;
  comments: string;
};

export function useAssignedRows(params: {
  engagementsByUser: Map<string, Engagement[]>;
  shiftById: Map<string, Shift>;
  tenderMap: Map<string, Tender>;
  responseMap: Map<string, ShiftPlanningResponse>;
}) {
  const { engagementsByUser, shiftById, tenderMap, responseMap } = params;

  return useMemo<AssignedRow[]>(() => {
    return Array.from(engagementsByUser.keys())
      .map((uid) => {
        const userEngagements = engagementsByUser.get(uid) ?? [];
        let opening = 0;
        let middle = 0;
        let closing = 0;
        let tenderShifts = 0;
        let anchorShifts = 0;
        for (const engagement of userEngagements) {
          const category = shiftById.get(engagement.shiftId)?.category;
          if (category === "opening") opening += 1;
          else if (category === "middle") middle += 1;
          else if (category === "closing") closing += 1;

          if (engagement.type === engagementType.TENDER) tenderShifts += 1;
          else if (engagement.type === engagementType.ANCHOR) anchorShifts += 1;
        }

        const tender = tenderMap.get(uid);
        return {
          uid,
          tenderRecord: tender,
          displayName: tender?.displayName ?? uid,
          opening,
          middle,
          closing,
          tenderShifts,
          anchorShifts,
          total: userEngagements.length,
          comments: responseMap.get(uid)?.comments ?? "",
        };
      })
      .filter((row) => row.total > 0);
  }, [engagementsByUser, shiftById, tenderMap, responseMap]);
}

type AssignedViewProps = {
  rows: AssignedRow[];
  nameFilter: NameFilterControls;
};

const numSorter =
  (key: keyof AssignedRow) =>
    (a: AssignedRow, b: AssignedRow) =>
      (a[key] as number) - (b[key] as number);

export default function ShiftPlanOverviewAssignedView({ rows, nameFilter }: AssignedViewProps) {
  const columns: ColumnType<AssignedRow>[] = [
    nameColumn<AssignedRow>(nameFilter),
    {
      title: "Opening",
      dataIndex: "opening",
      key: "opening",
      sorter: numSorter("opening"),
      align: "center",
      render: (value: number) => numTag(value, "blue"),
    },
    {
      title: "Middle",
      dataIndex: "middle",
      key: "middle",
      sorter: numSorter("middle"),
      align: "center",
      render: (value: number) => numTag(value, "cyan"),
    },
    {
      title: "Closing",
      dataIndex: "closing",
      key: "closing",
      sorter: numSorter("closing"),
      align: "center",
      render: (value: number) => numTag(value, "geekblue"),
    },
    {
      title: "Tender shifts",
      dataIndex: "tenderShifts",
      key: "tenderShifts",
      sorter: numSorter("tenderShifts"),
      align: "center",
      render: (value: number) => numTag(value, "green"),
    },
    {
      title: "Anchor shifts",
      dataIndex: "anchorShifts",
      key: "anchorShifts",
      sorter: numSorter("anchorShifts"),
      align: "center",
      render: (value: number) => numTag(value, "gold"),
    },
    commentsColumn<AssignedRow>(),
  ];

  return (
    <Table<AssignedRow>
      dataSource={filterByName(rows, nameFilter.searchText)}
      columns={columns}
      rowKey="uid"
      size="small"
      pagination={{ pageSize: 50, showSizeChanger: false }}
    />
  );
}
