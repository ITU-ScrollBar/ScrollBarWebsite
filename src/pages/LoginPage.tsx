// src/pages/LoginPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Alert } from 'antd';

const LoginPage: React.FC = () => {
    const { login, currentUser, resetPassword } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [resettingPassword, setResettingPassword] = useState<boolean>(false);
    const [form] = Form.useForm();

    useEffect(() => {
        if (!loading && currentUser) {
            navigate('/members/profile', { replace: true }); // Redirect if already logged in
        }
    }, [loading, currentUser, navigate]);

    const handleLogin = async (values: any) => {
        setError(null); // Clear previous errors
        setLoading(true);
        try {
            await login(values.email, values.password);
            // Login successful, onAuthStateChanged handles user state.
            // Redirect to the tender dashboard or desired page.
            navigate('/members/profile');
        } catch (err: any) {
            console.error(err);
            // Improve error message based on Firebase error codes if needed
            setError('Failed to log in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const email = form.getFieldValue('email');
        if (!email) {
            setError('Please enter your email to reset password.');
            return;
        }
        setResettingPassword(true);
        await resetPassword(email);
        setResettingPassword(false);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Card title="Tender Login" style={{ width: 350 }}>
                <Form
                    form={form}
                    name="login"
                    onFinish={handleLogin}
                    layout="vertical"
                    requiredMark={false}
                >
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[{ required: true, type: 'email', message: 'Please input a valid email!' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Password"
                        name="password"
                        rules={[{ required: true, message: 'Please input your password!' }]}
                    >
                        <Input.Password />
                    </Form.Item>

                    {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '1rem' }} />}

                    <Form.Item>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                {loading ? 'Logging in...' : 'Log In'}
                            </Button>
                            <Button type="default" onClick={handleResetPassword} loading={resettingPassword}>
                                Forgot Password?
                            </Button>
                        </div>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default LoginPage;