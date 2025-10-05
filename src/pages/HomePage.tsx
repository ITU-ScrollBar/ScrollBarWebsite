import React from 'react'

import { Button, Col, Divider, Image, Layout, Row, Space } from 'antd'

import hero from '../assets/images/background.png';
import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import { Header } from 'antd/es/layout/layout';
import HeaderBar from '../components/HomePage/HeaderBar';

export default function HomePage() {
  return (
    <Layout style={{ minHeight: '100vh', minWidth: '100vw', flexDirection: 'column', height: 'auto'}}>
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
        <HeaderBar />
      </Header>
    <Image style={{width: '100vw'}} preview={false} src={hero} ></Image>
    <Row justify="center">
          <Col
            md={24}
            lg={12}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Title id="about" level={2} style={{ scrollMarginTop: '135px' }}>
              What is ScrollBar?
            </Title>
            <Paragraph style={{ fontSize: '18px', lineHeight: '36px' }}>
              ScrollBar is a study-bar driven by the volunteer-organisation
              ScrollBar, founded in 2004, that aims to bring together students
              from ITU in a cozy atmosphere. ScrollBar is open every Friday
              within the semester from 3 PM - 2 AM. We regularly have DJs
              playing, we have a myriad of different events throughout the
              semester (Birthday parties, Back-To-School party aswell as
              Beer-pong tournaments). Were truly proud of our beer-assortment.
              That aside we serve the usual suspects of drinks. We just covered
              the ScrollBar-basics here, but if you are truly curious, you can
              find ScrollBars current constitution here
            </Paragraph>
          </Col>
        </Row>
       <Divider />
         (
          <Row justify="center">
            <Col
              md={24}
              lg={12}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Title
                id="join_scrollbar"
                level={2}
                style={{ scrollMarginTop: '135px' }}
              >
                Join Scrollbar Plz
              </Title>

              <Button
                type="primary"
                size="large"
                href={"settings.joinScrollBarLink"}
                target="_blank"
              >
                Apply now!
              </Button>
            </Col>
          </Row>
        )

        <Divider />
        <Row justify="center">
          <Col
            lg={18}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Title
              level={2}
              style={{ scrollMarginTop: '135px' }}
              id="volunteers"
            >
              The volunteers behind
            </Title>
            <Space
              direction="horizontal"
              style={{ width: '100%', justifyContent: 'space-around' }}
              size={16}
              wrap
            >
              alot of tenders here
            </Space>
          </Col>
        </Row>
        <Divider />
        <Row>
          <Col
            span={24}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '60px 0',
            }}
          >
            <Title id="future_events" style={{ scrollMarginTop: '135px' }}>
              Future events
            </Title>

            <Paragraph style={{ fontSize: '18px', lineHeight: '36px' }}>
              We have a lot of events coming up, so make sure to check our
              calendar regularly! You can also find all the events on our
              Facebook page.
            </Paragraph>
          </Col>
        </Row>
        </Layout>


  )
}
