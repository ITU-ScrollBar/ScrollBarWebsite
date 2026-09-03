import { CommentOutlined, InboxOutlined, ToolOutlined } from "@ant-design/icons";
import { Card, Col, Row, Typography } from "antd";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

type FormChoice = {
  key: string;
  path: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const formChoices: FormChoice[] = [
  {
    key: "ticket",
    path: "/tenders/forms/ticket",
    icon: <ToolOutlined />,
    title: "Report an issue or idea",
    description:
      "Something in the bar is broken, or you have an idea for something new. Goes to the IT or maintenance team.",
  },
  {
    key: "lending",
    path: "/tenders/forms/lending",
    icon: <InboxOutlined />,
    title: "Book ScrollBar equipment",
    description:
      "Ask to borrow Soundboks, speaker stands, ice buckets or iPads. Needs approval from two board members.",
  },
  {
    key: "feedback",
    path: "/tenders/forms/feedback",
    icon: <CommentOutlined />,
    title: "Anonymous feedback",
    description:
      "Anything you want the board to hear without us knowing who sent it. Nothing about you is stored.",
  },
];

export default function FormChoiceCards() {
  const navigate = useNavigate();

  return (
    <Row gutter={[16, 16]}>
      {formChoices.map((choice) => (
        <Col xs={24} md={8} key={choice.key}>
          <Card
            hoverable
            style={{ height: "100%", borderRadius: 12 }}
            styles={{ body: { display: "flex", flexDirection: "column", gap: 10 } }}
            onClick={() => navigate(choice.path)}
          >
            <div style={{ fontSize: 32, color: "#202020" }}>{choice.icon}</div>
            <Title level={4} style={{ margin: 0 }}>
              {choice.title}
            </Title>
            <Text type="secondary">{choice.description}</Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
