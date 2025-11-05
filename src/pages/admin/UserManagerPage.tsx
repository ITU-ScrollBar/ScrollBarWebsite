import { Layout, Tabs, Space, TabsProps } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { InvitedUsersTab } from "../../components/UserPage/InvitedUsersTab";
import { ExistingUsersTab } from "../../components/UserPage/ExistingUsersTab";
import { useWindowSize } from "../../hooks/useWindowSize";
import { TeamsTab } from "../../components/UserPage/TeamsTab";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Role } from "../../types/types-file";
import Loading from "../../components/Loading";

const { Content } = Layout;

const UserManagerPage = () => {
  const { isMobile } = useWindowSize();
  const [tabItems, setTabItems] = useState<TabsProps["items"]>([]);
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    const teamsTab = { key: "teams", label: "Teams", children: <TeamsTab /> };
    if (currentUser?.roles?.includes(Role.TENDER_MANAGER)) {
      setTabItems([
        {
          key: "existingUsers",
          label: "Existing Users",
          children: <ExistingUsersTab />,
        },
        {
          key: "invitedUsers",
          label: "Invited Users",
          children: <InvitedUsersTab />,
        },
        teamsTab,
      ]);
    } else {
      setTabItems([teamsTab]);
    }
  }, [currentUser]);

  if (loading) {
    return <Loading />;
  }

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "24px" }}>
        <div
          style={{
            background: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Space
            direction="vertical"
            style={{ width: "100%", marginBottom: "24px" }}
            size="large"
          >
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
              <UserAddOutlined style={{ marginRight: "12px" }} />
              User Manager
            </h1>
          </Space>

          <Tabs
            tabPosition={isMobile ? "top" : "left"}
            defaultActiveKey="existingUsers"
            items={tabItems}
            style={{ marginTop: "24px" }}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default UserManagerPage;
