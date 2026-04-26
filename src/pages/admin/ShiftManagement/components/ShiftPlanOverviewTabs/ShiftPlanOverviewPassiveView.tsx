import { Table } from "antd";
import { useMemo } from "react";
import type { ColumnType } from "antd/es/table/interface";
import { ShiftPlanningResponse, Tender } from "../../../../../types/types-file";
import {
  ExpandableCell,
  NameFilterControls,
  commentsColumn,
  filterByName,
  nameColumn,
} from "./ShiftPlanOverviewShared";

export type PassiveRow = {
  uid: string;
  tenderRecord: Tender | undefined;
  displayName: string;
  passiveReason: string;
  comments: string;
};

export function usePassiveRows(params: {
  tenders: Tender[];
  responseMap: Map<string, ShiftPlanningResponse>;
}) {
  const { tenders, responseMap } = params;

  return useMemo<PassiveRow[]>(() => {
    return tenders
      .filter((tender) => responseMap.get(tender.uid)?.participationStatus === "passive")
      .map((tender) => ({
        uid: tender.uid,
        tenderRecord: tender,
        displayName: tender.displayName,
        passiveReason: responseMap.get(tender.uid)?.passiveReason ?? "",
        comments: responseMap.get(tender.uid)?.comments ?? "",
      }));
  }, [tenders, responseMap]);
}

type PassiveViewProps = {
  rows: PassiveRow[];
  nameFilter: NameFilterControls;
};

export default function ShiftPlanOverviewPassiveView({ rows, nameFilter }: PassiveViewProps) {
  const columns: ColumnType<PassiveRow>[] = [
    nameColumn<PassiveRow>(nameFilter),
    {
      title: "Reason for being passive",
      dataIndex: "passiveReason",
      key: "passiveReason",
      sorter: (a, b) => a.passiveReason.localeCompare(b.passiveReason),
      render: (value: string) => <ExpandableCell text={value || undefined} />,
    },
    commentsColumn<PassiveRow>(),
  ];

  return (
    <Table<PassiveRow>
      dataSource={filterByName(rows, nameFilter.searchText)}
      columns={columns}
      rowKey="uid"
      size="small"
      pagination={{ pageSize: 50, showSizeChanger: false }}
    />
  );
}
