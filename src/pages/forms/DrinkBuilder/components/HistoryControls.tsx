import { ArrowLeftOutlined, ArrowRightOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";

type HistoryControlsProps = {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
};

export default function HistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
}: HistoryControlsProps) {
  return (
    <Space wrap style={{ justifyContent: "center", width: "100%" }}>
      <Tooltip title="Take the last ingredient out">
        <Button icon={<ArrowLeftOutlined />} disabled={!canUndo} onClick={onUndo}>
          Back
        </Button>
      </Tooltip>
      <Tooltip title="Put the ingredient back in">
        <Button disabled={!canRedo} onClick={onRedo}>
          Forward <ArrowRightOutlined />
        </Button>
      </Tooltip>
      <Tooltip title="Empty the cup (Forward can still bring it back)">
        <Button danger icon={<ReloadOutlined />} disabled={!canUndo} onClick={onReset}>
          Reset
        </Button>
      </Tooltip>
    </Space>
  );
}
