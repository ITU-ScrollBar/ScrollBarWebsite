import React from 'react'
import { Button, Col, Divider, Layout, Row, Space, Spin } from 'antd'
import Title from 'antd/es/typography/Title'
import Paragraph from 'antd/es/typography/Paragraph'
import { Header } from 'antd/es/layout/layout'
import HeaderBar from '../components/HomePage/HeaderBar'
import useSettings from '../hooks/useSettings'
import MDEditor from '@uiw/react-md-editor'

export default function HomePage() {
  const { settingsState } = useSettings();

  if (settingsState.loading) {
    return <Spin size="large" />
  }

  return (
    <Layout style={{ minHeight: '100vh', width: '100%', flexDirection: 'column', height: 'auto'}}>
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
     {/* Hero video section */}
<div
  style={{
    position: 'relative',
    width: '100%',
    height: '100vh', // increased from 91vh → 100vh (10% taller)
    overflow: 'hidden',
  }}
>
  <video
    autoPlay
    loop
    muted
    playsInline
    style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
    }}
  >
    <source
      src={settingsState.settings.hero}
      type="video/mp4"
    />
  </video>

  {/* Black transparent overlay */}
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // 50% transparent black
      zIndex: 2,
    }}
  />
</div>


      {/* White content area below video */}
      <div
        style={{
          backgroundColor: 'white',
          color: 'black',
          paddingTop: '50px',
          paddingBottom: '50px',
        }}
      >
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
            <Paragraph
              style={{
                fontSize: '18px',
                lineHeight: '36px',
                textAlign: 'center',
              }}
            >
              ScrollBar is a student-run Friday bar at the IT University of
              Copenhagen, organized by our dedicated team of volunteer students.
              Founded in 2004, our goal is to bring ITU students together in a
              cozy and welcoming atmosphere every Friday in the semester from
              3PM to 2AM.
              <br />
              <br />
              We regularly host DJs and organize a wide variety of events
              throughout the semester, including Birthday Parties,
              Back-to-School, Beerpong Tournaments, Halloween parties, Hand-In
              celebrations and more. We’re especially proud of our wide
              selection of beers and drinks, but there’s something for everyone.
              <br />
              <br />
              This covers the basics of ScrollBar, but if you’re curious to
              learn more, you can check out our constitution at the bottom of
              the page.
            </Paragraph>
          </Col>
        </Row>

        {settingsState.settings.openForSignups && (
        <>
          <Divider />

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
              <Title id="join_scrollbar" level={2} style={{ scrollMarginTop: '135px' }}>
                {settingsState.settings.joinScrollBarTitle}
              </Title>

              <MDEditor.Markdown
                style={{
                  fontSize: '18px',
                  lineHeight: '36px',
                  textAlign: 'center',
                  color: 'black',
                  background: 'white',
                }}
                source={settingsState.settings.joinScrollBarText}
              />

              <Button
                type="primary"
                size="large"
                href={settingsState.settings.joinScrollBarLink}
                target="_blank"
              >
                Apply now!
              </Button>
            </Col>
          </Row>
        </>)}

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
            <Title level={2} style={{ scrollMarginTop: '135px' }} id="volunteers">
              The Board
            </Title>
            <Space
              direction="horizontal"
              style={{ width: '100%', justifyContent: 'space-around' }}
              size={16}
              wrap
            >
              alot of board members here
            </Space>
          </Col>
        </Row>

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
            <Title level={2} style={{ scrollMarginTop: '135px' }} id="volunteers">
              The Volunteers
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
      </div>
    </Layout>
  )
}
