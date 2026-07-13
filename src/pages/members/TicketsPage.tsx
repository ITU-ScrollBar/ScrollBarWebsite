import { useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  Row,
  Select,
  Typography,
} from "antd";
import { useAuth } from "../../contexts/AuthContext";
import useTickets from "../../hooks/useTickets";
import {
  TicketCreateParams,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
} from "../../types/types-file";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;

type TicketFormValues = {
  title: string;
  description: string;
  department: TicketDepartment;
  requestType: TicketRequestType;
  impact: TicketImpact;
};

const departmentOptions = [
  { label: "Maintenance", value: TicketDepartment.MAINTENANCE },
  { label: "IT", value: TicketDepartment.IT },
];

const requestTypeOptions = [
  { label: "New thing to create", value: TicketRequestType.NEW_REQUEST },
  { label: "Something is broken", value: TicketRequestType.BROKEN },
];

const impactOptions = [
  { label: "Low", value: TicketImpact.LOW },
  { label: "Medium", value: TicketImpact.MEDIUM },
  { label: "High", value: TicketImpact.HIGH },
];

export default function TicketsPage() {
  const { message } = AntdApp.useApp();
  const { currentUser } = useAuth();
  const { addTicket } = useTickets();
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<TicketFormValues>();

  const submitter = useMemo(
    () => ({
      uid: currentUser?.uid ?? "",
    }),
    [currentUser?.uid]
  );

  const onFinish = async (values: TicketFormValues) => {
    if (!submitter.uid) {
      return;
    }

    const payload: TicketCreateParams = {
      title: values.title.trim(),
      description: values.description.trim(),
      department: values.department,
      requestType: values.requestType,
      impact: values.impact,
    };

    setSubmitting(true);
    try {
      await addTicket(payload);
      message.success("Ticket created successfully!");
      form.resetFields();
      form.setFieldsValue({
        department: TicketDepartment.MAINTENANCE,
        requestType: TicketRequestType.BROKEN,
        impact: TicketImpact.LOW,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create ticket.";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "32px 16px 48px" }}>
        <Row justify="center">
          <Col xs={24} sm={22} md={18} lg={14} xl={12}>
            <Card
              style={{ borderRadius: 12 }}
              styles={{
                header: {
                  borderBottom: "1px solid #f0f0f0",
                },
              }}
              title={<Title level={3} style={{ margin: 0 }}>Create Ticket</Title>}
            >
              <Text style={{ display: "block", marginBottom: 20 }}>
                Describe your issue or idea and we will route it to the right team.
              </Text>

              <Form<TicketFormValues>
                form={form}
                layout="vertical"
                initialValues={{
                  department: TicketDepartment.MAINTENANCE,
                  requestType: TicketRequestType.BROKEN,
                  impact: TicketImpact.LOW,
                }}
                onFinish={onFinish}
                requiredMark={false}
              >
                <Form.Item
                  label="Title"
                  name="title"
                  rules={[
                    { required: true, message: "Please enter a title." },
                    { max: 120, message: "Title must be 120 characters or less." },
                  ]}
                >
                  <Input placeholder="Short summary of the issue" maxLength={120} />
                </Form.Item>

                <Form.Item
                  label="Description"
                  name="description"
                  rules={[
                    { required: true, message: "Please enter a description." },
                    { min: 10, message: "Description should be at least 10 characters." },
                  ]}
                >
                  <TextArea
                    rows={5}
                    placeholder="What happened, where, and any steps to reproduce"
                    showCount
                    maxLength={1500}
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Department"
                      name="department"
                      rules={[{ required: true, message: "Please select a department." }]}
                    >
                      <Select options={departmentOptions} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      label="Request Type"
                      name="requestType"
                      rules={[{ required: true, message: "Please select request type." }]}
                    >
                      <Select options={requestTypeOptions} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Impact"
                  name="impact"
                  rules={[{ required: true, message: "Please select impact." }]}
                >
                  <Select options={impactOptions} />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" loading={submitting} block>
                    Submit Ticket
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
