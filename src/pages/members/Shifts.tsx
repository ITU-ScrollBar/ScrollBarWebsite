import useShifts from "../../hooks/useShifts";
import useEvents from "../../hooks/useEvents";
import useEngagements from "../../hooks/useEngagements";
import useTenders from "../../hooks/useTenders";
import { Layout } from "antd";
import Title from "antd/es/typography/Title";
import { ShiftList } from "./ShiftList";

interface ShiftsProps {
  fucker?: boolean;
}

function Shifts({ fucker = false }: ShiftsProps) {
  const { shiftState } = useShifts();
  const { eventState } = useEvents();
  const { engagementState } = useEngagements();
  const { tenderState } = useTenders();

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
            My Shifts
          </Title>
          <div
            style={{
              background: "#f3ebdb",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 6px 18px rgba(18,24,31,0.06)",
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
                  onlyMyShifts={fucker}
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
