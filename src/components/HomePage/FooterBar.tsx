import { Col, ConfigProvider, Image, Row, Typography } from "antd";
import logo from "../../assets/images/logo.png";
import Title from "antd/es/typography/Title";
import Paragraph from "antd/es/typography/Paragraph";
import useSettings from "../../hooks/useSettings";

const { Text, Link } = Typography;

export default function FooterBar() {
  const { settingsState } = useSettings();

  const textColor = "#FFFFFF";

  return (
    <Row
      justify="space-between"
      align="top"
      gutter={[16, { xs: 8, sm: 16, md: 24, lg: 32 }]}
      style={{
        marginBottom: "10px",
        padding: "0px 20px",
      }}
    >
      {/* Left: Logo */}
      <Col
        lg={6}
        md={6}
        sm={24}
        xs={24}
        style={{ display: "flex", justifyContent: "center" }}
      >
        <Image src={logo} style={{ width: "250px" }} preview={false} />
      </Col>

      {/* Center: Address */}
      <Col
        lg={6}
        md={6}
        sm={24}
        xs={24}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Title level={4} style={{ color: textColor, marginTop: "0px" }}>
          Address
        </Title>
        <Paragraph style={{ marginBottom: "0px" }}>
          <Text style={{ color: textColor }}>ScrollBar</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: "0px" }}>
          <Text style={{ color: textColor }}>IT-University of Copenhagen</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: "0px" }}>
          <Text style={{ color: textColor }}>Rued Langgaards Vej 7</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: "24px" }}>
          <Text style={{ color: textColor }}>2300 København S</Text>
        </Paragraph>
        <Paragraph>
          <Text style={{ color: textColor }}>ScrollBar © {new Date().getFullYear()}</Text>
        </Paragraph>
      </Col>

      {/* Right: Contact + Legal */}
      <Col
        lg={6}
        md={6}
        sm={24}
        xs={24}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Title
          level={4}
          style={{ color: textColor, marginTop: "0px", marginBottom: "0px" }}
        >
          Contact
        </Title>
        <Paragraph style={{ marginBottom: "0px" }}>
          <Text style={{ color: textColor }}>board@scrollbar.dk</Text>
        </Paragraph>
        <Paragraph style={{ marginBottom: "0px" }}>
          <Text style={{ color: textColor }}>CVR: 28235283</Text>
        </Paragraph>

        <Title level={4} style={{ color: textColor, marginBottom: "0px" }}>
          Legal
        </Title>
        <ConfigProvider theme={{ components: { Typography: { colorLink: "#FFE600", colorLinkHover: "#ffe600c2" } } }}>
          <Paragraph style={{marginBottom: "0px" }}>
            <Text>
              <Link href={settingsState.settings.constitution} target="_blank">
                Constitution
              </Link>
            </Text>
          </Paragraph>
          <Paragraph style={{ marginBottom: "0px" }}>
            <Text>
              <Link href={settingsState.settings.minutes} target="_blank">
                Minutes from General Assembly
              </Link>
            </Text>
          </Paragraph>
        </ConfigProvider>
      </Col>
    </Row>
  );
}
