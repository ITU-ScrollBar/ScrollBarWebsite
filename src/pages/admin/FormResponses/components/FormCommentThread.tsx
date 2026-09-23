import { useState } from "react";
import { App as AntdApp, Button, Empty, Input, List, Popconfirm, Space, Typography } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { UserAvatar } from "../../../../components/UserAvatar";
import { useAuth } from "../../../../contexts/AuthContext";
import { FormComment } from "../../../../types/types-file";
import { formatFormDateTime } from "../../../../utils/formResponses";
import { TenderLookup, tenderName } from "../types";

const { TextArea } = Input;
const { Text } = Typography;

type FormCommentThreadProps = {
  comments: FormComment[];
  tenders: TenderLookup;
  onAddComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
};

/** Board-only discussion thread shared by lending requests and anonymous feedback. */
export default function FormCommentThread({
  comments,
  tenders,
  onAddComment,
  onDeleteComment,
}: FormCommentThreadProps) {
  const { message } = AntdApp.useApp();
  const { currentUser } = useAuth();
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const submitComment = async () => {
    const body = draft.trim();
    if (!body) {
      return;
    }

    setSubmitting(true);
    try {
      await onAddComment(body);
      setDraft("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add comment.";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    setDeletingId(commentId);
    try {
      await onDeleteComment(commentId);
      message.success("Comment deleted.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete comment.";
      message.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <Text strong>Comments ({comments.length})</Text>
      {comments.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No comments yet"
          style={{ margin: "12px 0" }}
        />
      ) : (
        <List
          dataSource={comments}
          style={{ marginTop: 8 }}
          renderItem={(comment) => {
            const author = tenders.resolve(comment.authorUid);
            const isOwnComment = Boolean(
              comment.authorUid && comment.authorUid === currentUser?.uid
            );

            return (
              <List.Item
                key={comment.id}
                actions={
                  isOwnComment
                    ? [
                      <Popconfirm
                        key="delete"
                        title="Delete this comment?"
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => {
                          void deleteComment(comment.id);
                        }}
                      >
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          loading={deletingId === comment.id}
                          aria-label="Delete comment"
                        />
                      </Popconfirm>,
                    ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={author ? <UserAvatar user={author} size={32} /> : undefined}
                  title={
                    <Space size={8} wrap>
                      <Text strong>{tenderName(tenders, comment.authorUid)}</Text>
                      <Text type="secondary">{formatFormDateTime(comment.createdAt)}</Text>
                    </Space>
                  }
                  description={
                    <span style={{ whiteSpace: "pre-wrap", color: "rgba(0, 0, 0, 0.88)" }}>
                      {comment.body}
                    </span>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      <TextArea
        rows={3}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Write a comment for the rest of the board"
        maxLength={1500}
        showCount
        style={{ marginTop: 12 }}
      />
      <Button
        type="primary"
        style={{ marginTop: 8 }}
        loading={submitting}
        disabled={!draft.trim()}
        onClick={() => {
          void submitComment();
        }}
      >
        Add comment
      </Button>
    </div>
  );
}
