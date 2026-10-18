import { Col, Layout, Row, Typography } from "antd";
import FormChoiceCards from "./Forms/components/FormChoiceCards";

const { Content } = Layout;
const { Title, Text } = Typography;

/** Hub that collects every member-facing form in one place. */
export default function FormsPage() {
  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "32px 16px 48px" }}>
        <Row justify="center">
          <Col xs={24} lg={20} xl={18}>
            <Title level={2} style={{ marginBottom: 4 }}>
              Submit something
            </Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
              Pick the form that fits what you need. Everything lands with the board or the
              relevant team.
            </Text>
            <FormChoiceCards />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
