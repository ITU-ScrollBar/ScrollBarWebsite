import { Avatar, Button, Divider, Drawer, Form, Input, notification, Select, Switch, Table, TableColumnsType, Tooltip, Upload } from "antd"
import { StudyLine, Tender } from "../../types/types-file";
import useTenders from "../../hooks/useTenders";
import { Key, useEffect, useState } from "react";
import { getStudyLines, uploadProfilePicture } from "../../firebase/api/authentication";
import { EditOutlined } from '@ant-design/icons'
import avatar from '../../assets/images/avatar.png';

export const ExistingUsersTab = () => {
    const { tenderState, updateTender } = useTenders();
    const [studylines, setStudylines] = useState<StudyLine[]>([]);
    const [api] = notification.useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Tender | null>(null);

    useEffect(() => {
        getStudyLines().then((response) => {
            const studylines: StudyLine[] = response.map((doc: any) => doc as StudyLine);
            setStudylines(studylines);
        }).catch((error) => {
            api.error({
                message: "Error",
                description: "Failed to fetch study lines: " + error.message,
                placement: "top",
            });
        });
    }, []);

    const userFilterMatch = (value: boolean | Key, record: Tender) => {
        if (value.toString() === 'admin') {
            return record.isAdmin;
        }
        return record.roles?.includes(value.toString()) ?? false;
    }

    const columns: TableColumnsType<Tender> = [
        { title: 'Name', dataIndex: 'displayName', key: 'displayName' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Studyline', dataIndex: 'studyline', key: 'studyline', render: (text: string) => studylines.find((line) => line.id === text)?.abbreviation || 'No studyline'},
        {
            title: 'Role',
            dataIndex: 'roles',
            key: 'roles',
            render: (roles: string[], record: Tender) => (record.isAdmin ? ['admin', ...roles] : [...roles]).join(', ') || 'No roles',
            filters: [
                { text: 'Admins', value: 'admin' },
                { text: 'Board members', value: 'board' },
                { text: 'Newbies', value: 'newbie' },
                { text: 'Anchors', value: 'anchor' },
            ],
            onFilter: userFilterMatch,
        },
        {
            title: 'Edit user',
            key: 'edit',
            render: (_text, record) => (
                <Tooltip title="Edit user">
                    <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => {
                        setEditingUser(record);
                        setIsModalOpen(true);
                    }} />
                </Tooltip>
            )
        }
    ];

    return (<>
        <Table columns={columns} dataSource={tenderState.tenders} rowKey="id" />
        <Drawer title="Edit User" open={isModalOpen} onClose={() => {setIsModalOpen(false); setEditingUser(null)}}>
            {editingUser && <Form>
                <Upload
                    customRequest={({ file }: any) => {
                        uploadProfilePicture(file, editingUser.email).then((url) => {
                            console.log("URL: ", url);
                            setEditingUser((prev) => prev ? ({ ...prev, photoUrl: url }) : prev);
                            updateTender(editingUser.id, 'photoUrl', url);
                            // TODO: We should also remove the previous file to avoid old pictures laying around forever
                        }).catch((error) => {
                            api.error({
                                message: "Error",
                                description: "Failed to upload profile picture: " + error.message,
                                placement: "top",
                            });
                        });
                    }}
                    showUploadList={false}
                >
                    <Avatar src={editingUser.photoUrl ? editingUser.photoUrl : avatar} size={128} style={{ marginBottom: 16 }} />
                </Upload>
                <Form.Item label="Name">
                    <Input
                        value={editingUser?.displayName}
                        onChange={(e) => setEditingUser((prev) => prev ? ({ ...prev, displayName: e.target.value }) : prev)}
                        onBlur={(e) => { if (editingUser) updateTender(editingUser.id, 'displayName', e.target.value) }}
                    />
                </Form.Item>
                <Divider />
                <Form.Item label="Email">
                    {editingUser?.email}
                </Form.Item>
                <Form.Item label="Studyline">
                    <Select
                        options={studylines.map((line) => ({ value: line.id, label: line.name }))}
                        value={studylines.find((line) => line.id === editingUser?.studyline)?.id}
                        onChange={(value) => {
                            setEditingUser((prev) => prev ? ({ ...prev, studyline: value }) : prev);
                            if (editingUser) updateTender(editingUser.id, 'studyline', value);
                        }}
                    />
                </Form.Item>
                <Form.Item label="Roles">
                    <Select
                        mode="multiple"
                        options={[
                            { value: 'regular_access', label: 'Regular Access' },
                            { value: 'tender', label: 'Tender' },
                            { value: 'newbie', label: 'Newbie' },
                            { value: 'anchor', label: 'Anchor' },
                            { value: 'board', label: 'Board' },
                            { value: 'tender_manager', label: 'Tender Manager' },
                            { value: 'shift_manager', label: 'Shift Manager' },
                            { value: 'user_manager', label: 'User Manager' },
                            { value: 'event_manager', label: 'Event Manager' },
                        ]}
                        value={editingUser?.roles}
                        onChange={(value) => {
                            setEditingUser((prev) => prev ? ({ ...prev, roles: value }) : prev);
                            if (editingUser) updateTender(editingUser.id, 'roles', value);
                        }}
                    />
                </Form.Item>
                <Form.Item label="Admin">
                    <Switch
                        checked={editingUser?.isAdmin}
                        onChange={(checked) => {
                            setEditingUser((prev) => prev ? ({ ...prev, isAdmin: checked }) : prev);
                            if (editingUser) updateTender(editingUser.id, 'isAdmin', checked);
                        }}
                    />
                </Form.Item>
            </Form>}
        </Drawer>
    </>)
}