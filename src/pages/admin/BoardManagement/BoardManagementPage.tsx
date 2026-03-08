
import { useState, useEffect, useMemo } from "react";
import useTenders from "../../../hooks/useTenders";
import { Tender, Role } from "../../../types/types-file";
import { Layout, message, Input, Button, Table, Select, Popconfirm, Typography } from "antd";
import useBoardRoles from "../../../hooks/useBoardRoles";
import Loading from "../../../components/Loading";
import { Content, Header } from "antd/es/layout/layout";

export default function BoardManagementPage() {
    const [newRole, setNewRole] = useState("");
    const [boardMembers, setBoardMembers] = useState<Tender[]>([]);
    const { tenderState } = useTenders();
    const { boardRolesState, updateBoardRole, addBoardRole, deleteBoardRole } = useBoardRoles();
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editingRoleValue, setEditingRoleValue] = useState<string>("");

    useEffect(() => {
        if (!tenderState.loading && Array.isArray(tenderState.tenders)) {
            setBoardMembers(
                tenderState.tenders.filter(
                    (tender) => Array.isArray(tender.roles) && tender.roles.includes(Role.BOARD)
                )
            );
        }
    }, [tenderState.tenders, tenderState.loading]);

    const handleAddRole = async () => {
        if (newRole.trim() === "") return;
        await addBoardRole(newRole.trim());
        setNewRole("");
    };

    const handleAssignUser = async (roleId: string, user: Tender) => {
        await updateBoardRole(roleId, { assignedUser: user });
    };

    const handleDeleteRole = async (roleId: string) => {
        message.info('Deleting role... ' + roleId);
        deleteBoardRole(roleId);
    };

    const columns = useMemo(() => [
        {
            title: 'Role',
            dataIndex: 'name',
            key: 'name',
            render: (_: string, record: any) => {
                if (editingRoleId === record.id) {
                    return (
                        <Input
                            value={editingRoleValue}
                            autoFocus
                            onChange={e => setEditingRoleValue(e.target.value)}
                            onBlur={() => {
                                if (editingRoleValue !== record.name) {
                                    updateBoardRole(record.id, { name: editingRoleValue });
                                }
                                setEditingRoleId(null);
                            }}
                            onPressEnter={() => {
                                if (editingRoleValue !== record.name) {
                                    updateBoardRole(record.id, { name: editingRoleValue });
                                }
                                setEditingRoleId(null);
                            }}
                            style={{ minWidth: 120 }}
                        />
                    );
                }
                return (
                    <span
                        style={{ cursor: 'pointer', minWidth: 120, display: 'inline-block' }}
                        onClick={() => {
                            setEditingRoleId(record.id);
                            setEditingRoleValue(record.name);
                        }}
                    >
                        {record.name}
                    </span>
                );
            },
        },
        {
            title: 'Assigned User',
            dataIndex: 'assignedUser',
            key: 'assignedUser',
            render: (_: any, record: any) => (
                <Select
                    style={{ minWidth: 160 }}
                    value={record.assignedUser ? record.assignedUser.uid : ''}
                    onChange={(uid) => {
                        const selectedUser = boardMembers.find((user) => user.uid === uid);
                        handleAssignUser(record.id, selectedUser as Tender);
                    }}
                    placeholder="-- Select User --"
                    allowClear
                >
                    <Select.Option value="">-- Select User --</Select.Option>
                    {boardMembers.map((user) => (
                        <Select.Option key={user.uid} value={user.uid}>
                            {user.displayName}
                        </Select.Option>
                    ))}
                </Select>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => (
                <Popconfirm
                    title="Are you sure to delete this role?"
                    onConfirm={() => handleDeleteRole(record.id)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button danger size="small">Delete</Button>
                </Popconfirm>
            ),
        },
    ], [editingRoleId, editingRoleValue, boardMembers]);

    if (boardRolesState.loading || tenderState.loading) {
        return <Loading />;
    }

    return (
        <Layout>
            <Header style={{ background: '#fff', padding: 0 }}>
                <Typography.Title level={3} style={{ margin: 0 }}>
                    Board Management
                </Typography.Title>
            </Header>
            <Content style={{ margin: 24 }}>
                <div style={{ marginBottom: 24, display: 'flex', gap: 8 }}>
                    <Input
                        placeholder="New role name"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        style={{ width: 240 }}
                        onPressEnter={handleAddRole}
                    />
                    <Button type="primary" onClick={handleAddRole}>
                        Add Role
                    </Button>
                </div>
                <Table
                    dataSource={boardRolesState.boardRoles}
                    columns={columns}
                    rowKey="id"
                    pagination={false}
                />
            </Content>
        </Layout>
    );
}
