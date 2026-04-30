import { Table } from "antd";
import { useMemo } from "react";
import type { ColumnType } from "antd/es/table/interface";
import { ShiftPlanningResponse, Tender } from "../../../../../types/types-file";
import {
  NameFilterControls,
  commentsColumn,
  filterByName,
  nameColumn,
} from "./ShiftPlanOverviewShared";

export type LegacyRow = {
  uid: string;
  tenderRecord: Tender | undefined;
  displayName: string;
  privateEmail: string;
  comments: string;
};

export function useLegacyRows(params: {
  tenders: Tender[];
  responseMap: Map<string, ShiftPlanningResponse>;
}) {
  const { tenders, responseMap } = params;

  return useMemo<LegacyRow[]>(() => {
    return tenders
      .filter((tender) => responseMap.get(tender.uid)?.participationStatus === "legacy")
      .map((tender) => ({
        uid: tender.uid,
        tenderRecord: tender,
        displayName: tender.displayName,
        privateEmail: responseMap.get(tender.uid)?.privateEmail ?? "",
        comments: responseMap.get(tender.uid)?.comments ?? "",
      }));
  }, [tenders, responseMap]);
}

type LegacyViewProps = {
  rows: LegacyRow[];
  nameFilter: NameFilterControls;
};

export default function ShiftPlanOverviewLegacyView({ rows, nameFilter }: LegacyViewProps) {
  const columns: ColumnType<LegacyRow>[] = [
    nameColumn<LegacyRow>(nameFilter),
    {
      title: "Private email for Teams",
      dataIndex: "privateEmail",
      key: "privateEmail",
      sorter: (a, b) => a.privateEmail.localeCompare(b.privateEmail),
      render: (value: string) => value || <span style={{ color: "#bbb" }}>—</span>,
    },
    commentsColumn<LegacyRow>(),
  ];

  return (
    <Table<LegacyRow>
      dataSource={filterByName(rows, nameFilter.searchText)}
      columns={columns}
      rowKey="uid"
      size="small"
      pagination={{ pageSize: 50, showSizeChanger: false }}
    />
  );
}
