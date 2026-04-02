import { Button, Input, Modal, Popconfirm, Table, TableColumnsType, Tooltip } from "antd";
import useTenders from "../../hooks/useTenders";
import { Invite } from "../../types/types-file";
import { DeleteOutlined } from '@ant-design/icons'
import { useState } from "react";

export const InvitedUsersTab = () => {
  const { invitedTenders, removeInvite, addInvite } = useTenders();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [mail, setMail] = useState("");

  const handleAddInvite = () => {
    addInvite(mail);
    setMail("");
  };

  const columns: TableColumnsType<Invite> = [
    { title: 'Email', dataIndex: 'id', key: 'id' },
    { 
      title: 'Registered',
      dataIndex: 'registered',
      key: 'registered',
      render: (registered: boolean) => registered ? 'Yes' : 'No',
      filters: [
        { text: 'Registered', value: true },
        { text: 'Not Registered', value: false }
      ],
      onFilter: (value, record) => record.registered === value
    },
    { title: 'Remove invite', key: 'remove', render: (_text, record) => (
      <Tooltip title="Remove invite">
        <Popconfirm title="Are you sure you want to remove this invite?" onConfirm={() => { removeInvite(record.id) }} okText="Yes" cancelText="No">
          <Button type="text" shape="circle" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Tooltip>
    ) }
  ];

  return (
    <>
      <Button onClick={() => setIsModalVisible(true)}>
        Invite User
      </Button>
      <Modal
        title="Invite User"
        open={isModalVisible}
        okText="Done"
        okType="default"
        onOk={() => setIsModalVisible(false)}
        cancelButtonProps={{ style: { display: 'none' } }}
        onCancel={() => setIsModalVisible(false)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <Input
            placeholder="Enter email"
            value={mail}
            onChange={(e) => setMail(e.target.value)}
            onPressEnter={handleAddInvite}
          />
          <Button type="primary" onClick={handleAddInvite}>
            Add
          </Button>
        </div>
      </Modal>
      <Table columns={columns} dataSource={invitedTenders} rowKey="id" />
    </>
  );
};