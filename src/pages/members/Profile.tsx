import { Path, useNavigate } from "react-router-dom";
import { ProfileOutlined, HomeOutlined } from "@ant-design/icons";
import { useState } from "react";

import { Layout, Menu } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import Sider from "antd/es/layout/Sider";
import Title from "antd/es/typography/Title";
import { useAuth } from "../../contexts/AuthContext";
import newbiehatSvg from "../../assets/images/newbiehat.svg";
import { StudyLine } from "../../types/types-file";
import StudyLinePicker from "./StudyLinePicker";

export default function Profile() {
  const navigation = useNavigate();
  const navigateToLink = (location: Path) => navigation(location);
  const { loading, currentUser } = useAuth();
  const [studyLine, setStudyLine] = useState<StudyLine | null>(null);
  
  // TODO
  type UserProfile = {
    displayName: string;
    email: string;
    studyline: string;
    isAdmin: boolean;
    roles: string[];
    phone: string | null;
    active: boolean;
    photoUrl: string;
    memberSince: number;
    totalShifts: number;
  }


  if(loading){
    return <div>Loading...</div>;
  }
  console.log(currentUser)
  

  const userProfile: UserProfile | null = currentUser
  ? {
      displayName: currentUser.displayName ?? "Lorem",
      email: currentUser.email ?? "test",
      studyline: studyLine?.name ?? "Not selected", 
      isAdmin: false, 
      roles: ["tester"], // populate from your DB/profile store if available
      phone: (currentUser as any).phoneNumber ?? null,
      active: true,
      photoUrl: (currentUser as any).photoURL ?? newbiehatSvg,
      memberSince: 2004,
      totalshifts: 5,
    }
  : null;
  
  return(
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

        <Content style={{ padding: 24 }}>
          <Title id="about" level={1} style={{ scrollMarginTop: "135px" }}>
            {/* {currentUser?.email} */}

          </Title>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16, width: "100%" }}>
              <div
              style={{
                width: 150,
                height: 150,
                overflow: "hidden",
                borderRadius: "50%",
                flexShrink: 0,
                background: "#f0f0f0",
              }}
              >
              <img
                src={userProfile?.photoUrl ?? "/newbiehat.svg"}
                alt={userProfile?.displayName ?? "avatar"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              </div>
              <div style={{ textAlign: "left" }}>
              <h4 style={{ margin: 0 }}>{userProfile?.displayName}</h4>
              <StudyLinePicker 
                value={studyLine}
                onChange={setStudyLine}
              />
              </div>
            </div>

            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>Email: {userProfile?.email}</h4>
            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>Role: {(userProfile?.roles ?? []).join(", ")}</h4>

            <h4 style={{ marginTop: 8, marginBottom: 0, width: "100%", textAlign: "left" }}><b>Your Data</b></h4>
            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>Total shifts: {userProfile?.totalshifts ?? 5 }</h4>
            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>Member since: {userProfile?.memberSince}</h4>

            <h4 style={{ marginTop: 8, marginBottom: 0, width: "100%", textAlign: "left" }}><b>Badges TBD</b></h4>
            </div>
            </Content>
          </Layout>
    </Layout>
  )
}
