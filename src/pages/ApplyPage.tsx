import { Button, Card, Form, Input, Layout, message, Typography, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useMemo, useState } from "react";
import { submitApplication } from "../firebase/api/applications";
import HeaderBar from "../components/HomePage/HeaderBar";
import heroImage from "../assets/images/hero.jpg";
import StudyLinePicker from "./members/StudyLinePicker";
import useSettings from "../hooks/useSettings";
import { Loading } from "../components/Loading";
import { getSignupWindowState } from "../utils/signupWindow";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

export default function ApplyPage() {
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<any[]>([]);
  const [photoFileList, setPhotoFileList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { settingsState } = useSettings();

  const signupWindow = useMemo(
    () =>
      getSignupWindowState(
        settingsState.settings.openForSignupsStart,
        settingsState.settings.openForSignupsEnd
      ),
    [settingsState.settings.openForSignupsEnd, settingsState.settings.openForSignupsStart]
  );

  if (settingsState.loading) {
    return <Loading centerOverlay />;
  }

  const handleSubmit = async (values: any) => {
    if (!fileList.length || !photoFileList.length) {
      message.error("Please upload both the application file and a recent photo.");
      return;
    }

    setSubmitting(true);
    try {
      await submitApplication({
        fullName: values.fullName,
        email: values.email,
        studyline: values.studyline,
        comment: values.comment,
        file: fileList[0].originFileObj as File,
        photoFile: photoFileList[0].originFileObj as File,
      });
      message.success("Application submitted successfully.");
      form.resetFields();
      setFileList([]);
      setPhotoFileList([]);
      setSubmitted(true);
    } catch (error: any) {
      message.error(error?.message || "Failed to submit application. Nothing was saved, please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: "50vh", background: "#f5f5f5" }}>
      <HeaderBar />
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "36vh",
          minHeight: 220,
          backgroundImage: `url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.45)",
          }}
        />
      </div>
      <Content style={{ display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "0 16px 56px" }}>
        <Card
          style={{
            width: "100%",
            maxWidth: 760,
            marginTop: -170,
            borderRadius: 16,
            boxShadow: "0 18px 48px rgba(0, 0, 0, 0.22)",
            position: "relative",
            zIndex: 1,
          }}
          styles={{ body: { padding: "28px 28px 24px" } }}
        >
          {signupWindow.isOpen ? (
            <>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "16px 8px" }}>
                  <Title level={2} style={{ marginBottom: 12 }}>
                    Application submitted
                  </Title>
                  <Paragraph style={{ fontSize: 16, marginBottom: 24 }}>
                    Thanks for applying to ScrollBar. We have received your application and will get back to you after review.
                  </Paragraph>
                  <Button type="primary" href="/">
                    Return to home page
                  </Button>
                </div>
              ) : (
                <>
                  <Title level={2}>Apply to ScrollBar</Title>
                  <Paragraph>
                    Fill out the form below and upload your application file. You will be contacted by the board after review.
                  </Paragraph>

                  <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item label="Full name" name="fullName" rules={[{ required: true, message: "Please enter your name" }]}>
                      <Input />
                    </Form.Item>

                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, type: "email", message: "Please enter a valid email" },
                        {
                          validator: (_, value: string) => {
                            if (!value || /@itu\.dk$/i.test(value.trim())) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error("Please use your ITU email address"));
                          },
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>

                    <Form.Item label="Study line" name="studyline" rules={[{ required: true, message: "Please select your study line" }]}>
                      <StudyLinePicker
                        fontSize={14}
                        filterStudyLine={(studyLine) => studyLine.name.toLowerCase() !== "legacy"}
                      />
                    </Form.Item>

                    <Form.Item
                      label="Application file"
                      required
                      validateStatus={!fileList.length ? "error" : "success"}
                      help={!fileList.length ? "Please upload one file" : undefined}
                    >
                      <Upload
                        fileList={fileList}
                        maxCount={1}
                        beforeUpload={() => false}
                        onChange={(info) => setFileList(info.fileList)}
                      >
                        <Button icon={<UploadOutlined />}>Select file</Button>
                      </Upload>
                    </Form.Item>

                    <Form.Item
                      label="Upload a recent picture of yourself (We want to see your face! Maybe we remember you)"
                      required
                      validateStatus={!photoFileList.length ? "error" : "success"}
                      help={!photoFileList.length ? "Please upload one file" : undefined}
                    >
                      <Upload
                        fileList={photoFileList}
                        maxCount={1}
                        beforeUpload={() => false}
                        onChange={(info) => setPhotoFileList(info.fileList)}
                      >
                        <Button icon={<UploadOutlined />}>Select file</Button>
                      </Upload>
                    </Form.Item>

                    <Form.Item label="Any other comments?" name="comment">
                      <Input.TextArea rows={6} />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={submitting}>
                      Submit application
                    </Button>
                  </Form>
                </>
              )}
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 8px" }}>
              <Title level={2} style={{ marginBottom: 12 }}>
                The application round is closed
              </Title>
              <Paragraph style={{ fontSize: 16, marginBottom: 8 }}>
                Applications are currently closed. We take in applications at the beginning of each semester.
                Please check back during the next application window.
              </Paragraph>
              <Button type="primary" href="/" style={{ marginTop: 16 }}>
                Back to homepage
              </Button>
            </div>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
