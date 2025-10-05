import React from 'react'

import { Button, Col, Divider, Image, Layout, Row, Space } from 'antd'

import Title from 'antd/es/typography/Title';
import Paragraph from 'antd/es/typography/Paragraph';
import { Header } from 'antd/es/layout/layout';
import HeaderBar from '../components/HomePage/HeaderBar';


export default function EventsPage() {
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
    <Image style={{width: '100vw'}} preview={false} ></Image>
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
            <Paragraph style={{ fontSize: '18px', lineHeight: '36px', textAlign: 'center' }}>
              ScrollBar is a student-run Friday bar at the IT University of Copenhagen, organized by our dedicated team of volunteer students. 
              Founded in 2004, our goal is to bring ITU students together in a cozy and welcoming atmosphere every Friday in the semester from 3PM to 2AM. 
              <br></br>
              <br></br>
              We regularly host DJs and organize a wide variety of events throughout the semester, including Birthday Parties, Back-to-School,
              Beerpong Tournaments, Halloween parties, Hand-In celebrations and more. We’re especially proud of our wide selection of beers and drinks, 
              but there’s something for everyone.
              <br></br>
              <br></br>
              This covers the basics of ScrollBar, but if you’re curious to learn more, you can check out our constitution at the bottom of the page.
            </Paragraph>
          </Col>
        </Row>
       <Divider />   
    </Layout>
  )
}
   
              
            


