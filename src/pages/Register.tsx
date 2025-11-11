import React, { useState } from 'react';
import { Button, Form, Input, message, Select, Card, Row, Col, Grid } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import {
  checkIfEmailIsInvited,
  createAccount,
} from '../firebase/api/authentication';
import Paragraph from 'antd/es/typography/Paragraph';
import Title from 'antd/es/typography/Title';
import  useTenders from '../hooks/useTenders';

export default function Register() {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
    const { tenderState } = useTenders();
    const { studylines: studyLines } = tenderState;
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const rowGutter: [number, number] = isMobile ? [16, 8] : [16, 16];
  const itemMb = isMobile ? 8 : 16;


  const register = async (form: any) => {
    setLoading(true);
    try {
      const isInvited = await checkIfEmailIsInvited(form.email);

      if (isInvited && !isInvited.registered) {
        const user = await createAccount(form);
        message.success('You have been signed up successfully');
        setUser(user);
      } else {
        message.error(
          'This e-mail has not been invited or an account is already registered to that email'
        );
      }
    } catch (error: any) {
      message.error(`An error occurred registering: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 16px' }}>
      <Card style={{ width: '100%', maxWidth: 960 }} bodyStyle={{ padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={2} style={{ marginBottom: 8 }}>Sign up</Title>
          <Paragraph style={{ margin: 0, /*textAlign: 'center' */ }}>Your e-mail must be pre-approved before you can sign up</Paragraph>
        </div>

        <Form name="register" layout="vertical" onFinish={register} requiredMark={false}>
          <Row gutter={rowGutter}>
            <Col xs={24} md={12}>
              <Form.Item
                name="firstname"
                label="Firstname"
                rules={[{ required: true, message: 'This field is required' }]}
                style={{ marginBottom: itemMb }}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="surname"
                label="Surname"
                rules={[{ required: true, message: 'This field is required' }]}
                style={{ marginBottom: itemMb }}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={rowGutter}>
            <Col xs={24} md={12}>
              <Form.Item
                name="studyline"
                label="Studyline"
                rules={[{ required: true, message: 'This field is required' }]}
                style={{ marginBottom: itemMb }}
              >
                <Select
                  placeholder="Please select"
                  options={studyLines?.map((line) => ({ value: line.id, label: line.name }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="email"
                label="E-mail"
                rules={[
                  { type: 'email', message: 'The input is not valid E-mail!' },
                  { required: true, message: 'This field is required' },
                ]}
                style={{ marginBottom: itemMb }}
              >
                <Input placeholder="example@domain.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={rowGutter}>
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'This field is required' }]}
                hasFeedback
                style={{ marginBottom: itemMb }}
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="confirm"
                label="Confirm Password"
                dependencies={['password']}
                hasFeedback
                rules={[
                  { required: true, message: 'Please confirm your password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords that you entered do not match!'));
                    },
                  }),
                ]}
                style={{ marginBottom: itemMb }}
              >
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'center', marginTop: 8 }}>
            <Button type="primary" htmlType="submit" size="large" loading={loading} style={{ backgroundColor: '#FFE600', borderColor: '#FFE600', color: '#111' }}>
              Register
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
