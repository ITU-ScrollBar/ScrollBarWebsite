import { useEffect, useMemo, useState } from 'react';
import { addRole, deleteRole, streamRoles, updateRole } from '../firebase/api/boardRoles';
import { BoardRole, Tender } from '../types/types-file';
import { message } from 'antd';
import { DocumentReference } from 'firebase/firestore';
import { useTenderContext } from '../contexts/TenderContext';

type BoardRolesState = {
  loading: boolean;
  boardRoles: BoardRole[];
}

type UseBoardRolesReturn = {
  boardRolesState: BoardRolesState;
  updateBoardRole: (id: string, update: { name?: string; assignedUser?: Tender; sortingIndex?: number; contactEmail?: string }) => void;
  addBoardRole: (name: string) => void;
  deleteBoardRole: (id: string) => void;
}

// Type used to represent a board role but with a reference to the user
// Must be converted to BoardRole and never exported in this format
interface FirebaseBoardRole {
  id: string;
  name: string;
  assignedUserRef?: DocumentReference | null;
  sortingIndex?: number;
  contactEmail?: string;
}

export default function useBoardRoles(): UseBoardRolesReturn {
  const { tenderState } = useTenderContext();
  const [rolesState, setRolesState] = useState<{ loading: boolean; roles: FirebaseBoardRole[] }>({
    loading: true,
    roles: [],
  });

  useEffect(() => {
    const unsubscribe = streamRoles(
      (snapshot) => {
        const roles = snapshot.docs.map((doc) => ({ ...(doc.data() as FirebaseBoardRole), id: doc.id }));
        setRolesState({ loading: false, roles });
      },
      (error: Error) => {
        message.error('An error occurred loading board roles: ' + error.message);
        setRolesState({ loading: false, roles: [] });
      }
    );
    return unsubscribe;
  }, []);

  // Assigned users come from the active users TenderProvider already streams,
  // instead of a getDoc per role after the roles snapshot. Roles whose user is
  // inactive or deleted show as unassigned.
  const boardRolesState = useMemo<BoardRolesState>(() => {
    const tendersById = new Map(tenderState.tenders.map((t) => [t.uid, t]));
    return {
      loading: rolesState.loading || tenderState.loading,
      boardRoles: rolesState.roles.map((role) => ({
        id: role.id,
        name: role.name,
        assignedUser: role.assignedUserRef ? tendersById.get(role.assignedUserRef.id) : undefined,
        sortingIndex: role.sortingIndex,
        contactEmail: role.contactEmail,
      } as BoardRole)),
    };
  }, [rolesState, tenderState.tenders, tenderState.loading]);

  const updateBoardRole = (id: string, update: { name?: string; assignedUser?: Tender; sortingIndex?: number; contactEmail?: string }) => {
    updateRole(id, update);
    if (update.name) {
      message.success(`Updated role name to ${update.name} successfully`);
    } else if (update.assignedUser) {
      message.success(`Assigned user ${update.assignedUser.displayName} to role successfully`);
    } else if (update.sortingIndex !== undefined) {
      message.success(`Updated role sorting index to ${update.sortingIndex} successfully`);
    } else if (update.contactEmail !== undefined) {
      message.success("Updated role contact email successfully");
    } else {
      message.success('Updated board role successfully');
    }
  };

  const addBoardRole = (name: string) => {
    addRole({name: name});
    message.success(`Added role ${name} successfully`);
  };

  const deleteBoardRole = (id: string) => {
    deleteRole(id);
    message.success('Deleted board role successfully');
  };

  return { boardRolesState, updateBoardRole, addBoardRole, deleteBoardRole };
}