import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  createTeam,
  deleteTeam,
  streamTeams,
  updateTeam as updateTeamInDb,
} from '../firebase/api/teams'; // Adjust the import path as necessary
import { Timestamp } from 'firebase/firestore';
import { Team, TeamCreateParams } from '../types/types-file';

type TeamState = {
  loading: boolean;
  isLoaded: boolean;
  teams: (Team & { key: string })[];
};

type TeamFirebase = {
  id: string;
  name: string;
  memberIds: string[];
};

const useTeams = () => {
  const [teamState, setTeamState] = useState<TeamState>({
    loading: false,
    isLoaded: false,
    teams: [],
  });

  useEffect(() => {
    setTeamState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamTeams({
      next: (snapshot) => {
        const updatedTeams = snapshot.docs.map((doc) => {
          const data = doc.data() as TeamFirebase; // Assuming Team is the correct type of data
          const id = doc.id;

          return {
            ...data,
            id,
            key: id, // `key` is guaranteed to be a string
          };
        });

        setTeamState({
          loading: false,
          isLoaded: true,
          teams: updatedTeams,
        });
      },
      error: (error: Error) => {
        message.error('An error occurred: ' + error.message);
      },
    });

    return unsubscribe;
  }, []); // Empty dependency array ensures this runs only once on mount

const addTeam = (team: TeamCreateParams) => {
  return createTeam(team)
    .then((docData) => {
      message.success('Team created successfully!');
      return docData; // Return the DocumentData here
    })
    .catch((error) => {
      message.error('Error creating Team: ' + error.message);
      return Promise.reject(error);
    });
};

  const removeTeam = (team: Team) => {
    return deleteTeam(team);
  };

  const updateTeam = (team: Team) => {
    return updateTeamInDb(team);
  };

  return { teamState, addTeam, removeTeam, updateTeam };
};

export default useTeams;
