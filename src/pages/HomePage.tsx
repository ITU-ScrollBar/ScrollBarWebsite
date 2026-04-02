import React, { useEffect, useMemo } from 'react'
import { Button, Col, Divider, Layout, Row, List } from 'antd'
import Title from 'antd/es/typography/Title'
import Paragraph from 'antd/es/typography/Paragraph'
import HeaderBar from '../components/HomePage/HeaderBar'
import useSettings from '../hooks/useSettings'
import MDEditor from '@uiw/react-md-editor'
import useTenders from '../hooks/useTenders'
import useBoardRoles from '../hooks/useBoardRoles'
import { UserAvatar } from '../components/UserAvatar'
import { getTenderDisplayName } from './members/helpers'
import { BoardRole, Role, StudyLine, Tender } from '../types/types-file'
import { getStudyLines } from '../firebase/api/authentication'
import { Loading } from '../components/Loading'
import CountDown from '../components/EventPage/EventCountDown'
import {useNextEvent}  from '../hooks/useEvents'
import { useLocation } from 'react-router-dom'

let cachedStudylines: StudyLine[] | null = null;
let cachePromise: Promise<StudyLine[]> | null = null;
type TenderWithRole = Tender & { role?: BoardRole };

export default function HomePage() {
  const { settingsState } = useSettings();
  const { tenderState } = useTenders();
  const { boardRolesState } = useBoardRoles();
  const { nextEvent, loading: eventLoading } = useNextEvent();
  // Board members: use boardRoles, sorted by sortingIndex, showing assigned users
  const boardMembers = useMemo(() => {
    if (!boardRolesState.boardRoles) return [];
    return [...boardRolesState.boardRoles]
      .sort((a, b) => (a.sortingIndex ?? 0) - (b.sortingIndex ?? 0))
      .filter((role) => !!role.assignedUser) // Only show for assigned roles
      .map(role => ({ ...role.assignedUser, role } as TenderWithRole)); // Map to assigned user with role info
  }, [boardRolesState.boardRoles]);
  const activeTenders = useMemo(() => { 
    return tenderState.tenders.filter(t => !t.roles?.includes(Role.BOARD) && t?.active && !boardMembers.includes(t))
  }, [tenderState.tenders, boardMembers]);
  const { state } = useLocation();
  const { targetId } = state || {};

  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView();
    }
  }, [targetId, settingsState.loading]);

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
            <Title level={2} style={{ scrollMarginTop: '135px' }} id="boardMembers">
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
      </div>
    </Layout>
  )
}

const UserList = ({ users }: { users: TenderWithRole[]}) => {
  const [studylines, setStudylines] = React.useState<StudyLine[]>([]);

  if (users.some(u => u.role)) {
    users.sort((a, b) => {
      if (a.role && b.role) {
        return (a.role.sortingIndex ?? 0) - (b.role.sortingIndex ?? 0);
      }
      return 0;
    });
  }

  useEffect(() => {
    // If already cached, use it immediately
    if (cachedStudylines) {
      setStudylines(cachedStudylines);
      return;
    }

    // If fetch is already in progress, wait for it
    if (cachePromise) {
      cachePromise.then((data) => {
        setStudylines(data);
      });
      return;
    }

    // Otherwise, fetch and cache
    cachePromise = getStudyLines()
      .then((response) => {
        const mapped: StudyLine[] = response.map((doc: unknown) => doc as StudyLine);
        cachedStudylines = mapped;
        setStudylines(mapped);
        return mapped;
      })
      .catch((error) => {
        console.error("Failed to fetch study lines: " + error.message);
        cachePromise = null; // Reset on error
        return [];
      });
  }, []);

  return (
    <List
      grid={{ gutter: 16, column: 10, xs: 3, sm: 3, md: 5, lg: 8, xl: 10 }}
      dataSource={users}
      renderItem={(user) => (
        <List.Item>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {user.role && (
              <div style={{ marginTop: 8, textAlign: 'center', fontWeight: 'bold' }}>{user.role.name}</div>
            )}
            <UserAvatar user={user} size={95} showHats={false} />
            <div style={{ marginTop: 8, textAlign: 'center' }}>{getTenderDisplayName(user)}</div>
            <div style={{ marginTop: 8, textAlign: 'center', color: 'grey' }}>{studylines.find(sl => sl.id === user.studyline)?.abbreviation?.toLocaleUpperCase()}</div>
          </div>
        </List.Item>
      )}
    />
  );
};
