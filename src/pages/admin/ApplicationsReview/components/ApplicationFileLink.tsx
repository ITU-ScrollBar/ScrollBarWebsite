import { Button, Typography } from "antd";
import { StorageDownloadEntry } from "../hooks/useStorageDownloadUrls";

const { Link, Text } = Typography;

interface ApplicationFileLinkProps {
  filePath?: string | null;
  entry?: StorageDownloadEntry;
  onRetry: () => void;
}

/**
 * Renders the application file as a real anchor. Safari/WebKit blocks
 * window.open when it is called after an await, so the URL has to be resolved
 * before the user clicks.
 */
export default function ApplicationFileLink({ filePath, entry, onRetry }: ApplicationFileLinkProps) {
  if (!filePath) {
    return <Text type="secondary">No file</Text>;
  }

  if (entry?.status === "error") {
    return (
      <Button type="link" danger size="small" style={{ padding: 0 }} onClick={onRetry}>
        Failed to load - retry
      </Button>
    );
  }

  if (entry?.status !== "ready" || !entry.url) {
    return <Text type="secondary">Loading...</Text>;
  }

  return (
    <Link href={entry.url} target="_blank" rel="noopener noreferrer">
      Open application
    </Link>
  );
}
