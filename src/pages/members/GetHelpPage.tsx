import { useMemo } from "react";
import { Col, Divider, Empty, Layout, Row, Typography } from "antd";
import useBoardRoles from "../../hooks/useBoardRoles";
import useSettings from "../../hooks/useSettings";
import useTenders from "../../hooks/useTenders";
import { Loading } from "../../components/Loading";
import { getTenderDisplayName } from "./helpers";
import { BoardRole, Role, Tender } from "../../types/types-file";
import { TenderWithRole, UserList } from "../../components/UserList";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function GetHelpPage() {
  const { settingsState } = useSettings();
  const { boardRolesState } = useBoardRoles();
  const { tenderState } = useTenders();

  const boardMembers = useMemo<TenderWithRole[]>(() => {
    if (!boardRolesState.boardRoles) return [];

    return [...boardRolesState.boardRoles]
      .sort((a, b) => (a.sortingIndex ?? 0) - (b.sortingIndex ?? 0))
      .filter(
        (role): role is typeof role & { assignedUser: Tender } =>
          !!role.assignedUser?.uid
      )
      .map((role) => ({
        ...role.assignedUser,
        role: {
          id: role.id,
          name: role.name,
          sortingIndex: role.sortingIndex,
          contactEmail: role.contactEmail,
        } as BoardRole,
      }));
  }, [boardRolesState.boardRoles]);

  const hrMembers = useMemo<TenderWithRole[]>(() => {
    return tenderState.tenders
      .filter((tender) => tender.active && tender.roles?.includes(Role.HR))
      .sort((a, b) => getTenderDisplayName(a).localeCompare(getTenderDisplayName(b)));
  }, [tenderState.tenders]);

  if (settingsState.loading || boardRolesState.loading || tenderState.loading) {
    return <Loading centerOverlay={true} />;
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#fff" }}>
      <Content style={{ padding: "32px 24px 40px" }}>
        <Row justify="center">
          <Col xs={24} lg={18}>
            <Title level={2} style={{ textAlign: "center" }}>{settingsState.settings.getHelpTitle}</Title>
            <Paragraph style={{ fontSize: 16, maxWidth: 840, textAlign: "center", margin: "0 auto" }}>
              {settingsState.settings.getHelpDescription}
            </Paragraph>
          </Col>
        </Row>

        <Divider />

        <Row justify="center">
          <Col xs={24} lg={18}>
            <Title level={3} style={{ textAlign: "center" }}>Board Members</Title>
            {boardMembers.length ? (
              <UserList
                users={boardMembers}
                className="user-list-centered"
                getContactEmail={(user) => user.role?.contactEmail}
              />
            ) : (
              <Empty description="No board members available right now." />
            )}
          </Col>
        </Row>

        <Divider />

        <Row justify="center">
          <Col xs={24} lg={18}>
            <Title level={3} style={{ textAlign: "center" }}>HR</Title>
            {hrMembers.length ? (
              <UserList
                users={hrMembers}
                className="user-list-centered"
                getContactEmail={(user) => user.email}
              />
            ) : (
              <Empty description="No HR contacts available right now." />
            )}
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
