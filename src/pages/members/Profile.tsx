import { Path, useNavigate } from "react-router-dom";

import { Layout } from "antd";
import { Content } from "antd/es/layout/layout";
import Title from "antd/es/typography/Title";
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

  return (
    <Layout
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        flexDirection: "column",
        height: "auto",
      }}
    >
      <Layout style={{ flexDirection: "row", padding: 32 }}>
        <Content style={{ padding: 24 }}>
          <Title id="about" level={1} style={{ scrollMarginTop: "135px" }}>
            {/* {currentUser?.email} */}
          </Title>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                width: "100%",
              }}
            >
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
                <UserAvatarWithUpload
                  user={userProfile}
                  onChange={(url) => {
                    userProfile.photoUrl = url;
                  }}
                />
              </div>
              <div style={{ textAlign: "left" }}>
                <h4 style={{ margin: 0 }}>{userProfile?.displayName}</h4>
                <StudyLinePicker
                  bold
                  value={userProfile?.studyline}
                  onChange={setStudyLine}
                />
              </div>
            </div>

            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>
              Email: {userProfile?.email}
            </h4>
            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>
              Role: {(userProfile?.roles ?? []).join(", ")}
            </h4>

            <h4
              style={{
                marginTop: 8,
                marginBottom: 0,
                width: "100%",
                textAlign: "left",
              }}
            >
              <b>Your Data</b>
            </h4>
            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>
              Total shifts: {userProfile?.totalShifts ?? 5}
            </h4>
            <h4 style={{ margin: 0, width: "100%", textAlign: "left" }}>
              Member since: {userProfile?.memberSince}
            </h4>

            <h4
              style={{
                marginTop: 8,
                marginBottom: 0,
                width: "100%",
                textAlign: "left",
              }}
            >
              <b>Badges TBD</b>
            </h4>
          </div>
          <CalendarSection />
        </Content>
      </Layout>
    </Layout>
  );
}
