import { Layout, Tabs, Space, TabsProps, Typography, Button, Popconfirm } from "antd";
import { UserAddOutlined } from "@ant-design/icons";
import { InvitedUsersTab } from "../../components/UserPage/InvitedUsersTab";
import { ExistingUsersTab } from "../../components/UserPage/ExistingUsersTab";
import { useWindowSize } from "../../hooks/useWindowSize";
import { TeamsTab } from "../../components/UserPage/TeamsTab";
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Role } from "../../types/types-file";
import Loading from "../../components/Loading";
import { Header } from "antd/es/layout/layout";
import useTenders from "../../hooks/useTenders";

const { Content } = Layout;

const UserManagerPage = () => {
  const { isMobile } = useWindowSize();
  const [tabItems, setTabItems] = useState<TabsProps["items"]>([]);
  const { currentUser, loading } = useAuth();
  const { tenderState, updateTender } = useTenders();

  useEffect(() => {
    const teamsTab = { key: "teams", label: "Teams", children: <TeamsTab /> };
    if (currentUser?.roles?.includes(Role.TENDER_MANAGER) || currentUser?.isAdmin) {
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

  const deleteAllNewbieHats = () => {
    tenderState.tenders
      .filter(tender => tender.roles?.includes(Role.NEWBIE))
      .forEach(tender => {
        let newRoles = tender.roles?.filter(role => role !== Role.NEWBIE);
        updateTender(tender.uid, "roles", newRoles);
      });
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
          <Header style={{ background: '#fff', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} >
            <Typography.Title level={3} style={{ margin: 0 }}>
              <UserAddOutlined style={{ marginRight: "12px" }} />
              User Manager
            </Typography.Title>
            <Popconfirm
              title="Are you sure you want to remove all newbie hats?"
              okText="Yes"
              cancelText="No"
              onConfirm={deleteAllNewbieHats}
            >
              <Button type='default'>
                Remove all newbie hats
              </Button>
            </Popconfirm>
          </Header>

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
