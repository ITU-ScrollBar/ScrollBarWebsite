import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import {
  Button,
  Divider,
  Grid,
  Image,
  Layout,
  message,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { Content } from "antd/es/layout/layout";
import { useEffect, useMemo, useRef, useState } from "react";
import useApplications from "../../hooks/useApplications";
import useTenders from "../../hooks/useTenders";
import useSettings from "../../hooks/useSettings";
import { IntakeApplication, StudyLine } from "../../types/types-file";
import { useAuth } from "../../contexts/AuthContext";
import Loading from "../../components/Loading";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "../../firebase";
import { getStudyLines } from "../../firebase/api/authentication";
import avatarPlaceholder from "../../assets/images/avatar.png";

const { Title, Paragraph } = Typography;

export default function ApplicationsReviewPage() {
  const { currentUser } = useAuth();
  const {
    applicationsState,
    grouped,
    setDecision,
    submitRound,
    deleteRound,
    queueRejectedEmails,
    sendTemplateTestEmail,
    setEmailDeliveryStatuses,
  } = useApplications();
  const { addInvites } = useTenders();
  const { settingsState } = useSettings();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [submittingRound, setSubmittingRound] = useState(false);
  const [deletingRound, setDeletingRound] = useState(false);
  const [retryingFailed, setRetryingFailed] = useState(false);
  const [sendingInviteTest, setSendingInviteTest] = useState(false);
  const [sendingRejectionTest, setSendingRejectionTest] = useState(false);
  const [studyLines, setStudyLines] = useState<StudyLine[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const requestedPhotoIdsRef = useRef<Set<string>>(new Set());
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const isAdmin = !!currentUser?.isAdmin;

  const canSubmit = useMemo(() => {
    if (!isAdmin || applicationsState.submittedAt) return false;
    if (!applicationsState.applications.length) return false;
    return applicationsState.applications.every(
      (application) => application.decision === "accept" || application.decision === "reject"
    );
  }, [applicationsState.applications, applicationsState.submittedAt, isAdmin]);

  const hasFailedDeliveries = useMemo(() => {
    return applicationsState.applications.some((application) => application.emailDeliveryStatus === "failed");
  }, [applicationsState.applications]);

  const renderDeliveryIcon = (status: "pending" | "success" | "failed") => {
    if (status === "success") {
      return (
        <Tooltip title="Email was sent successfully by mail service.">
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
        </Tooltip>
      );
    }
    if (status === "failed") {
      return (
        <Tooltip title="Email queue/send failed. Admin can retry failed entries.">
          <CloseCircleOutlined style={{ color: "#ff4d4f", fontSize: 18 }} />
        </Tooltip>
      );
    }
    if (status === "pending") {
      return (
        <Tooltip title="Email is queued and awaiting mail service processing.">
          <ClockCircleOutlined style={{ color: "#faad14", fontSize: 18 }} />
        </Tooltip>
      );
    }
  };

  useEffect(() => {
    getStudyLines()
      .then((response) => {
        const mapped: StudyLine[] = response.map((doc: unknown) => doc as StudyLine);
        setStudyLines(mapped);
      })
      .catch((error) => {
        message.error(`Failed to load study lines: ${error.message}`);
      });
  }, []);

  useEffect(() => {
    const missing = applicationsState.applications.filter((application) => {
      return !!application.photoPath && !requestedPhotoIdsRef.current.has(application.id);
    });

    if (!missing.length) return;

    missing.forEach((application) => {
      requestedPhotoIdsRef.current.add(application.id);
      getDownloadURL(ref(storage, application.photoPath))
        .then((url) => {
          setPhotoUrls((prev) => ({ ...prev, [application.id]: url }));
        })
        .catch((error: any) => {
          message.error(`Failed to load picture: ${error.message}`);
        });
    });
  }, [applicationsState.applications]);

  const columns = [
    {
      title: "Name",
      dataIndex: "fullName",
      key: "fullName",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Study line",
      dataIndex: "studyline",
      key: "studyline",
      render: (value: string) => {
        const abbreviation = studyLines
          .find((studyLine) => studyLine.id === value)
          ?.abbreviation?.toLocaleUpperCase();
        return abbreviation || value || "-";
      },
    },
    {
      title: "Comment",
      dataIndex: "comment",
      key: "comment",
      render: (value: string) => (
        <Tooltip title={value}>
          <div style={{ maxWidth: 380, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value}
          </div>
        </Tooltip>
      ),
    },
    {
      title: "Application",
      dataIndex: "applicationFilePath",
      key: "applicationFilePath",
      render: (value: string) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={async () => {
            try {
              const url = await getDownloadURL(ref(storage, value));
              window.open(url, "_blank", "noopener,noreferrer");
            } catch (error: any) {
              message.error(`Failed to open application file: ${error.message}`);
            }
          }}
        >
          Open application
        </Button>
      ),
    },
    {
      title: "Picture",
      dataIndex: "photoPath",
      key: "photoPath",
      render: (_value: string, record: IntakeApplication) => (
        <Image
          src={photoUrls[record.id] || avatarPlaceholder}
          alt={`${record.fullName} photo`}
          width={64}
          height={64}
          preview={{ mask: "Open" }}
          style={{ maxWidth: 64, maxHeight: 64, objectFit: "cover", borderRadius: 8 }}
        />
      ),
    },
    {
      title: "Decision",
      dataIndex: "decision",
      key: "decision",
      render: (value: string) => {
        if (value === "accept") return <Tag color="green">Accept</Tag>;
        if (value === "reject") return <Tag color="red">Reject</Tag>;
        if (value === "maybe") return <Tag color="gold">Maybe</Tag>;
        return <Tag>Pending</Tag>;
      },
    },
    ...(applicationsState.submittedAt
      ? [
        {
          title: "Email status",
          key: "emailStatus",
          render: (_: unknown, record: IntakeApplication) => {
            if (record.decision === "accept" || record.decision === "reject") {
              return renderDeliveryIcon(record.emailDeliveryStatus);
            }
          },
        },
      ]
      : isAdmin
        ? [
          {
            title: "Actions",
            key: "actions",
            render: (_: unknown, record: IntakeApplication) => (
              <Space>
                <Popconfirm
                  title="Set decision to Accept"
                  description={`Mark ${record.fullName} as accepted?`}
                  okText="Accept"
                  disabled={!!applicationsState.submittedAt}
                  onConfirm={async () => {
                    setBusyId(`${record.id}-accept`);
                    try {
                      await setDecision(record.id, "accept");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Button
                    size="small"
                    type={record.decision === "accept" ? "primary" : "default"}
                    disabled={!!applicationsState.submittedAt}
                    loading={busyId === `${record.id}-accept`}
                  >
                    Accept
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Set decision to Maybe"
                  description={`Mark ${record.fullName} as maybe?`}
                  okText="Set maybe"
                  disabled={!!applicationsState.submittedAt}
                  onConfirm={async () => {
                    setBusyId(`${record.id}-maybe`);
                    try {
                      await setDecision(record.id, "maybe");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Button
                    size="small"
                    type={record.decision === "maybe" ? "primary" : "default"}
                    disabled={!!applicationsState.submittedAt}
                    loading={busyId === `${record.id}-maybe`}
                  >
                    Maybe
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Set decision to Reject"
                  description={`Mark ${record.fullName} as rejected?`}
                  okText="Reject"
                  okButtonProps={{ danger: true }}
                  disabled={!!applicationsState.submittedAt}
                  onConfirm={async () => {
                    setBusyId(`${record.id}-reject`);
                    try {
                      await setDecision(record.id, "reject");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Button
                    size="small"
                    danger
                    type={record.decision === "reject" ? "primary" : "default"}
                    disabled={!!applicationsState.submittedAt}
                    loading={busyId === `${record.id}-reject`}
                  >
                    Reject
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]
        : []),
  ];

  if (applicationsState.loading) {
    return <Loading />;
  }

  return (
    <Layout style={{ padding: isMobile ? 12 : 24 }}>
      <Title level={3} style={{ margin: 0 }}>
        Application Review
      </Title>
      <Content>
        <Paragraph>
          Board members can review all applications. Admins can classify applications and finalize the round.
        </Paragraph>

        {!!applicationsState.submittedAt && (
          <Paragraph>
            <Tag color="blue">Round submitted</Tag>
            Submitted at {applicationsState.submittedAt.toLocaleString()}
          </Paragraph>
        )}

        <Tabs
          defaultActiveKey="all"
          items={[
            {
              key: "all",
              label: `All applications (${applicationsState.applications.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={applicationsState.applications}
                  columns={columns}
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                  scroll={{ x: true }}
                />
              ),
            },
            {
              key: "pending",
              label: `Pending (${grouped.pending.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={grouped.pending}
                  columns={columns}
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                  scroll={{ x: true }}
                />
              ),
            },
            {
              key: "maybe",
              label: `Maybe (${grouped.maybe.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={grouped.maybe}
                  columns={columns}
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                  scroll={{ x: true }}
                />
              ),
            },
            {
              key: "accept",
              label: `Accept (${grouped.accept.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={grouped.accept}
                  columns={columns}
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                  scroll={{ x: true }}
                />
              ),
            },
            {
              key: "reject",
              label: `Reject (${grouped.reject.length})`,
              children: (
                <Table
                  rowKey="id"
                  dataSource={grouped.reject}
                  columns={columns}
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                  scroll={{ x: true }}
                />
              ),
            },
          ]}
        />

        {isAdmin && (
          <>
            <Divider />
            <Space wrap size={[8, 8]}>
              <Popconfirm
                title="Send invite test email"
                description="Send the invite template to yourself?"
                okText="Send test"
                onConfirm={async () => {
                  if (!currentUser?.email) {
                    message.error("Your user account has no email configured.");
                    return;
                  }
                  setSendingInviteTest(true);
                  try {
                    await sendTemplateTestEmail({
                      templateType: "invite",
                      email: currentUser.email,
                      fullName: currentUser.displayName ?? "ScrollBar Applicant",
                      bodyText: settingsState.settings.inviteEmailBodyText,
                      studyline: currentUser.studyline,
                    });
                  } finally {
                    setSendingInviteTest(false);
                  }
                }}
              >
                <Button type="default" loading={sendingInviteTest}>
                  Send Invite Test To Me
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Send rejection test email"
                description="Send the rejection template to your own email using your name variables?"
                okText="Send test"
                onConfirm={async () => {
                  if (!currentUser?.email) {
                    message.error("Your user account has no email configured.");
                    return;
                  }
                  setSendingRejectionTest(true);
                  try {
                    await sendTemplateTestEmail({
                      templateType: "rejection",
                      email: currentUser.email,
                      fullName: currentUser.displayName ?? "ScrollBar Applicant",
                      bodyText: settingsState.settings.rejectionEmailBodyText,
                    });
                  } finally {
                    setSendingRejectionTest(false);
                  }
                }}
              >
                <Button type="default" loading={sendingRejectionTest}>
                  Send Rejection Test To Me
                </Button>
              </Popconfirm>

              <Popconfirm
                title="Submit application round"
                description="This will send invite emails to accepted applicants and rejection emails to rejected applicants, then mark the round as submitted. Continue?"
                okText="Submit"
                disabled={!canSubmit}
                onConfirm={async () => {
                  if (!currentUser?.uid) return;
                  setSubmittingRound(true);
                  try {
                    const inviteResult = await addInvites(
                      grouped.accept.map((application) => ({
                        id: application.id,
                        email: application.email,
                        fullName: application.fullName,
                        studyline: application.studyline,
                      })),
                      settingsState.settings.inviteEmailBodyText
                    );
                    const rejectResult = await queueRejectedEmails(
                      grouped.reject.map((application) => ({
                        id: application.id,
                        email: application.email,
                        fullName: application.fullName,
                      })),
                      settingsState.settings.rejectionEmailBodyText
                    );

                    await setEmailDeliveryStatuses([
                      ...grouped.accept.map((application) => ({
                        id: application.id,
                        emailDeliveryStatus: inviteResult.successful.includes(application.id)
                          ? ("pending" as const)
                          : ("failed" as const),
                      })),
                      ...grouped.reject.map((application) => ({
                        id: application.id,
                        emailDeliveryStatus: rejectResult.successful.includes(application.id)
                          ? ("pending" as const)
                          : ("failed" as const),
                      })),
                    ]);

                    const failedTotal = inviteResult.failed.length + rejectResult.failed.length;
                    if (failedTotal) {
                      message.warning(
                        `${failedTotal} email${failedTotal === 1 ? "" : "s"} could not be queued. You can retry failed entries.`
                      );
                    } else {
                      message.success("Emails queued. Delivery status will update automatically when mail service completes.");
                    }

                    await submitRound(currentUser.uid);
                  } finally {
                    setSubmittingRound(false);
                  }
                }}
              >
                <Button
                  type="primary"
                  disabled={!canSubmit}
                  title={
                    applicationsState.submittedAt
                      ? "This round has already been submitted"
                      : !applicationsState.applications.length
                        ? "No applications to submit"
                        : canSubmit
                          ? "Submit the round and invite accepted applicants"
                          : "All applications must be classified as accepted or rejected to submit"
                  }
                  loading={submittingRound}
                >
                  Submit
                </Button>
              </Popconfirm>

              {applicationsState.submittedAt && hasFailedDeliveries && (
                <Popconfirm
                  title="Retry failed email entries"
                  description="Retry sending only entries that previously failed?"
                  okText="Retry"
                  onConfirm={async () => {
                    setRetryingFailed(true);
                    try {
                      const failedInvites = applicationsState.applications.filter(
                        (application) =>
                          application.decision === "accept" && application.emailDeliveryStatus === "failed"
                      );
                      const failedRejections = applicationsState.applications.filter(
                        (application) =>
                          application.decision === "reject" && application.emailDeliveryStatus === "failed"
                      );

                      const inviteRetryResult = await addInvites(
                        failedInvites.map((application) => ({
                          id: application.id,
                          email: application.email,
                          fullName: application.fullName,
                          studyline: application.studyline,
                        })),
                        settingsState.settings.inviteEmailBodyText
                      );

                      const rejectRetryResult = await queueRejectedEmails(
                        failedRejections.map((application) => ({
                          id: application.id,
                          email: application.email,
                          fullName: application.fullName,
                        })),
                        settingsState.settings.rejectionEmailBodyText
                      );

                      await setEmailDeliveryStatuses([
                        ...failedInvites.map((application) => ({
                          id: application.id,
                          emailDeliveryStatus: inviteRetryResult.successful.includes(application.id)
                            ? ("pending" as const)
                            : ("failed" as const),
                        })),
                        ...failedRejections.map((application) => ({
                          id: application.id,
                          emailDeliveryStatus: rejectRetryResult.successful.includes(application.id)
                            ? ("pending" as const)
                            : ("failed" as const),
                        })),
                      ]);

                      const failedTotal = inviteRetryResult.failed.length + rejectRetryResult.failed.length;
                      if (failedTotal) {
                        message.warning(
                          `${failedTotal} email${failedTotal === 1 ? "" : "s"} still could not be queued after retry.`
                        );
                      } else {
                        message.success("All previously failed email entries are queued. Delivery status will update automatically.");
                      }
                    } finally {
                      setRetryingFailed(false);
                    }
                  }}
                >
                  <Button icon={<RedoOutlined />} loading={retryingFailed}>
                    Retry failed emails
                  </Button>
                </Popconfirm>
              )}

              <Popconfirm
                title="Delete application round"
                description="This permanently deletes all applications and uploaded files for this round."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={async () => {
                  setDeletingRound(true);
                  try {
                    await deleteRound();
                  } finally {
                    setDeletingRound(false);
                  }
                }}
              >
                <Button danger loading={deletingRound}>
                  Delete round
                </Button>
              </Popconfirm>
            </Space>
          </>
        )}
      </Content>
    </Layout>
  );
}
