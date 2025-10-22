import { Spin } from "antd";

export const Loading = () => {
    // Should be a custom Scroll loader down the line
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        <Spin size="large" />
    </div>;
}