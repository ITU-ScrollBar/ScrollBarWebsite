import { Typography } from "antd";

const { Link, Text } = Typography;

interface ApplicationFileLinkProps {
  filePath?: string | null;
  url?: string;
}

/**
 * Renders the application file as a real anchor. Safari/WebKit blocks
 * window.open when it is called after an await, so the URL must already be
 * resolved by the time the user clicks.
 */
export default function ApplicationFileLink({ filePath, url }: ApplicationFileLinkProps) {
  if (!filePath) {
    return <Text type="secondary">No file</Text>;
  }

  if (!url) {
    return <Text type="secondary">Loading...</Text>;
  }

  return (
    <Link href={url} target="_blank" rel="noopener noreferrer">
      Open application
    </Link>
  );
}
