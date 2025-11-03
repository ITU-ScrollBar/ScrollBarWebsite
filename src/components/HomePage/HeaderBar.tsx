import { Image, Menu } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import logo from "../../assets/images/logo.png";
import Link from "antd/es/typography/Link";
import instagramIcon from "../../assets/images/instagram.png";
import facebookIcon from "../../assets/images/facebook.png";
import { useNavigate } from "react-router";

const linkcss = {
  fontWeight: "bold",
  textDecoration: "none",
  fontSize: "18px",
  padding: "0 10px",
};

export default function HeaderBar() {
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
      key: "3",
      label: (
        <Link style={linkcss} href="#menu">
          OUR MENU
        </Link>
      ),
    },
    {
      key: "4",
      label: (
        <Link style={linkcss} href="#volunteers">
          OUR VOLUNTEERS
        </Link>
      ),
    },
    {
      key: "5",
      label: (
        <div style={linkcss} onClick={() => navigate("/members/profile")}>
          TENDER SITE
        </div>
      ),
    },
    {
      key: "6",
      label: (
        <a
          href="https://www.instagram.com/scrollbaritu?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src={instagramIcon}
            preview={false}
            style={{ width: "22px", marginLeft: "-12px" }}
          />
        </a>
      ),
    },
    {
      key: "7",
      label: (
        <a
          href="https://www.facebook.com/ScrollBar/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            src={facebookIcon}
            preview={false}
            style={{ width: "22px", marginLeft: "-12px" }}
          />
        </a>
      ),
    },
  ];

  <Menu items={items} />;

  const navigate = useNavigate();

  return (
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
        style={{ width: "250px", height: "auto", cursor: "pointer" }}
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
  );
}
