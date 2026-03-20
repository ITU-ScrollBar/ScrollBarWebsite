import { useEffect, useState } from 'react';
import { addRole, deleteRole, streamRoles, updateRole } from '../firebase/api/boardRoles';
import { BoardRole, Tender } from '../types/types-file';
import { getDocument } from '../firebase/api/common';
import { message } from 'antd';

type BoardRolesState = {
    loading: boolean;
    boardRoles: BoardRole[];
}

type UseBoardRolesReturn = {
    boardRolesState: BoardRolesState;
    updateBoardRole: (id: string, update: { name?: string; assignedUser?: Tender; sortingIndex?: number }) => void;
    addBoardRole: (name: string) => void;
    deleteBoardRole: (id: string) => void;
}

// Type used to represent a board role but with a reference to the user
// Must be converted to BoardRole and never exported in this format
interface FirebaseBoardRole {
  id: string;
  name: string;
  assignedUserId?: string;
  sortingIndex?: number;
}

export default function useBoardRoles(): UseBoardRolesReturn {
    const [boardRolesState, setBoardRolesState] = useState<BoardRolesState>({
        loading: true,
        boardRoles: [],
    });

    useEffect(() => {
        setBoardRolesState((prev) => ({ ...prev, loading: true }));
        const unsubscribe = streamRoles(
            async (snapshot) => {
                // Map FirebaseBoardRole and resolve assignedUser
                const roles = await Promise.all(snapshot.docs.map(async (doc) => {
                    const data = doc.data() as any;
                    // Always extract assignedUserId from assignedUserRef.id if present
                    let assignedUserId: string | undefined = undefined;
                    if (data.assignedUserRef?.id) {
                        assignedUserId = data.assignedUserRef.id;
                    }
                    let assignedUser: Tender | undefined = undefined;
                    if (assignedUserId) {
                        const user = await getDocument('users', assignedUserId, false);
                        if (user) assignedUser = user as unknown as Tender;
                    }
                    return {
                        id: doc.id,
                        name: data.name,
                        assignedUser,
                        sortingIndex: data.sortingIndex,
                    } as BoardRole;
                }));

                setBoardRolesState((prev) => ({ ...prev, boardRoles: roles, loading: false }));
            },
            (error: Error) => {
                message.error('An error occurred loading board roles: ' + error.message);
                setBoardRolesState((prev) => ({ ...prev, boardRoles: [], loading: false }));
            }
        );
        return unsubscribe;
    }, []);

    const updateBoardRole = (id: string, update: { name?: string; assignedUser?: Tender; sortingIndex?: number }) => {
        updateRole(id, update);
        if (update.name) {
            message.success(`Updated role name to ${update.name} successfully`);
        } else if (update.assignedUser) {
            message.success(`Assigned user ${update.assignedUser.displayName} to role successfully`);
        } else if (update.sortingIndex !== undefined) {
            message.success(`Updated role sorting index to ${update.sortingIndex} successfully`);
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