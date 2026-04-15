import { useEffect, useMemo } from 'react'
import { Button, Col, Divider, Layout, Row } from 'antd'
import Title from 'antd/es/typography/Title'
import Paragraph from 'antd/es/typography/Paragraph'
import HeaderBar from '../components/HomePage/HeaderBar'
import useSettings from '../hooks/useSettings'
import MDEditor from '@uiw/react-md-editor'
import useTenders from '../hooks/useTenders'
import useBoardRoles from '../hooks/useBoardRoles'
import { Loading } from '../components/Loading'
import CountDown from '../components/EventPage/EventCountDown'
import {useNextEvent}  from '../hooks/useEvents'
import { useLocation } from 'react-router-dom'
import { UserList, TenderWithRole } from '../components/UserList'
import { useWindowSize } from '../hooks/useWindowSize'
import { getSignupWindowState } from '../utils/signupWindow'

export default function HomePage() {
  const { settingsState } = useSettings();
  const { tenderState } = useTenders();
  const { boardRolesState } = useBoardRoles();
  const { nextEvent, loading: eventLoading } = useNextEvent();
  const { isMobile } = useWindowSize();

  // Board members: use boardRoles, sorted by sortingIndex, showing assigned users
  const boardMembers = useMemo(() => {
    if (!boardRolesState.boardRoles) return [];
    return [...boardRolesState.boardRoles]
      .sort((a, b) => (a.sortingIndex ?? 0) - (b.sortingIndex ?? 0))
      .filter((role) => !!role.assignedUser) // Only show for assigned roles
      .map(role => ({ ...role.assignedUser, role } as TenderWithRole)); // Map to assigned user with role info
  }, [boardRolesState.boardRoles]);
  const activeTenders = useMemo(() => { 
    return tenderState.tenders.filter(t => t?.active && !boardMembers.includes(t))
  }, [tenderState.tenders, boardMembers]);
  const { state } = useLocation();
  const { targetId } = state || {};

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView();
    }
  }, [targetId, settingsState.loading]);

  const signupsOpen = useMemo(() => {
    return getSignupWindowState(
      settingsState.settings.openForSignupsStart,
      settingsState.settings.openForSignupsEnd
    ).isOpen;
  }, [settingsState.settings.openForSignupsEnd, settingsState.settings.openForSignupsStart]);

  if (settingsState.loading || boardRolesState.loading) {
    return <Loading centerOverlay={true} />;
  }


  return (
    <Layout style={{ minHeight: '100vh', width: '100%', flexDirection: 'column', height: 'auto'}}>
      <HeaderBar />
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
          padding: '50px 40px',
          backgroundColor: 'white',
          color: 'black',
          paddingTop: '50px',
          paddingBottom: '50px',
        }}
      >
        {!eventLoading && <CountDown nextEvent={nextEvent ? {
          title: nextEvent.title,
          start: nextEvent.start,
          end: nextEvent.end,
          event_url: nextEvent.event_url,
        } : null} />}
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

        {signupsOpen && (
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
                  href={'/apply'}
                  className="home-apply-button"
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
            <Title level={2} style={{ scrollMarginTop: '135px' }} id="boardMembers">
              The Board
            </Title>
            <UserList users={boardMembers} columns={isMobile ? 3 : 10} />
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
            <UserList users={activeTenders} columns={isMobile ? 3 : 10} />
          </Col>
        </Row>
      </div>
    </Layout>
  )
}
