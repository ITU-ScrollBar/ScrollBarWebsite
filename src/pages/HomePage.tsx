import React, { useEffect } from 'react'
import { Button, Col, Divider, Layout, Row, List, Avatar, Space, Spin } from 'antd'
import Title from 'antd/es/typography/Title'
import Paragraph from 'antd/es/typography/Paragraph'
import { Header } from 'antd/es/layout/layout'
import HeaderBar from '../components/HomePage/HeaderBar'
import useSettings from '../hooks/useSettings'
import MDEditor from '@uiw/react-md-editor'
import useTenders from '../hooks/useTenders'
import { UserAvatar } from '../components/UserAvatar'
import { getTenderDisplayName } from './members/helpers'
import { StudyLine, Tender } from '../types/types-file'
import { getStudyLines } from '../firebase/api/authentication'

export default function HomePage() {
  const { settingsState } = useSettings();
  const { tenderState } = useTenders();

  const activeTenders = tenderState.tenders.filter(t => !t.roles?.includes('passive') && !t.roles?.includes('board'));
  const boardMembers = tenderState.tenders.filter(t => t.roles?.includes('board'));

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
              {settingsState.settings.homepageTitle}
            </Title>
            <Paragraph
              style={{
                fontSize: '18px',
                lineHeight: '36px',
                textAlign: 'center',
              }}
            >
              {settingsState.settings.homepageDescription}
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
            <UserList users={boardMembers} />
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
            <UserList users={activeTenders} />
          </Col>
        </Row>

        <Divider />
      </div>
    </Layout>
  )
}

const UserList = ({ users }: { users: Tender[] }) => {
  const [studylines, setStudylines] = React.useState<StudyLine[]>([]);

  useEffect(() => {
    getStudyLines().then((response) => {
        const studylines: StudyLine[] = response.map((doc: any) => doc as StudyLine);
        setStudylines(studylines);
    }).catch((error) => {
        console.error("Failed to fetch study lines: " + error.message);
    });
  }, []);

  return (
    <List
      grid={{ gutter: 16, column: 10, xs: 4, sm: 3, md: 5, lg: 8, xl: 10 }}
      dataSource={users}
      renderItem={(user) => (
        <List.Item>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <UserAvatar user={user} size={64} />
            <div style={{ marginTop: 8, textAlign: 'center' }}>{getTenderDisplayName(user)}</div>
            <div style={{ marginTop: 8, textAlign: 'center' }}>{studylines.find(sl => sl.id === user.studyline)?.abbreviation?.toLocaleUpperCase()}</div>
          </div>
        </List.Item>
      )}
    />
  );
};