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
      <Layout style={{ flexDirection: "row" }}>
        <Content>
          {" "}
          <Button onClick={() => logout()}>SomeProtectedPage</Button>
        </Content>
      </Layout>
    </Layout>
  );
}
