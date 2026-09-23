import { useEffect, useMemo, useState } from "react";
import {
  App as AntdApp,
  Alert,
  Button,
  Card,
  Drawer,
  Empty,
  Grid,
  List,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import { CommentOutlined } from "@ant-design/icons";
import { Loading } from "../../../../components/Loading";
import useAnonymousFeedback from "../../../../hooks/useAnonymousFeedback";
import { formatFormDateTime } from "../../../../utils/formResponses";
import { TenderLookup } from "../types";
import FormCommentThread from "./FormCommentThread";

const { Paragraph, Text } = Typography;

type AnonymousFeedbackTabProps = {
  tenders: TenderLookup;
};

export default function AnonymousFeedbackTab({ tenders }: AnonymousFeedbackTabProps) {
  const { message } = AntdApp.useApp();
  const { feedbackState, addComment, deleteComment, deleteFeedback } = useAnonymousFeedback();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (!feedbackState.error) {
      return;
    }

    message.error("Unable to load feedback: " + feedbackState.error);
  }, [message, feedbackState.error]);

  // Derived from the loaded list so the drawer follows every background refresh.
  const selectedFeedback = useMemo(() => {
    return feedbackState.entries.find((entry) => entry.id === selectedId) ?? null;
  }, [feedbackState.entries, selectedId]);

  const removeFeedback = async () => {
    if (!selectedFeedback) {
      return;
    }

    setDeleting(true);
    try {
      await deleteFeedback(selectedFeedback.id);
      message.success("Feedback deleted.");
      setSelectedId(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete feedback.";
      message.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  if (feedbackState.loading && !feedbackState.isLoaded) {
    return <Loading />;
  }

  return (
    <div>
      {feedbackState.error ? (
        <Alert
          type="error"
          showIcon
          message="Could not load feedback"
          description={feedbackState.error}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="These submissions are anonymous"
        description="No name, email or account is stored with these submissions, and they are not linked to a member. Comments you write here are only visible to the board."
      />

      {feedbackState.entries.length === 0 ? (
        <Empty description="No feedback yet" />
      ) : (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 3, xxl: 3 }}
          dataSource={feedbackState.entries}
          pagination={
            feedbackState.entries.length > 9 ? { pageSize: 9, hideOnSinglePage: true } : false
          }
          renderItem={(entry) => (
            <List.Item key={entry.id}>
              <Card
                hoverable
                onClick={() => setSelectedId(entry.id)}
                style={{ height: "100%" }}
                styles={{ body: { display: "flex", flexDirection: "column", gap: 10 } }}
              >
                <Space size={8} wrap>
                  <Text type="secondary">{formatFormDateTime(entry.createdAt)}</Text>
                  {entry.comments.length > 0 ? (
                    <Tag icon={<CommentOutlined />}>{entry.comments.length}</Tag>
                  ) : null}
                </Space>
                <Paragraph ellipsis={{ rows: 5 }} style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
                  {entry.feedback}
                </Paragraph>
              </Card>
            </List.Item>
          )}
        />
      )}

      <Drawer
        title="Anonymous feedback"
        open={Boolean(selectedFeedback)}
        size={isMobile ? "default" : "large"}
        onClose={() => setSelectedId(null)}
        destroyOnClose
      >
        {selectedFeedback ? (
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <Text type="secondary">Received {formatFormDateTime(selectedFeedback.createdAt)}</Text>
            <div
              style={{
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                padding: 12,
                background: "#fafafa",
                whiteSpace: "pre-wrap",
                minHeight: 88,
              }}
            >
              {selectedFeedback.feedback}
            </div>

            <Popconfirm
              title="Delete this feedback?"
              description="This permanently removes the submission and its comments."
              okText="Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
              onConfirm={() => {
                void removeFeedback();
              }}
            >
              <Button danger type="text" style={{ alignSelf: "flex-start" }} disabled={deleting}>
                Delete feedback
              </Button>
            </Popconfirm>

            <FormCommentThread
              comments={selectedFeedback.comments}
              tenders={tenders}
              onAddComment={(body) => addComment(selectedFeedback.id, body)}
              onDeleteComment={(commentId) => deleteComment(selectedFeedback.id, commentId)}
            />
          </Space>
        ) : null}
      </Drawer>
    </div>
  );
}
