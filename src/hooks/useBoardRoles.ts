import { useEffect, useState } from 'react';
import { addRole, deleteRole, streamRoles, updateRole } from '../firebase/api/boardRoles';
import { BoardRole, Settings, Tender } from '../types/types-file';
import { message } from 'antd';
import { useNextEvent } from './useEvents';
import { snapshot } from 'node:test';

type BoardRolesState = {
    loading: boolean;
    boardRoles: BoardRole[];
}

type UseBoardRolesReturn = {
    boardRolesState: BoardRolesState;
    updateBoardRole: (id: string, update: { name?: string; assignedUser?: import('../types/types-file').Tender }) => void;
    addBoardRole: (name: string) => void;
    deleteBoardRole: (id: string) => void;
}

export default function useBoardRoles(): UseBoardRolesReturn {
    const [boardRolesState, setBoardRolesState] = useState<BoardRolesState>({
        loading: true,
        boardRoles: [],
    });

    useEffect(() => {
        setBoardRolesState((prev) => ({ ...prev, loading: true }));
        const unsubscribe = streamRoles(
            (snapshot) => {
                const data = snapshot.docs.map((doc) => ({
                    ...doc.data(),
                    id: doc.id
                })) as BoardRole[];
                console.log("Loaded data:", data);
                const rolesArray = Array.isArray(data) ? data : [data];
                setBoardRolesState((prev) => ({ ...prev, boardRoles: rolesArray, loading: false }));
            },
            (error: Error) => {
                message.error('An error occurred loading board roles: ' + error.message);
                setBoardRolesState((prev) => ({ ...prev, boardRoles: [], loading: false }));
            }
        );
        return unsubscribe;
    }, []);

    const updateBoardRole = (id: string, update: { name?: string; assignedUser?: Tender }) => {
        console.log('Updating role with id:', id, 'and update:', update); // Debug log to check the id and update being passed
        updateRole(id, update);
        if (update.name) {
            message.success(`Updated role name to ${update.name} successfully`);
        } else if (update.assignedUser) {
            message.success(`Assigned user ${update.assignedUser.displayName} to role successfully`);
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