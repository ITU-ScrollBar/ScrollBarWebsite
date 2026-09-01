// context/TeamContext.tsx

import { createContext, useContext, useMemo, ReactNode } from "react";
import useTeams from "../hooks/useTeams";
import { Team, TeamCreateParams } from "../types/types-file";
import { DocumentData } from "firebase/firestore";

export interface TeamContextType {
  teamState: {
    loading: boolean;
    isLoaded: boolean;
    teams: (Team & { key: string })[];
  };
  addTeam: (team: TeamCreateParams) => Promise<DocumentData>;
  removeTeam: (team: Team) => Promise<void>;
  updateTeam: (team: Team) => Promise<void>;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

export const TeamProvider = ({ children }: { children: ReactNode }) => {
  const { teamState, addTeam, removeTeam, updateTeam } = useTeams();

  const value = useMemo(
    () => ({ teamState, addTeam, removeTeam, updateTeam }),
    [teamState, addTeam, removeTeam, updateTeam]
  );

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>;
};

export const useTeamContext = () => {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error("useTeamContext must be used within a TeamProvider");
  }
  return context;
};
