import { Layout, Space, Row, Col } from "antd";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { useAuth } from "../../contexts/AuthContext";
import avatar from "../../assets/images/avatar.png";
import StudyLinePicker from "./StudyLinePicker";
import { updateUser } from "../../firebase/api/authentication";
import { UserAvatarWithUpload } from "../../components/UserAvatar";
import { ShiftFiltering } from "../../types/types-file";
import { CalendarSection } from "../../components/CalendarComponent";
import { Loading } from "../../components/Loading";
import Shifts from "./Shifts";
import useEngagements from "../../hooks/useEngagements";
import { useEffect, useState } from "react";
import RoleTag from "../../components/RoleTag";
import useInternalEvents from "../../hooks/useInternalEvents";
import { renderInternalEvent } from "../admin/InternalEventsPage";

export default function Profile() {
  const { loading, currentUser } = useAuth();
  const { engagementState, getProfileData } = useEngagements();
  const [userData, setUserData] = useState<{ firstShift: Date | null, shiftCount: number | null } | null>(null);
  const { internalEventState } = useInternalEvents();

  useEffect(() => {
    (async () => {
      if (currentUser) {
        const data = await getProfileData(currentUser.uid);
        setUserData(data);
      }
    })();
  }, [currentUser, getProfileData]);

  const setStudyLine = (studyLine: string) => {
    if (!currentUser) return;
    updateUser({ id: currentUser.uid, field: "studyline", value: studyLine });
  };

  if (engagementState.loading || !engagementState.isLoaded || !engagementState.engagements) {
    return <Loading centerOverlay={true} resources={["your shifts"]} />;
  }

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
    return <Loading centerOverlay={true} resources={["you"]} />;
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
    memberSince: userData?.firstShift ? userData.firstShift.getFullYear() : new Date().getFullYear(),
    totalShifts: userData?.shiftCount ?? 0,
  };

  const EXCLUDED_ROLES = ["newbie", "regular_access"];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout style={{ padding: 0 }}>
        <Layout.Content style={{ padding: 0 }}>
          <Title level={1} style={{ scrollMarginTop: "135px" }}></Title>

          <Row gutter={32}>
            <Col
              xs={24}
              sm={24}
              md={10}
              lg={8}
              style={{ minWidth: 260, padding: 32 }}
            >
              <Space
                direction="vertical"
                size="middle"
                style={{ width: "100%" }}
              >
                <Row gutter={16} align="top">
                  <Col>
                    <Space direction="vertical" size="small" align="center">
                      <div
                        style={{
                          width: 150,
                          height: 150,
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
                    </Space>
                  </Col>
                  <Col>
                    <Space direction="vertical" size="small">
                      <Title level={3} style={{ marginBottom: -8 }}>
                        {userProfile?.displayName}
                      </Title>
                      <div>
                        <StudyLinePicker
                          bold
                          value={userProfile?.studyline}
                          onChange={setStudyLine}
                        />
                      </div>
                    </Space>
                  </Col>
                </Row>

                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%" }}
                >
                  <Text>Email: {userProfile?.email}</Text>

                  <Text>
                    {(userProfile?.roles ?? []).length > 1 ? "Roles: " : "Role: "}
                    {(userProfile?.roles ?? [])
                      .filter((role) => !EXCLUDED_ROLES.includes(role))
                      .map(
                        (role) => <RoleTag key={role} role={role} />
                      )}
                  </Text>

                  <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                    Your Data
                  </Title>
                  <Text>Total shifts: {userProfile?.totalShifts ?? 5}</Text>
                  <Text>Member since: {userProfile?.memberSince}</Text>

                  <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                    Badges TBD
                  </Title>
                </Space>

                <div>
                  <CalendarSection />
                </div>
              </Space>
            </Col>

            <Col xs={24} sm={24} md={14} lg={16}>
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                <div>
                  {internalEventState.internalEvents.map((internalEvent) => (
                    renderInternalEvent({ internalEvent })
                  ))}
                  <Shifts filter={ShiftFiltering.MY_SHIFTS} title="My Shifts" />
                </div>
              </Space>
            </Col>
          </Row>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
