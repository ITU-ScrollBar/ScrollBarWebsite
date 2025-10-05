import React from 'react'
import { Col, Image, Row, Typography } from 'antd'

import logo from '../../assets/images/logo_black.png';
import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';


const { Text, Link } = Typography;



export default function FooterBar() {




  return (
    <><Row
          justify="space-between"
          align="top"
          gutter={[16, { xs: 8, sm: 16, md: 24, lg: 32 }]}
          style={{ marginBottom: '10px' }}
      >
          {/* Left: Logo */}
          <Col lg={6} md={6} sm={24} xs={24} style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Image src={logo} style={{ height: '145px' }} preview={false} />
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
              <Title level={4} style={{ color: 'black', marginTop: '0px' }}>
                  Address
              </Title>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>ScrollBar</Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>IT University of Copenhagen</Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>Rued Langaards Vej 7</Text>
              </Paragraph>
              <Text>2300 København S</Text>
          </Col>

          {/* Right: Contact + Legal */}
          <Col lg={6} md={6} sm={24} xs={24}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                        }}>
              <Title level={4} style={{ color: 'black', marginTop: '0px', marginBottom: '0px' }}>
                  Contact
              </Title>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>board@scrollbar.dk</Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>CVR: 28235283</Text>
              </Paragraph>
              <Title level={4} style={{ color: 'black', marginBottom: '0px' }}>Legal</Title>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>
                      <Link href="https://www.google.dk" target="_blank">Constitution</Link>
                  </Text>
              </Paragraph>
              <Paragraph style={{ marginBottom: '0px' }}>
                  <Text>
                      <Link href="https://www.google.dk" target="_blank">Minutes from General Assembly</Link>
                  </Text>
              </Paragraph>
          </Col>
      </Row><Row justify="center" style={{ padding: '12px 0' }}>
              <Col>
                  <Text>ScrollBar © {new Date().getFullYear()}</Text>
              </Col>
          </Row></>
  )
}
