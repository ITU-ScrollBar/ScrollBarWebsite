import { Alert, Button, Layout, Space, Row, Col, Select, notification } from "antd";
import { useNavigate } from "react-router-dom";
import Title from "antd/es/typography/Title";
import Text from "antd/es/typography/Text";
import { useAuth } from "../../contexts/AuthContext";
import avatar from "../../assets/images/avatar.png";
import StudyLinePicker from "./StudyLinePicker";
import { updateUser } from "../../firebase/api/authentication";
import { UserAvatarWithUpload } from "../../components/UserAvatar";
import { Role, ShiftFiltering } from "../../types/types-file";
import { CalendarSection } from "../../components/CalendarComponent";
import { Loading } from "../../components/Loading";
import Shifts from "./Shifts";
import useEngagements from "../../hooks/useEngagements";
import { useEffect, useMemo, useState } from "react";
import RoleTag from "../../components/RoleTag";
import useTeams from "../../hooks/useTeams";
import useShiftPlanning from "../../hooks/useShiftPlanning";
import { resolveSurveyType } from "../../firebase/api/shiftPlanning";

export default function Profile() {
  const navigate = useNavigate();
  const { loading, currentUser } = useAuth();
  const { engagementState, getProfileData } = useEngagements();
  const { periodState, loadUserResponse } = useShiftPlanning();
  const [userData, setUserData] = useState<{
    firstShift: Date | null;
    shiftCount: number | null;
  } | null>(null);
  const [hasPendingPlanningSubmission, setHasPendingPlanningSubmission] = useState(false);
  const { teamState } = useTeams();

  const isNewbie = currentUser?.roles?.includes(Role.NEWBIE) ?? false;
  const activeOpenPeriod = useMemo(() => {
    const now = Date.now();

    return (
      periodState.periods
        .filter((period) => period.status === "open")
        .filter((period) => period.submissionOpensAt?.getTime() <= now)
        .filter((period) => period.submissionClosesAt?.getTime() >= now)
        .filter((period) => {
          const surveyType = resolveSurveyType(period);
          return surveyType !== "newbieShiftPlanning" || isNewbie;
        })
        .sort(
          (a, b) =>
            (a.submissionClosesAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
            (b.submissionClosesAt?.getTime() ?? Number.MAX_SAFE_INTEGER)
        )[0] ?? null
    );
  }, [isNewbie, periodState.periods]);

  useEffect(() => {
    (async () => {
      if (currentUser) {
        const data = await getProfileData(currentUser.uid);
        setUserData(data);
      }
    })();
  }, [currentUser, getProfileData]);

  useEffect(() => {
    let cancelled = false;

    const checkPlanningSubmission = async () => {
      if (!currentUser?.uid || !activeOpenPeriod?.id) {
        setHasPendingPlanningSubmission(false);
        return;
      }

      const response = await loadUserResponse(activeOpenPeriod.id, currentUser.uid);
      if (!cancelled) {
        setHasPendingPlanningSubmission(!response);
      }
    };

    checkPlanningSubmission();

    return () => {
      cancelled = true;
    };
  }, [activeOpenPeriod?.id, currentUser?.uid, loadUserResponse]);

  const setStudyLine = (studyLine: string) => {
    if (!currentUser) return;
    updateUser({ id: currentUser.uid, field: "studyline", value: studyLine });
  };

  if (
    engagementState.loading ||
    !engagementState.isLoaded ||
    !engagementState.engagements
  ) {
    return <Loading centerOverlay={true} resources={["your shifts"]} />;
  }

  if (loading || !currentUser) {
    return <Loading centerOverlay={true} resources={["you"]} />;
  }

  const userProfile = {
    uid: currentUser.uid,
    displayName: currentUser.displayName ?? "Lorem",
    email: currentUser.email ?? "test",
    studyline: currentUser.studyline,
    teamIds: currentUser.teamIds ?? [],
    isAdmin: false,
    roles: currentUser.roles ?? [],
    active: true,
    photoUrl: currentUser.photoUrl ?? avatar,
    memberSince: userData?.firstShift
      ? userData.firstShift.getFullYear()
      : new Date().getFullYear(),
    totalShifts: userData?.shiftCount ?? 0,
  };

  const updateTeams = (teamIds: string[]) => {
    if (!currentUser) return;
    updateUser({ id: currentUser.uid, field: "teamIds", value: teamIds });
    notification.success({
      message: "Teams updated",
      description: "Your team memberships have been updated.",
      placement: "top",
    });
  };

  const EXCLUDED_ROLES = [Role.NEWBIE, Role.REGULAR_ACCESS].map((role) => role.toString());

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
                      <UserAvatarWithUpload
                        user={userProfile}
                        onChange={(url) => {
                          userProfile.photoUrl = url;
                        }}
                      />
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
                    {(userProfile?.roles ?? []).length > 1
                      ? "Roles: "
                      : "Role: "}
                    {(userProfile?.roles ?? [])
                      .filter((role) => !EXCLUDED_ROLES.includes(role))
                      .map((role) => (
                        <RoleTag key={role} role={role} />
                      ))}
                  </Text>
                  <div>
                    <Text>Teams: </Text>
                    <Select
                      style={{ minWidth: 200 }}
                      mode="multiple"
                      options={teamState.teams.map((team) => ({
                        label: team.name,
                        value: team.id,
                      }))}
                      filterOption={(input, option) =>
                        (option?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      value={userProfile?.teamIds || []}
                      onChange={updateTeams}
                    />
                  </div>

                  <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
                    Statistics
                  </Title>
                  <Text>Total shifts: {userProfile?.totalShifts ?? 5}</Text>
                  <Text>Member since: {userProfile?.memberSince}</Text>
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
                {activeOpenPeriod && hasPendingPlanningSubmission && (
                  <Alert
                    type="info"
                    showIcon
                    message="Shift availability form is still awaiting your response"
                    description={
                      <Space direction="vertical" size="small">
                        <Text>
                          Please submit your shift planning response before {activeOpenPeriod.submissionClosesAt.toLocaleString()}.
                        </Text>
                        <Button type="primary" onClick={() => navigate("/members/availability")} style={{ width: "fit-content" }}>
                          Go to shift availability form
                        </Button>
                      </Space>
                    }
                  />
                )}
                <Shifts filter={ShiftFiltering.MY_SHIFTS} title="My Events" />
              </Space>
            </Col>
          </Row>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
