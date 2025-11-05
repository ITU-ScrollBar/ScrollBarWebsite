import {
  Button,
  Divider,
  Drawer,
  Form,
  Input,
  notification,
  Select,
  Switch,
  Table,
  TableColumnsType,
  TableColumnType,
  Tooltip,
} from "antd";
import { Role, StudyLine, Team, Tender } from "../../types/types-file";
import useTenders from "../../hooks/useTenders";
import { Key, useEffect, useState } from "react";
import { getStudyLines } from "../../firebase/api/authentication";
import { EditOutlined } from "@ant-design/icons";
import StudyLinePicker from "../../pages/members/StudyLinePicker";
import { UserAvatarWithUpload } from "../UserAvatar";
import { useWindowSize } from "../../hooks/useWindowSize";
import RoleTag from "../RoleTag";
import { roleToLabel } from "../../pages/members/helpers";
import useTeams from "../../hooks/useTeams";
import { Loading } from "../Loading";

export const ExistingUsersTab = () => {
  const { tenderState, updateTender } = useTenders();
  const { teamState } = useTeams();
  const [studylines, setStudylines] = useState<StudyLine[]>([]);
  const [api] = notification.useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Tender | null>(null);
  const [columns, setColumns] = useState<TableColumnsType<Tender>>([]);
  const { isMobile } = useWindowSize();
  const [data, setData] = useState<(Tender & { teams: Team[] })[]>([]);
  const [searchValue, setSearchValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    getStudyLines()
      .then((response) => {
        const studylines: StudyLine[] = response.map(
          (doc: any) => doc as StudyLine
        );
        setStudylines(studylines);
        setLoading(false);
      })
      .catch((error) => {
        api.error({
          message: "Error",
          description: "Failed to fetch study lines: " + error.message,
          placement: "top",
        });
      });
  }, []);

  useEffect(() => {
    const updatedData = tenderState.tenders.map((tender) => {
      const teams = teamState.teams.filter((team) =>
        tender.teamIds?.includes(team.id)
      );
      return { ...tender, teams };
    });
    setData(updatedData);
  }, [tenderState.tenders, teamState.teams, studylines]);

  const userFilterMatch = (value: boolean | Key, record: Tender) => {
    if (value.toString() === "admin") {
      return record.isAdmin;
    }
    return record.roles?.includes(value.toString()) ?? false;
  };
  const nameColumn = {
    title: "Name",
    dataIndex: "displayName",
    key: "displayName",
  };
  const emailColumn = { title: "Email", dataIndex: "email", key: "email" };
  const teamsColumn = {
    title: "Teams",
    dataIndex: "teams",
    key: "teams",
    render: (teams: Team[]) => {
      return teams.map((team) => team.name).join(", ") || "No teams";
    },
  };
  const rolesColumn = {
    title: "Role",
    dataIndex: "roles",
    key: "roles",
    render: (roles: string[], record: Tender) =>
      (record.isAdmin ? ["admin", ...roles] : roles).map((role) => (
        <RoleTag key={role} role={role} />
      )) || "No roles",
    filters: [
      { text: "Admins", value: Role.ADMIN },
      { text: "Board members", value: Role.BOARD },
      { text: "Newbies", value: Role.NEWBIE },
      { text: "Anchors", value: Role.ANCHOR },
    ],
    onFilter: userFilterMatch,
  };
  const editColumn: TableColumnType<Tender> = {
    title: "Edit user",
    key: "edit",
    render: (_text, record) => (
      <Tooltip title="Edit user">
        <Button
          type="text"
          shape="circle"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingUser(record);
            setIsModalOpen(true);
          }}
        />
      </Tooltip>
    ),
  };

  useEffect(() => {
    const studylineColumn = {
    title: "Studyline",
    dataIndex: "studyline",
    render: (_: any, record: Tender) => {
      const studyline = studylines.find(
        (line) => line.id === record.studyline
      );
      return studyline?.prefix ? `${studyline.prefix} in ${studyline.name}` : studyline?.name || "No studyline";
    },
    key: "studyline",
  };
  if (isMobile) {
      setColumns([nameColumn, emailColumn, editColumn]);
    } else {
      setColumns([
        nameColumn,
        emailColumn,
        teamsColumn,
        studylineColumn,
        rolesColumn,
        editColumn,
      ]);
    }
  }, [studylines, isMobile]);

  const filteredData = data.filter(
    (user) =>
      user.displayName?.toLowerCase().includes(searchValue.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchValue.toLowerCase())
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Input
        placeholder="Search by name or email..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ marginBottom: "16px", maxWidth: "300px" }}
      />
      <Table columns={columns} dataSource={filteredData} rowKey="id" />
      <Drawer
        title="Edit User"
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
      >
        {editingUser && (
          <Form>
            <UserAvatarWithUpload
              user={editingUser}
              onChange={(url) => {
                setEditingUser((prev) =>
                  prev ? { ...prev, photoUrl: url } : prev
                );
              }}
            />
            <Form.Item label="Name">
              <Input
                value={editingUser?.displayName}
                onChange={(e) =>
                  setEditingUser((prev) =>
                    prev ? { ...prev, displayName: e.target.value } : prev
                  )
                }
                onBlur={(e) => {
                  if (editingUser)
                    updateTender(
                      editingUser.uid,
                      "displayName",
                      e.target.value
                    );
                }}
              />
            </Form.Item>
            <Divider />
            <Form.Item label="Email">{editingUser?.email}</Form.Item>
            <Form.Item label="Teams">
              <Select
                mode="multiple"
                options={teamState.teams.map((team) => ({
                  label: team.name,
                  value: team.id,
                }))}
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                value={editingUser?.teamIds || []}
                onChange={(value) => {
                  setEditingUser((prev) =>
                    prev ? { ...prev, teamIds: value } : prev
                  );
                  if (editingUser)
                    updateTender(editingUser.uid, "teamIds", value);
                }}
              />
            </Form.Item>
            <Form.Item label="Studyline">
              <StudyLinePicker
                value={editingUser?.studyline}
                fontSize={14}
                onChange={(value) => {
                  setEditingUser((prev) =>
                    prev ? { ...prev, studyline: value } : prev
                  );
                  if (editingUser)
                    updateTender(editingUser.uid, "studyline", value);
                }}
              />
            </Form.Item>
            <Form.Item label="Roles">
              <Select
                mode="multiple"
                options={Object.entries(Role).map(([value, label]) => ({
                  value,
                  label: roleToLabel(label),
                }))}
                value={editingUser?.roles?.map((role) => role as Role) || []}
                onChange={(value) => {
                  setEditingUser((prev) =>
                    prev ? { ...prev, roles: value } : prev
                  );
                  if (editingUser)
                    updateTender(
                      editingUser.uid,
                      "roles",
                      value.map((role) => role.toLowerCase())
                    );
                }}
              />
            </Form.Item>
            <Form.Item label="Admin">
              <Switch
                checked={editingUser?.isAdmin}
                onChange={(checked) => {
                  setEditingUser((prev) =>
                    prev ? { ...prev, isAdmin: checked } : prev
                  );
                  if (editingUser)
                    updateTender(editingUser.uid, "isAdmin", checked);
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Drawer>
    </>
  );
};
