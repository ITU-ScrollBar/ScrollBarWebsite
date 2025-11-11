import { Button } from "antd";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export const InactiveUserPage = () => {
    const { currentUser, logout } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = async () => {
        await logout();
        return <Navigate to="/login" replace />;
    }

    return (
        <div style={{ textAlign: 'center', marginTop: '20%', marginBottom: '10%' }}>
            <h1>Your account is inactive</h1>
            <p>Please contact <a href="mailto:board@scrollbar.dk">board@scrollbar.dk</a> if you believe this is an error.</p>
            <p>If you have multiple accounts, make sure you are logged in with the correct one.</p>
            <Button type="primary" onClick={handleLogout}>Logout</Button>
        </div>
    );
}