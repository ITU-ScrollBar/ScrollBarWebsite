import { Tooltip, Button, TableColumnType, Table, Modal, Form, Input, Popconfirm, Select } from "antd";
import useTeams from "../../hooks/useTeams";
import { Team } from "../../types/types-file";
import { useEffect, useState } from "react";
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import useTenders from "../../hooks/useTenders";

export const TeamsTab = () => {
    const { teamState, addTeam, updateTeam, removeTeam } = useTeams();
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm<Team & { members: string[] }>();
    const { tenderState, updateTender } = useTenders();

    const teamWithTenders = (team: Team) => {
        return tenderState.tenders.filter(tender => tender.teamIds?.includes(team.id));
    }

    const columns: TableColumnType<Team>[] = [
        { title: 'Team Name', dataIndex: 'name', key: 'name' },
        { title: 'Members', dataIndex: 'memberIds', key: 'memberIds', render: (_text, record) => teamWithTenders(record).length ?? 0 },
        {
            title: 'Edit team',
            key: 'edit',
            render: (_text, record) => (
                <Tooltip title="Edit team">
                    <Button type="text" shape="circle" icon={<EditOutlined />} onClick={() => {
                        setEditingTeam(record);
                        setIsModalOpen(true);
                    }} />
                </Tooltip>
            )
        },
        {
            title: 'Delete team',
            key: 'delete',
            render: (_text, record) => (
                <Tooltip title="Delete team">
                    <Popconfirm title="Are you sure you want to delete this team?" onConfirm={() => removeTeam(record)}>
                        <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Tooltip>
            )
        }
    ];

    useEffect(() => {
        if (editingTeam) {
            form.setFieldsValue({
                name: editingTeam.name,
                members: teamWithTenders(editingTeam).map(tender => tender.uid),
            });
        }
    }, [editingTeam]);

    return <>
        <Table columns={columns} dataSource={teamState.teams} rowKey="id" footer={() => <Button type="primary" onClick={() => {setEditingTeam(null); setIsModalOpen(true)}}>Add team</Button>} />
        {<Modal
            onCancel={() => {setIsModalOpen(false); setEditingTeam(null); form.resetFields();}}
            onOk={() => {
                form.validateFields().then(values => {
                    if (editingTeam) {
                        updateTeam({ ...editingTeam, name: values.name });
                        tenderState.tenders.forEach(tender => {
                            const isInTeam = values.members.includes(tender.uid);
                            const wasInTeam = tender.teamIds?.includes(editingTeam.id);
                            if (isInTeam && !wasInTeam) {
                                const updatedTeamIds = tender.teamIds ? [...tender.teamIds, editingTeam.id] : [editingTeam.id];
                                updateTender(tender.uid, 'teamIds', updatedTeamIds);
                            } else if (!isInTeam && wasInTeam) {
                                const updatedTeamIds = tender.teamIds?.filter(id => id !== editingTeam.id) || [];
                                updateTender(tender.uid, 'teamIds', updatedTeamIds);
                            }
                        });
                    } else {
                        addTeam({ name: values.name });
                    }
                    setIsModalOpen(false);
                });
            }}
            title={editingTeam ? "Edit Team" : "Add Team"} open={isModalOpen}>
            <Form form={form}>
                <Form.Item label="Team Name" name="name">
                    <Input
                        value={editingTeam?.name}
                    />
                </Form.Item>
                <Form.Item label="Members" name="members">
                    <Select 
                        mode="multiple"
                        options={tenderState.tenders.map(tender => ({ label: tender.displayName, value: tender.uid }))}
                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    />
                </Form.Item>
            </Form>
        </Modal>}
    </>
}