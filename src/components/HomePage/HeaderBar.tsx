import React from 'react'
import { Col, Image, Menu, Row, Typography } from 'antd'
import { MenuOutlined } from '@ant-design/icons'

import logo from '../../assets/images/logo.png';
import MenuItem from 'antd/es/menu/MenuItem';
import Link from 'antd/es/typography/Link';
import { useNavigate } from "react-router";




const linkcss = {
  fontWeight: 'bold',
  textDecoration: 'none',
  fontSize: '18px',
  padding: '0 10px',
};


export default function HeaderBar() {

  const items = [
    {
      key: '1',
      label: <Link style={linkcss} href="#about">About Scrollbar</Link>,
    },
    {
      key: '3',
      label: <Link style={linkcss} href="#volunteers">Our volunteers</Link>,
    },
    {
      key: '4',
      label: <Link style={linkcss} href="#future_events">Future events</Link>,
    },
    {
      key: '5',
      label: <div style={linkcss} onClick={() => navigate("/tenders")}>Tender site</div>,
    },
  ];
  
  <Menu items={items} />

  let navigate = useNavigate();


  return (
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    width: '100vw',
    marginTop: '100px',
    backgroundColor: 'transparent',
    padding: '0 2rem',
  }}
>
  <Image
    style={{ height: '160px' }}
    src={logo}
    onClick={() => console.log("yeet")}
  />
  <Menu
    theme="dark"
    mode="horizontal"
    overflowedIndicator= {<MenuOutlined style={{ color: 'white' }} />}
    style={{
      flex: 1,
      backgroundColor: 'transparent',
      fontWeight: 'bold',
      justifyContent: 'flex-end',
      width: '100%',
    }}
    items={items}
  >

  </Menu>
</div>

  )
}
