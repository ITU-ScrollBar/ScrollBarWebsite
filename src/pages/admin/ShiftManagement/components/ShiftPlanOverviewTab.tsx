import { useMemo, useState } from "react";
import { Button, Popconfirm, Segmented, Space } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { useEngagementContext } from "../../../../contexts/EngagementContext";
import {
  Engagement,
  Shift,
  ShiftPlanningResponse,
  Tender,
} from "../../../../types/types-file";
import ShiftPlanOverviewAssignedView, {
  useAssignedRows,
} from "./ShiftPlanOverviewTabs/ShiftPlanOverviewAssignedView";
import ShiftPlanOverviewPassiveView, {
  usePassiveRows,
} from "./ShiftPlanOverviewTabs/ShiftPlanOverviewPassiveView";
import ShiftPlanOverviewLegacyView, {
  useLegacyRows,
} from "./ShiftPlanOverviewTabs/ShiftPlanOverviewLegacyView";
import ShiftPlanOverviewLeavingView, {
  useLeavingRows,
} from "./ShiftPlanOverviewTabs/ShiftPlanOverviewLeavingView";
import { useNameFilter } from "./ShiftPlanOverviewTabs/ShiftPlanOverviewShared";

type ViewKey = "assigned" | "passive" | "legacy" | "leaving";

type Props = {
  periodShifts: Shift[];
  tenders: Tender[];
  responses: ShiftPlanningResponse[];
  deleteTender: (id: string) => void;
};

export default function ShiftPlanOverviewTab({
  periodShifts,
  tenders,
  responses,
  deleteTender,
}: Props) {
  const { engagementState } = useEngagementContext();
  const [view, setView] = useState<ViewKey>("assigned");
  const nameFilter = useNameFilter();

  const periodShiftIds = useMemo(() => new Set(periodShifts.map((s) => s.id)), [periodShifts]);
  const shiftById = useMemo(() => new Map(periodShifts.map((s) => [s.id, s])), [periodShifts]);

  const periodEngagements = useMemo(
    () => engagementState.engagements.filter((e) => periodShiftIds.has(e.shiftId)),
    [engagementState.engagements, periodShiftIds]
  );

  const engagementsByUser = useMemo(() => {
    const map = new Map<string, Engagement[]>();
    for (const engagement of periodEngagements) {
      if (!engagement.userId) continue;
      const list = map.get(engagement.userId) ?? [];
      list.push(engagement);
      map.set(engagement.userId, list);
    }
    return map;
  }, [periodEngagements]);

  const tenderMap = useMemo(() => new Map(tenders.map((t) => [t.uid, t])), [tenders]);
  const responseMap = useMemo(
    () => new Map(responses.map((r) => [r.userId, r])),
    [responses]
  );

  const assignedRows = useAssignedRows({
    engagementsByUser,
    shiftById,
    tenderMap,
    responseMap,
  });
  const passiveRows = usePassiveRows({ tenders, responseMap });
  const legacyRows = useLegacyRows({ tenders, responseMap });
  const leavingRows = useLeavingRows({ tenders, responseMap });

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <Segmented<ViewKey>
          value={view}
          onChange={setView}
          options={[
            { label: `Assigned (${assignedRows.length})`, value: "assigned" },
            { label: `Passive (${passiveRows.length})`, value: "passive" },
            { label: `Legacy (${legacyRows.length})`, value: "legacy" },
            { label: `Leaving (${leavingRows.length})`, value: "leaving" },
          ]}
        />
        {view === "leaving" && leavingRows.length > 0 && (
          <Popconfirm
            title="Delete all leaving members?"
            description={`This will soft-delete ${leavingRows.length} member${leavingRows.length === 1 ? "" : "s"}.`}
            onConfirm={() => leavingRows.forEach((r) => deleteTender(r.uid))}
            okText="Delete all"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />}>Delete all leaving</Button>
          </Popconfirm>
        )}
      </div>

      {view === "assigned" && (
        <ShiftPlanOverviewAssignedView rows={assignedRows} nameFilter={nameFilter} />
      )}
      {view === "passive" && (
        <ShiftPlanOverviewPassiveView rows={passiveRows} nameFilter={nameFilter} />
      )}
      {view === "legacy" && (
        <ShiftPlanOverviewLegacyView rows={legacyRows} nameFilter={nameFilter} />
      )}
      {view === "leaving" && (
        <ShiftPlanOverviewLeavingView
          rows={leavingRows}
          nameFilter={nameFilter}
          deleteTender={deleteTender}
        />
      )}
    </Space>
  );
}
