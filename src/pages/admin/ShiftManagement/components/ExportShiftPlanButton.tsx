import { useState } from "react";
import { Button, notification } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { exportShiftPlanToExcel, ShiftPlanExportInput } from "../utils/shiftPlanExport";

export default function ExportShiftPlanButton(props: ShiftPlanExportInput) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportShiftPlanToExcel(props);
    } catch (error) {
      notification.error({
        message: "Export failed",
        description: error instanceof Error ? error.message : "Could not create the Excel file.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button icon={<DownloadOutlined />} loading={exporting} onClick={handleExport}>
      Export to Excel
    </Button>
  );
}
