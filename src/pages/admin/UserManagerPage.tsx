import { Button, Layout, notification, Popconfirm, Table, TableColumnsType, Tabs, Tooltip } from "antd";
import Title from "antd/es/typography/Title";
import { InvitedUsersTab } from "../../components/UserPage/InvitedUsersTab";
import { ExistingUsersTab } from "../../components/UserPage/ExistingUsersTab";

export const UserManagerPage = () => {
    return (
        <Layout style={{ margin: '24px 96px 0px 96px' }}>
            <Title>User Manager</Title>
            <Tabs
                tabPosition="left"
                defaultActiveKey="existingUsers"
                items={[
                    { key: 'existingUsers', label: 'Existing Users', children: <ExistingUsersTab /> },
                    { key: 'invitedUsers', label: 'Invited Users', children: <InvitedUsersTab /> },
                ]}
            />
        </Layout>
    );
};
