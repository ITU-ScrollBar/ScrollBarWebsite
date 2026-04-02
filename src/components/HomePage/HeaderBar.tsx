import { Button, Menu } from "antd";
import { MenuOutlined, InstagramOutlined, FacebookOutlined } from "@ant-design/icons";
import { Header } from "antd/es/layout/layout";
import logo from "../../assets/images/logo.png";
import Link from "antd/es/typography/Link";
import { useNavigate } from "react-router";
import { useWindowSize } from "../../hooks/useWindowSize";

const linkcss = {
  fontWeight: "bold",
  textDecoration: "none",
  fontSize: "18px",
  padding: "0 10px",
};

const socialLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
};

const socialMenuContainerStyle = {
  display: "inline-flex",
  alignItems: "center",
};

export default function HeaderBar() {
  const navigate = useNavigate();
  const { isMobile } = useWindowSize();

  const openSocial = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const items = [
    {
      key: "1",
      label: (
        <Link style={linkcss} onClick={() => navigate("/events")}>
          EVENTS
        </Link>
      ),
    },
    {
      key: "4",
      label: (
        <Link
          style={linkcss}
          onClick={() => {
            // if already on home, just scroll
            if (window.location.pathname === "/") {
              const el = document.getElementById("volunteers");
              if (el) el.scrollIntoView({ behavior: "smooth" });
              return;
            }
            // otherwise navigate to home and pass a flag so Home can scroll after mount
            navigate("/", { state: { targetId: "volunteers" } });
          }}
        >
          OUR VOLUNTEERS
        </Link>
      ),
    },
    {
      key: "5",
      label: (
        <Link style={linkcss} onClick={() => navigate("/members/profile")}>
          TENDER SITE
        </Link>
      ),
    },
    {
      key: "6",
      label: (
        <div style={socialMenuContainerStyle}>
          <Button
            type="text"
            aria-label="Instagram"
            style={socialLinkStyle}
            icon={<InstagramOutlined style={{ fontSize: "22px", color: "white", marginLeft: isMobile ? "10px" : "0" }} />}
            onClick={(e) => {
              e.stopPropagation();
              openSocial("https://www.instagram.com/scrollbaritu");
            }}
          />
          <Button
            type="text"
            aria-label="Facebook"
            style={socialLinkStyle}
            icon={<FacebookOutlined style={{ fontSize: "22px", color: "white", marginLeft: "16px" }} />}
            onClick={(e) => {
              e.stopPropagation();
              openSocial("https://www.facebook.com/ScrollBar/");
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <Header 
      style={{
        position: 'absolute',
        top: 0,
        width: '100%',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        zIndex: 3,
        display: 'flex',
        alignItems: 'center',
        color: '#fff',
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          width: "100vw",
          marginTop: "100px",
          backgroundColor: "transparent",
        }}
      >
        <a href="/">
          <img
            style={{ maxWidth: "75%", width: "250px", height: "auto", cursor: "pointer" }}
            src={logo}
          />
        </a>
        <Menu
          theme="dark"
          mode="horizontal"
          overflowedIndicator={<MenuOutlined style={{ color: "white" }} />}
          style={{
            flex: "auto",
            backgroundColor: "transparent",
            fontWeight: "bold",
            justifyContent: "flex-end",
            minWidth: 0,
            maxWidth: "calc(100vw - 270px)",
          }}
          items={items}
        />
      </div>
    </Header>
  );
}
