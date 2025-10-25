import React from 'react'
import { Col, Image, Row, Typography } from 'antd'

import logo from '../../assets/images/logo.png';
import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import useSettings from '../../hooks/useSettings';

const { Text, Link } = Typography;

export default function FooterBar() {
  const { settingsState } = useSettings();

  return (
    <>
      <Row
        justify="space-between"
        align="top"
        gutter={[16, { xs: 8, sm: 16, md: 24, lg: 32 }]}
        style={{
          marginBottom: '10px',
          padding: '0px 20px',
          color: 'white',
        }}
      >
        {/* Left: Logo */}
        <Col
          lg={6}
          md={6}
          sm={24}
          xs={24}
          style={{ display: 'flex', justifyContent: 'flex-start' }}
        >
          <Image src={logo} style={{ width: '250px' }} preview={false} />
        </Col>

        {/* Center: Address */}
        <Col
          lg={6}
          md={6}
          sm={24}
          xs={24}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Title level={4} style={{ color: 'white', marginTop: '0px' }}>
            Address
          </Title>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text style={{ color: 'white' }}>ScrollBar</Text>
          </Paragraph>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text style={{ color: 'white' }}>IT-University of Copenhagen</Text>
          </Paragraph>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text style={{ color: 'white' }}>Rued Langgaards Vej 7</Text>
          </Paragraph>
          <Text style={{ color: 'white' }}>2300 København S</Text>
        </Col>

        {/* Right: Contact + Legal */}
        <Col
          lg={6}
          md={6}
          sm={24}
          xs={24}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <Title
            level={4}
            style={{ color: 'white', marginTop: '0px', marginBottom: '0px' }}
          >
            Contact
          </Title>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text style={{ color: 'white' }}>board@scrollbar.dk</Text>
          </Paragraph>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text style={{ color: 'white' }}>CVR: 28235283</Text>
          </Paragraph>

          <Title level={4} style={{ color: 'white', marginBottom: '0px' }}>
            Legal
          </Title>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text>
              <Link
                href={settingsState.settings.constitution}
                target="_blank"
              >
                Constitution
              </Link>
            </Text>
          </Paragraph>
          <Paragraph style={{ color: 'white', marginBottom: '0px' }}>
            <Text>
              <Link
                href={settingsState.settings.minutes}
                target="_blank"
              >
                Minutes from General Assembly
              </Link>
            </Text>
          </Paragraph>
        </Col>
      </Row>

      <Row
        justify="center"
        style={{
          padding: '12px 0',
          color: 'white',
        }}
      >
        <Col>
          <Text style={{ color: 'white' }}>
            ScrollBar © {new Date().getFullYear()}
          </Text>
        </Col>
      </Row>
    </>
  )
}
