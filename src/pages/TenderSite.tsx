import { Button, Layout, Menu } from "antd";
import React from "react";

import { useAuth } from "../contexts/AuthContext";
import { Content, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import { ProfileOutlined, HomeOutlined } from "@ant-design/icons";
import { Path, useNavigate } from "react-router-dom";

export default function TenderSite() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const navigateToLink = (location: Path) => navigate(location);

  return (
    <Layout
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        flexDirection: "column",
        height: "auto",
      }}
    >
      <Header style={{ height: "150px" }}></Header>
      <Layout style={{ flexDirection: "row" }}>
        <Sider breakpoint="lg" collapsedWidth="0">
          <Menu
            theme="dark"
            mode="inline"
            defaultSelectedKeys={[location.pathname]}
            onSelect={(info) => navigateToLink(info.key as unknown as Path)}
          >
            <Menu.Item key="/tenders/shifts" icon={<HomeOutlined />}>
              Tender site
            </Menu.Item>
            <Menu.Item key="/members/profile" icon={<ProfileOutlined />}>
              Profile
            </Menu.Item>
          </Menu>
        </Sider>
        <Content>
          {" "}
          <Button onClick={() => logout()}>SomeProtectedPage</Button>
        </Content>
      </Layout>
    </Layout>
  );
}
