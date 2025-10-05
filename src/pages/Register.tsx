import React, { useState } from 'react';
import { Button, Form, Input, message, Select } from 'antd';
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
      message.error(`An error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>Sign up</Title>
      <Paragraph>Your e-mail must be pre-approved before you can sign up</Paragraph>
      <Form labelCol={{ span: 8 }} layout="horizontal" name="register" onFinish={register}>
        <Form.Item
          name="firstname"
          label="Firstname"
          rules={[{ required: true, message: 'This field is required' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="surname"
          label="Surname"
          rules={[{ required: true, message: 'This field is required' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="studyline"
          label="Studyline"
          rules={[{ required: true, message: 'This field is required' }]}
        >
          <Select
            options={studyLines?.map((line) => ({
              value: line.id,
              label: line.name,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="email"
          label="E-mail"
          rules={[
            { type: 'email', message: 'The input is not valid E-mail!' },
            { required: true, message: 'This field is required' },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'This field is required' }]}
          hasFeedback
        >
          <Input.Password />
        </Form.Item>

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
                return Promise.reject(
                  new Error('The two passwords that you entered do not match!')
                );
              },
            }),
          ]}
        >
          <Input.Password />
        </Form.Item>

        <Form.Item>
          <Button loading={loading} type="primary" htmlType="submit">
            Register
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}
