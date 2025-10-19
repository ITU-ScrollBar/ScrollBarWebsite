import { Layout, Typography, Space, Row, Col } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import avatar from "../../assets/images/avatar.png";
import StudyLinePicker from "./StudyLinePicker";
import { updateUser } from "../../firebase/api/authentication";
import { UserAvatarWithUpload } from "../../components/UserAvatar";
import useShifts from "../../hooks/useShifts";
import useTenders from "../../hooks/useTenders";
import useEngagements from "../../hooks/useEngagements";
import { ShiftList } from "./ShiftList";
import { ShiftFiltering } from "../../types/types-file";

const { Title, Text } = Typography;

export default function Profile() {
  const { loading, currentUser } = useAuth();
  const { shiftState } = useShifts();
  const { tenderState } = useTenders();
  const { engagementState } = useEngagements();

  const setStudyLine = (studyLine: string) => {
    if (!currentUser) return;
    updateUser({ id: currentUser.uid, field: 'studyline', value: studyLine });
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
    return <div>Loading...</div>;
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
  const SHOW_NEWBIE_HAT = true

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout style={{ padding: 32 }}>
        <Layout.Content style={{ padding: 24 }}>
          <Title level={1} style={{ scrollMarginTop: "135px" }}>
          </Title>

          <Row gutter={32}>
            <Col flex="0 0 auto" style={{ minWidth: 300, maxWidth: 575 }}>
              <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                <Row gutter={16} align="top">
                  <Col>
                    <Space direction="vertical" size="small" align="center">
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
                    </Space>
                  </Col>
                  <Col>
                    <Space direction="vertical" size="small">
                      <Title level={3} style={{ marginBottom: -8 }}>
                        {userProfile?.displayName}
                      </Title>
                      <div>
                        <StudyLinePicker bold value={userProfile?.studyline} onChange={setStudyLine} />
                      </div>
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
            </Col>

            <Col flex="1">
              <div>
                <Title level={3} style={{ marginBottom: 16 }}>
                  My Shifts
                </Title>
                <ShiftList
                  shifts={shiftState.shifts}
                  engagements={engagementState.engagements}
                  tenders={tenderState.tenders}
                  shiftFiltering={ShiftFiltering.MY_SHIFTS}
                />
              </div>
            </Col>
          </Row>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
