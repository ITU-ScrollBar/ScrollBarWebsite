import { useCallback, useMemo } from "react";
import { Layout, Tabs, Typography } from "antd";
import { Content } from "antd/es/layout/layout";
import { useTenderContext } from "../../contexts/TenderContext";
import { Tender } from "../../types/types-file";
import AnonymousFeedbackTab from "./FormResponses/components/AnonymousFeedbackTab";
import LendingRequestsTab from "./FormResponses/components/LendingRequestsTab";
import { TenderLookup } from "./FormResponses/types";

const { Title, Text } = Typography;

/**
 * Responses to the member forms that are not tickets. These stay off the ticket kanban board
 * because they are reviewed and discussed rather than moved through a workflow.
 */
export default function FormResponsesPage() {
  const { tenderState } = useTenderContext();

  const tenderByUid = useMemo(() => {
    return new Map(tenderState.tenders.map((tender) => [tender.uid, tender]));
  }, [tenderState.tenders]);

  const resolveTender = useCallback(
    (uid?: string): Tender | null => (uid ? tenderByUid.get(uid) ?? null : null),
    [tenderByUid]
  );

  const tenders = useMemo<TenderLookup>(
    () => ({ resolve: resolveTender, isLoaded: tenderState.isLoaded }),
    [resolveTender, tenderState.isLoaded]
  );

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "24px 16px 32px" }}>
        <div style={{ marginBottom: 20 }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            Form Responses
          </Title>
          <Text type="secondary">
            Equipment booking requests and anonymous feedback submitted by members.
          </Text>
        </div>

        <Tabs
          defaultActiveKey="lending"
          destroyOnHidden
          items={[
            {
              key: "lending",
              label: "Equipment Lending",
              children: <LendingRequestsTab tenders={tenders} />,
            },
            {
              key: "feedback",
              label: "Anonymous Feedback",
              children: <AnonymousFeedbackTab tenders={tenders} />,
            },
          ]}
        />
      </Content>
    </Layout>
  );
}
