import { ReactNode } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Col, Layout, Row, Typography } from "antd";
import { useNavigate } from "react-router-dom";

const { Content } = Layout;
const { Title, Paragraph } = Typography;

type FormPageShellProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
};

/** Shared frame for the individual forms, so each page only holds its own fields. */
export default function FormPageShell({ title, description, children }: FormPageShellProps) {
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f5f5" }}>
      <Content style={{ padding: "32px 16px 48px" }}>
        <Row justify="center">
          <Col xs={24} sm={22} md={18} lg={14} xl={12}>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              style={{ paddingLeft: 0, marginBottom: 8 }}
              onClick={() => navigate("/tenders/forms")}
            >
              All forms
            </Button>
            <Card
              style={{ borderRadius: 12 }}
              styles={{ header: { borderBottom: "1px solid #f0f0f0" } }}
              title={
                <Title level={3} style={{ margin: 0 }}>
                  {title}
                </Title>
              }
            >
              <Paragraph type="secondary" style={{ marginBottom: 24 }}>
                {description}
              </Paragraph>
              {children}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
