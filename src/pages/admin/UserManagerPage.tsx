import { Layout, Tabs } from "antd";
import Title from "antd/es/typography/Title";
import { InvitedUsersTab } from "../../components/UserPage/InvitedUsersTab";
import { ExistingUsersTab } from "../../components/UserPage/ExistingUsersTab";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useEffect, useState } from "react";

export const UserManagerPage = () => {
    const { isMobile } = useWindowSize();
    const [ sidePadding, setSidePadding ] = useState<number>(96);

    useEffect(() => {
        if (isMobile) {
            setSidePadding(16);
        } else {
            setSidePadding(96);
        }
    }, [isMobile])

    return (
        <Layout style={{ margin: `24px ${sidePadding}px 0px ${sidePadding}px` }}>
            <Title>User Manager</Title>
            <Tabs
                tabPosition={isMobile ? "top" : "left" }
                defaultActiveKey="existingUsers"
                items={[
                    { key: 'existingUsers', label: 'Existing Users', children: <ExistingUsersTab /> },
                    { key: 'invitedUsers', label: 'Invited Users', children: <InvitedUsersTab /> },
                ]}
            />
        </Layout>
    );
};
