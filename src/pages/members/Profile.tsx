import { Path, useNavigate } from "react-router-dom";

import { Layout, Space, Row, Col } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { useAuth } from "../../contexts/AuthContext";
import avatar from "../../assets/images/avatar.png";
import StudyLinePicker from "./StudyLinePicker";
import { updateUser } from "../../firebase/api/authentication";
import { UserAvatarWithUpload } from "../../components/UserAvatar";
import { CalendarSection } from "../../components/CalendarComponent";
import { Loading } from "../../components/Loading";


export default function Profile() {
  const navigation = useNavigate();
  const navigateToLink = (location: Path) => navigation(location);
  const { loading, currentUser } = useAuth();

  const setStudyLine = (studyLine: string) => {
    if (!currentUser) return;
    updateUser({ id: currentUser.uid, field: "studyline", value: studyLine });
  };

  // TODO
  type UserProfile = {
    uid: string;
    displayName: string;
    email: string;
    studyline?: string;
    isAdmin: boolean;
    roles: string[];
    active: boolean;
    photoUrl: string;
    memberSince: number;
    totalShifts: number;
  };

  if (loading || !currentUser) {
    return <Loading />;
  }

  const userProfile: UserProfile = {
    uid: currentUser.uid,
    displayName: currentUser.displayName ?? "Lorem",
    email: currentUser.email ?? "test",
    studyline: currentUser.studyline,
    isAdmin: false,
    roles: currentUser.roles ?? [],
    active: true,
    photoUrl: currentUser.photoUrl ?? avatar,
    memberSince: 2004,
    totalShifts: 5,
  };

  const EXCLUDED_ROLES = ["newbie", "regular_access"];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout style={{ padding: 32 }}>
        <Layout.Content style={{ padding: 24 }}>
          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <Row gutter={16} align="middle">
              <Col>
                <div
                  style={{
                    width: 150,
                    height: 150,
                    overflow: "hidden",
                    borderRadius: "50%",
                    background: "#f0f0f0",
                  }}
                >
                  <UserAvatarWithUpload
                    user={userProfile}
                    onChange={(url) => {
                      userProfile.photoUrl = url;
                    }}
                  />
                </div>
              </Col>
              <Col>
                <Space direction="vertical" size="small">
                  <Title level={4} style={{ margin: 0 }}>
                    {userProfile?.displayName}
                  </Title>
                  <StudyLinePicker bold value={userProfile?.studyline} onChange={setStudyLine} />
                </Space>
              </Col>
            </Row>

            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Text>Email: {userProfile?.email}</Text>
              <Text>Role: {(userProfile?.roles ?? []).filter(role => !EXCLUDED_ROLES.includes(role)).map(role => role.charAt(0).toUpperCase() + role.slice(1)).join(", ")}</Text>

              <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                Your Data
              </Title>
              <Text>Total shifts: {userProfile?.totalShifts ?? 5}</Text>
              <Text>Member since: {userProfile?.memberSince}</Text>

              <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                Badges TBD
              </Title>
            </Space>
          </Space>
          
          <CalendarSection />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
