import { Button, Popconfirm, Table } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import type { ColumnType } from "antd/es/table/interface";
import { ShiftPlanningResponse, Tender } from "../../../../../types/types-file";
import {
  NameFilterControls,
  commentsColumn,
  filterByName,
  nameColumn,
} from "./ShiftPlanOverviewShared";

export type LeavingRow = {
  uid: string;
  tenderRecord: Tender | undefined;
  displayName: string;
  comments: string;
};

export function useLeavingRows(params: {
  tenders: Tender[];
  responseMap: Map<string, ShiftPlanningResponse>;
}) {
  const { tenders, responseMap } = params;

  return useMemo<LeavingRow[]>(() => {
    return tenders
      .filter((tender) => responseMap.get(tender.uid)?.participationStatus === "leave")
      .map((tender) => ({
        uid: tender.uid,
        tenderRecord: tender,
        displayName: tender.displayName,
        comments: responseMap.get(tender.uid)?.comments ?? "",
      }));
  }, [tenders, responseMap]);
}

type LeavingViewProps = {
  rows: LeavingRow[];
  nameFilter: NameFilterControls;
  deleteTender: (id: string) => void;
};

export default function ShiftPlanOverviewLeavingView({
  rows,
  nameFilter,
  deleteTender,
}: LeavingViewProps) {
  const columns: ColumnType<LeavingRow>[] = [
    nameColumn<LeavingRow>(nameFilter),
    commentsColumn<LeavingRow>(),
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_: unknown, row: LeavingRow) => (
        <Popconfirm
          title={`Delete ${row.displayName}?`}
          description="The user will be removed from the system."
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

  return (
    <>
      {rows.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <Popconfirm
            title="Delete all leaving members?"
            description={`This will delete ${rows.length} member${rows.length === 1 ? "" : "s"}.`}
            onConfirm={() => rows.forEach((r) => deleteTender(r.uid))}
            okText="Delete all"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>Delete all leaving</Button>
          </Popconfirm>
        </div>
      )}
      <Table<LeavingRow>
        dataSource={filterByName(rows, nameFilter.searchText)}
        columns={columns}
        rowKey="uid"
        size="small"
        pagination={{ pageSize: 50, showSizeChanger: false }}
      />
    </>
  );
}
