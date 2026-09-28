import React, { useEffect, useMemo } from "react";
import { Empty, Spin } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { UserAvatar } from "./UserAvatar";
import { getTenderDisplayName } from "../pages/members/helpers";
import { BoardRole, StudyLine, Tender } from "../types/types-file";
import { getStudyLines } from "../firebase/api/authentication";

let cachedStudylines: StudyLine[] | null = null;
let cachePromise: Promise<StudyLine[]> | null = null;

export type TenderWithRole = Tender & { role?: BoardRole };

type UserListProps = {
  users: TenderWithRole[];
  className?: string;
  getContactEmail?: (user: TenderWithRole) => string | undefined;
  columns: number;
  loading?: boolean;
};

export function UserList({ users, className, getContactEmail, columns, loading }: UserListProps) {
  const [studylines, setStudylines] = React.useState<StudyLine[]>([]);

  const sortedUsers = useMemo(() => {
    if (!users.some((u) => u.role)) {
      return users;
    }

    return [...users].sort((a, b) => {
      if (a.role && b.role) {
        return (a.role.sortingIndex ?? 0) - (b.role.sortingIndex ?? 0);
      }
      return 0;
    });
  }, [users]);

  useEffect(() => {
    // If already cached, use it immediately
    if (cachedStudylines) {
      setStudylines(cachedStudylines);
      return;
    }

    // If fetch is already in progress, wait for it
    if (cachePromise) {
      cachePromise.then((data) => {
        setStudylines(data);
      });
      return;
    }

    // Otherwise, fetch and cache
    cachePromise = getStudyLines()
      .then((response) => {
        const mapped: StudyLine[] = response.map((doc: unknown) => doc as StudyLine);
        cachedStudylines = mapped;
        setStudylines(mapped);
        return mapped;
      })
      .catch((error) => {
        console.error("Failed to fetch study lines: " + error.message);
        cachePromise = null; // Reset on error
        return [];
      });
  }, []);

  // Laid out like antd's List grid (Row gutter 16, each item 100/columns % wide) without
  // pulling List's pagination, select and input code into every page's startup JS.
  if (loading) {
    return <Spin><div style={{ minHeight: 53 }} /></Spin>;
  }
  if (!sortedUsers.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  return (
    <div className={className} style={{ display: "flex", flexWrap: "wrap", margin: "0 -8px", color: "rgba(0, 0, 0, 0.88)" }}>
      {sortedUsers.map((user, index) => {
        const contactEmail = getContactEmail?.(user);

        return (
          <div key={index} style={{ width: `${100 / columns}%`, padding: "0 8px", marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {user.role && (
                <div style={{ marginTop: 8, textAlign: "center", fontWeight: "bold" }}>{user.role.name}</div>
              )}
              <UserAvatar user={user} size={95} showHats={false} />
              <div style={{ marginTop: 8, textAlign: "center" }}>{getTenderDisplayName(user)}</div>
              <div style={{ marginTop: 8, textAlign: "center", color: "grey" }}>
                {studylines.find((sl) => sl.id === user.studyline)?.abbreviation?.toLocaleUpperCase()}
              </div>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="user-list-email-chip"
                  title={contactEmail}
                >
                  <MailOutlined />
                  <span>{contactEmail}</span>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
