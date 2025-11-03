import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '..';
import { Team, TeamCreateParams } from '../../types/types-file'; // Assuming you define your Event type here

const env =import.meta.env.VITE_APP_ENV as string;

/**
 * Returns reference to the teams collection.
 */
const getTeamsCollection = () =>
  collection(doc(collection(db, 'env'), env), 'teams');

/**
 * Creates a new team.
 */
export const createTeam = (team: TeamCreateParams): Promise<DocumentData> => {
  return addDoc(getTeamsCollection(), team);
};

/**
 * Deletes a team by ID.
 */
export const deleteTeam = (team: Team): Promise<void> => {
  const docRef = doc(getTeamsCollection(), team.id);
  return deleteDoc(docRef);
};

/**
 * Updates a specific field of a team.
 */
export const updateTeam = ({
  id,
  name,
}: Team): Promise<void> => {
  const docRef = doc(getTeamsCollection(), id);
  return updateDoc(docRef, { name });
};

/**
 * Streams teams ordered by name.
 */
export const streamTeams = (observer: { next: (snapshot: QuerySnapshot<DocumentData>) => void; error: (error: Error) => void }): Unsubscribe => {
  const eventsRef = collection(db, 'env', env, 'teams');
  const q = query(eventsRef);

  // Return the unsubscribe function from onSnapshot
  return onSnapshot(q, observer.next, observer.error);
};
