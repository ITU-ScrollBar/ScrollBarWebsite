import { useEffect, useMemo, useState } from "react";
import { App as AntdApp, Alert, Drawer, Grid, Segmented, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CommentOutlined } from "@ant-design/icons";
import { Loading } from "../../../../components/Loading";
import useLendingRequests from "../../../../hooks/useLendingRequests";
import { LendingRequest, LendingRequestStatus } from "../../../../types/types-file";
import {
  describeEquipment,
  formatFormDate,
  lendingStatusColors,
  lendingStatusLabels,
} from "../../../../utils/formResponses";
import { TenderLookup, tenderName } from "../types";
import LendingRequestDetails from "./LendingRequestDetails";

const { Text } = Typography;

type StatusFilter = "all" | LendingRequestStatus;

type LendingRequestsTabProps = {
  tenders: TenderLookup;
};

const statusFilterOptions = [
  { label: "All", value: "all" as const },
  { label: "Pending", value: "pending" as const },
  { label: "Approved", value: "approved" as const },
  { label: "Declined", value: "declined" as const },
];

export default function LendingRequestsTab({ tenders }: LendingRequestsTabProps) {
  const { message } = AntdApp.useApp();
  const { lendingState, setLendingDecision, addComment, deleteComment, deleteLendingRequest } =
    useLendingRequests();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (!lendingState.error) {
      return;
    }

    message.error("Unable to load lending requests: " + lendingState.error);
  }, [message, lendingState.error]);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "all") {
      return lendingState.requests;
    }

    return lendingState.requests.filter((request) => request.status === statusFilter);
  }, [lendingState.requests, statusFilter]);

  // Derived from the loaded list so the drawer follows every background refresh.
  const selectedRequest = useMemo(() => {
    return lendingState.requests.find((request) => request.id === selectedId) ?? null;
  }, [lendingState.requests, selectedId]);

  const columns = useMemo<ColumnsType<LendingRequest & { key: string }>>(() => {
    const allColumns: ColumnsType<LendingRequest & { key: string }> = [
      {
        title: "Equipment",
        key: "equipment",
        render: (_value, request) => <Text strong>{describeEquipment(request)}</Text>,
      },
      {
        title: "Requested by",
        key: "requestedBy",
        responsive: ["md"],
        render: (_value, request) => tenderName(tenders, request.createdByUid),
      },
      {
        title: "Occasion",
        dataIndex: "occasion",
        key: "occasion",
        responsive: ["lg"],
        ellipsis: true,
      },
      {
        title: "Pick-up",
        key: "pickupAt",
        render: (_value, request) => formatFormDate(request.pickupAt),
      },
      {
        title: "Return",
        key: "returnAt",
        responsive: ["md"],
        render: (_value, request) => formatFormDate(request.returnAt),
      },
      {
        title: "Status",
        key: "status",
        render: (_value, request) => (
          <Space size={6} wrap>
            <Tag color={lendingStatusColors[request.status]}>
              {lendingStatusLabels[request.status]}
            </Tag>
            <Text type="secondary">{request.approvedByUids.length}/2</Text>
          </Space>
        ),
      },
      {
        title: <CommentOutlined aria-label="Comments" />,
        key: "comments",
        responsive: ["md"],
        render: (_value, request) => request.comments.length,
      },
    ];

    return allColumns;
  }, [tenders]);

  if (lendingState.loading && !lendingState.isLoaded) {
    return <Loading />;
  }

  return (
    <div>
      {lendingState.error ? (
        <Alert
          type="error"
          showIcon
          message="Could not load lending requests"
          description={lendingState.error}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Segmented
        options={statusFilterOptions}
        value={statusFilter}
        onChange={(value) => setStatusFilter(value as StatusFilter)}
        style={{ marginBottom: 16 }}
      />

      <Table<LendingRequest & { key: string }>
        columns={columns}
        dataSource={filteredRequests}
        rowKey="id"
        loading={lendingState.loading}
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        onRow={(request) => ({
          onClick: () => setSelectedId(request.id),
          style: { cursor: "pointer" },
        })}
        locale={{ emptyText: "No lending requests yet" }}
      />

      <Drawer
        title={selectedRequest ? describeEquipment(selectedRequest) : "Lending request"}
        open={Boolean(selectedRequest)}
        size={isMobile ? "default" : "large"}
        onClose={() => setSelectedId(null)}
        destroyOnClose
      >
        {selectedRequest ? (
          <LendingRequestDetails
            request={selectedRequest}
            tenders={tenders}
            onDecision={(decision) => setLendingDecision(selectedRequest.id, decision)}
            onDelete={async () => {
              await deleteLendingRequest(selectedRequest.id);
              setSelectedId(null);
            }}
            onAddComment={(body) => addComment(selectedRequest.id, body)}
            onDeleteComment={(commentId) => deleteComment(selectedRequest.id, commentId)}
          />
        ) : null}
      </Drawer>
    </div>
  );
}
