import useShifts from "../../hooks/useShifts";
import useEvents from "../../hooks/useEvents";
import useEngagements from "../../hooks/useEngagements";
import useTenders from "../../hooks/useTenders";
import { Layout } from "antd";
import Title from "antd/es/typography/Title";
import { ShiftList } from "./ShiftList";
import { ShiftFiltering } from "../../types/types-file";

interface ShiftsProps {
  filter?: ShiftFiltering;
  title: string;
}

function Shifts({ filter = ShiftFiltering.ALL_SHIFTS, title }: ShiftsProps) {
  const { shiftState } = useShifts();
  const { eventState } = useEvents();
  const { engagementState } = useEngagements();
  const { tenderState } = useTenders();
  const BACKGROUND = "#F5F5F5";
  const BOX_SHADOW = "5 2px 6px rgba(7, 7, 7, 0.1)";

  if (shiftState.loading || eventState.loading || engagementState.loading) {
    return <div>Loading...</div>;
  }

  return (
    <Layout
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
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
            {eventState.events.map((event) => (
              <section key={event.id} style={{ marginBottom: 32 }}>
                <ShiftList
                  shifts={shiftState.shifts}
                  engagements={engagementState.engagements}
                  tenders={tenderState.tenders}
                  eventId={event.id}
                  shiftFiltering={filter}
                />
              </section>
            ))}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}

export default Shifts;
