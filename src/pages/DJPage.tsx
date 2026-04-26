
import { Col, Divider, Layout, Row } from 'antd'
import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import { useWindowSize } from "../hooks/useWindowSize";
import HeaderBar from '../components/HomePage/HeaderBar';
import CountDown from '../components/EventPage/EventCountDown';
import useEvents from '../hooks/useEvents';
import DEFAULT_EVENT_IMAGE from '../assets/images/background.png';


export default function EventsPage() {
  const { isMobile } = useWindowSize();

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
        

      </div>

      <Row justify="center">
       
      </Row>
      
      <Divider />   
    </Layout>
  )
}
   
            