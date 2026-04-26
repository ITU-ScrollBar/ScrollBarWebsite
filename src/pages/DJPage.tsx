
import { Col, Divider, Layout, Row } from 'antd'
import { useWindowSize } from "../hooks/useWindowSize";
import useSettings from '../hooks/useSettings';
import HeaderBar from '../components/HomePage/HeaderBar';
import DEFAULT_EVENT_IMAGE from '../assets/images/background.png';
import MDEditor from '@uiw/react-md-editor';


export default function DJPage() {
  const { isMobile } = useWindowSize();
  const { settingsState } = useSettings();

  return (
    <Layout 
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        display: 'flex',
        flexDirection: 'column',
        height: 'auto',
      }}
    >
      <HeaderBar />
      <div 
        style={{
          position: 'relative',
          width: '100vw',
          height: isMobile ? '50vh' : '70vh',
          minHeight: '350px',
          overflow: 'hidden',
        }}
      >
        <img
          src={DEFAULT_EVENT_IMAGE}
          alt="Event background"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />

        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
          }}
        />

        <h1
          style={{
            position: 'absolute',
            top: '50%',
            left: isMobile ? '8%' : '10%',
            transform: 'translateY(-50%)',
            color: 'white',
            zIndex: 2,
            margin: 0,
            fontSize: isMobile ? '2.5rem' : '4rem',
            textAlign: 'left',
          }}
        >
          DJ's in ScrollBar
        </h1>
      </div>

      <Row justify="center" style={{ backgroundColor: '#fff' }}>
        <Col xs={22} sm={20} md={18} lg={16}>
          <div
            style={{
              padding: '32px 0',
              width: '100%',
              color: '#1a1a1a',
            }}
          >
            <MDEditor.Markdown
              style={{
                fontSize: '18px',
                lineHeight: '36px',
                textAlign: 'left',
                color: 'black',
                background: 'white',
              }}
              source={settingsState.settings.djdescription || "DJ description will appear here once it is configured in Global Settings."}
            />
          </div>
        </Col>
      </Row>
      
      <Divider />   
    </Layout>
  )
}
   
            