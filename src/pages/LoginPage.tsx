// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adjust path
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Alert } from 'antd';

const LoginPage: React.FC = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const handleLogin = async (values: any) => {
        setError(null); // Clear previous errors
        setLoading(true);
        try {
            await login(values.email, values.password);
            // Login successful, onAuthStateChanged handles user state.
            // Redirect to the tender dashboard or desired page.
            navigate('/admin/my-shifts'); // Or wherever tenders should land
        } catch (err: any) {
            console.error(err);
            // Improve error message based on Firebase error codes if needed
            setError('Failed to log in. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <Card title="Tender Login" style={{ width: 350 }}>
                <Form
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
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            {loading ? 'Logging in...' : 'Log In'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default LoginPage;