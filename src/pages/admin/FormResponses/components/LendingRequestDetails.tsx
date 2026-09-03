import { useState } from "react";
import { App as AntdApp, Alert, Button, Descriptions, Popconfirm, Space, Tag, Typography } from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  RedoOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  LENDING_REQUIRED_APPROVALS,
  LendingDecision,
  LendingRequest,
} from "../../../../types/types-file";
import {
  describeEquipment,
  formatFormDate,
  formatFormDateTime,
  lendingStatusColors,
  lendingStatusLabels,
} from "../../../../utils/formResponses";
import { TenderLookup, tenderName } from "../types";
import FormCommentThread from "./FormCommentThread";

const { Text } = Typography;

type LendingRequestDetailsProps = {
  request: LendingRequest;
  tenders: TenderLookup;
  onDecision: (decision: LendingDecision) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
};

export default function LendingRequestDetails({
  request,
  tenders,
  onDecision,
  onDelete,
  onAddComment,
  onDeleteComment,
}: LendingRequestDetailsProps) {
  const { message } = AntdApp.useApp();
  const { currentUser } = useAuth();
  const [busy, setBusy] = useState(false);

  const requester = tenders.resolve(request.createdByUid);
  const hasApproved = Boolean(currentUser?.uid && request.approvedByUids.includes(currentUser.uid));
  const missingApprovals = Math.max(LENDING_REQUIRED_APPROVALS - request.approvedByUids.length, 0);

  const runDecision = async (decision: LendingDecision, successMessage: string) => {
    setBusy(true);
    try {
      await onDecision(decision);
      message.success(successMessage);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update the request.";
      message.error(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const deleteRequest = async () => {
    setBusy(true);
    try {
      await onDelete();
      message.success("Request deleted.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete request.";
      message.error(errorMessage);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Space orientation="vertical" size={18} style={{ width: "100%" }}>
      <Space wrap>
        <Tag color={lendingStatusColors[request.status]}>{lendingStatusLabels[request.status]}</Tag>
        <Text type="secondary">
          {request.approvedByUids.length} of {LENDING_REQUIRED_APPROVALS} approvals
        </Text>
      </Space>

      {request.status === "declined" ? (
        <Alert
          type="error"
          showIcon
          message={`Declined by ${tenderName(tenders, request.declinedByUid)}`}
          description="Declining cleared the approvals. Reopen it if the board wants to reconsider — it will need two fresh approvals."
        />
      ) : null}

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Equipment">{describeEquipment(request)}</Descriptions.Item>
        <Descriptions.Item label="Requested by">
          {tenderName(tenders, request.createdByUid)}
        </Descriptions.Item>
        <Descriptions.Item label="Email">
          {requester?.email ? (
            <Typography.Link href={`mailto:${requester.email}`}>{requester.email}</Typography.Link>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Occasion">
          <span style={{ whiteSpace: "pre-wrap" }}>{request.occasion}</span>
        </Descriptions.Item>
        <Descriptions.Item label="Pick-up">{formatFormDate(request.pickupAt)}</Descriptions.Item>
        <Descriptions.Item label="Return">{formatFormDate(request.returnAt)}</Descriptions.Item>
        <Descriptions.Item label="Accepted responsibility">
          {request.responsibilityAccepted ? "Yes" : "No"}
        </Descriptions.Item>
        <Descriptions.Item label="Anything else">
          {request.additionalInfo?.trim() ? (
            <span style={{ whiteSpace: "pre-wrap" }}>{request.additionalInfo}</span>
          ) : (
            <Text type="secondary">-</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Submitted">
          {formatFormDateTime(request.createdAt)}
        </Descriptions.Item>
      </Descriptions>

      <div>
        <Text strong>Board approvals</Text>
        <div style={{ marginTop: 8 }}>
          {request.approvedByUids.length === 0 ? (
            <Text type="secondary">Nobody has approved this yet.</Text>
          ) : (
            <Space wrap>
              {request.approvedByUids.map((uid) => (
                <Tag color="green" key={uid} icon={<CheckCircleOutlined />}>
                  {tenderName(tenders, uid)}
                </Tag>
              ))}
            </Space>
          )}
        </div>
        {request.status === "pending" ? (
          <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
            {missingApprovals} more approval{missingApprovals === 1 ? "" : "s"} needed before the
            equipment can be lent out.
          </Text>
        ) : null}
      </div>

      <Space wrap>
        {/* A declined request cannot be approved directly; it has to be reopened first, which is
            why the approve action disappears entirely while the decline stands. */}
        {request.status === "declined" ? (
          <Button
            type="primary"
            icon={<RedoOutlined />}
            loading={busy}
            onClick={() => {
              void runDecision("reopen", "Request reopened. It needs two fresh approvals.");
            }}
          >
            Reopen for review
          </Button>
        ) : (
          <>
            {hasApproved ? (
              <Button
                icon={<UndoOutlined />}
                loading={busy}
                onClick={() => {
                  void runDecision("withdraw", "Approval withdrawn.");
                }}
              >
                Withdraw my approval
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={busy}
                onClick={() => {
                  void runDecision("approve", "Request approved.");
                }}
              >
                Approve
              </Button>
            )}

            <Popconfirm
              title="Decline this request?"
              description="Any approvals given so far are cleared. Reopening it later starts the two approvals over."
              okText="Decline"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => {
                void runDecision("decline", "Request declined.");
              }}
            >
              <Button danger icon={<CloseCircleOutlined />} disabled={busy}>
                Decline
              </Button>
            </Popconfirm>
          </>
        )}

        <Popconfirm
          title="Delete this request?"
          description="This permanently removes the request and its comments."
          okText="Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
          onConfirm={() => {
            void deleteRequest();
          }}
        >
          <Button danger type="text" disabled={busy}>
            Delete request
          </Button>
        </Popconfirm>
      </Space>

      <FormCommentThread
        comments={request.comments}
        tenders={tenders}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
      />
    </Space>
  );
}
