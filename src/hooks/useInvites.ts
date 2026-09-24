import { message } from "antd";
import { useEffect, useState } from "react";
import { streamInvitedUsers } from "../firebase/api/authentication";
import { Invite } from "../types/types-file";

// Only the admin invites tab needs this, so it streams on mount rather than app-wide.
export default function useInvites(): Invite[] {
  const [invites, setInvites] = useState<Invite[]>([]);

  useEffect(() => {
    return streamInvitedUsers({
      next: (snapshot) => {
        setInvites(snapshot.docs.map((doc) => ({ ...(doc.data() as Invite), id: doc.id, key: doc.id })));
      },
      error: (error) => {
        message.error(`An error occurred while streaming invited tenders: ${error.message}`);
      },
    });
  }, []);

  return invites;
}
