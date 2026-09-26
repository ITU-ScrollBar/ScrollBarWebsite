import { useEventContext } from "../../contexts/EventContext";
import { useTenderContext } from "../../contexts/TenderContext";
import { Layout } from "antd";
import Title from "antd/es/typography/Title";
import { ShiftList } from "./ShiftList";
import { ShiftFiltering } from "../../types/types-file";
import { useShiftContext } from "../../contexts/ShiftContext";
import { useEngagementContext } from "../../contexts/EngagementContext";
import { Loading } from "../../components/Loading";
import { useAuth } from "../../contexts/AuthContext";
import { useMyShifts } from "../../hooks/useMyShifts";
import { ReactNode } from "react";

interface ShiftsProps {
  filter?: ShiftFiltering;
  title: string;
}

const BACKGROUND = "#FFF";
const BOX_SHADOW = "0 2px 6px rgba(7, 7, 7, 0.5)";

function ShiftsLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Layout
      style={{
        minHeight: "100vh",
        width: "100%",
        flexDirection: "column",
        height: "auto",
      }}
    >
      <Layout style={{ flexDirection: "row" }}>
        <Layout.Content style={{ padding: 24 }}>
          <Title id="about" level={1} style={{ scrollMarginTop: "135px" }}>
            {title}
          </Title>
          <div
            style={{
              background: BACKGROUND,
              borderRadius: 12,
              padding: 24,
              boxShadow: BOX_SHADOW,
              marginBottom: 28,
            }}
          >
            {children}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

// Loading stays inside the list card so the title (and, on the profile page,
// everything around this section) renders without waiting on the data.

// The user's own shifts only: fetched by the user's engagements instead of
// streaming every shift, event and engagement in the window.
function MyShifts({ title }: { title: string }) {
  const { currentUser } = useAuth();
  const { tenderState } = useTenderContext();
  const myShifts = useMyShifts(currentUser?.uid);

  return (
    <ShiftsLayout title={title}>
      {myShifts.loading ? (
        <Loading resources={["your shifts"]} />
      ) : (
        <ShiftList
          shifts={myShifts.shifts}
          engagements={myShifts.engagements}
          events={myShifts.events}
          tenders={tenderState.tenders}
          shiftFiltering={ShiftFiltering.MY_SHIFTS}
        />
      )}
    </ShiftsLayout>
  );
}

function StreamedShifts({ filter, title }: { filter: ShiftFiltering; title: string }) {
  const { shiftState } = useShiftContext();
  const { eventState } = useEventContext();
  const { engagementState } = useEngagementContext();
  const { tenderState } = useTenderContext();

  const loadingResources: string[] = [];
  if (shiftState.loading) loadingResources.push("shifts");
  if (eventState.loading) loadingResources.push("events");
  if (engagementState.loading) loadingResources.push("engagements");

  return (
    <ShiftsLayout title={title}>
      {loadingResources.length ? (
        <Loading resources={loadingResources} />
      ) : (
        <ShiftList
          shifts={shiftState.shifts}
          engagements={engagementState.engagements}
          events={eventState.events}
          tenders={tenderState.tenders}
          shiftFiltering={filter}
        />
      )}
    </ShiftsLayout>
  );
}

function Shifts({ filter = ShiftFiltering.ALL_SHIFTS, title }: ShiftsProps) {
  if (filter === ShiftFiltering.MY_SHIFTS) {
    return <MyShifts title={title} />;
  }
  return <StreamedShifts filter={filter} title={title} />;
}

export default Shifts;
