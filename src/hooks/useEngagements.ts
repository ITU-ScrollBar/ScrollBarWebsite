import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
  createEngagement,
  deleteEngagement,
  setUpForGrabs as updateGrabs,
  streamEngagements,
  takeShift as updateShift,
  getUserEngagementsData,
} from '../firebase/api/engagements'; // Adjust the import path as necessary
import { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { Engagement, EngagementState } from '../types/types-file'; // Make sure Engagement is defined
import { useAuth } from '../contexts/AuthContext';

export const toEngagement = (doc: QueryDocumentSnapshot<DocumentData>): Engagement => {
  const data = doc.data();
  return {
    ...data,
    shiftEnd: data.shiftEnd.toDate(), // Convert Firestore Timestamp to JS Date
    id: doc.id,
    key: doc.id, // key guaranteed to be string
  } as Engagement;
};

// `enabled` stays false until a component actually reads this data (see
// useStreamRequest), so routes that don't need it never download it.
const useEngagements = (enabled: boolean) => {
  const [engagementState, setEngagementState] = useState<EngagementState>({
    loading: true,
    isLoaded: false,
    engagements: [],
  });
  // Keyed on the signed-in uid rather than the user doc, so editing your own
  // profile (study line, teams) doesn't re-download every engagement.
  const { authUid } = useAuth();

  useEffect(() => {
    if (!enabled || !authUid) {
      return;
    }
    setEngagementState((prev) => ({ ...prev, loading: true }));
  
    const unsubscribe = streamEngagements(
      (snapshot) => {
        const updatedEngagements = snapshot.docs.map(toEngagement);

  
        setEngagementState({
          loading: false,
          isLoaded: true,
          engagements: updatedEngagements,
        });
      },
      (error: Error) => {
        message.error('An error occurred loading engagements: ' + error.message);
        setEngagementState((prev) => ({ ...prev, loading: false }));
      }
    );
  
    return unsubscribe;
  }, [enabled, authUid]);

  // Stable references keep the context value (and consumers' effects, such as the
  // profile stats fetch) from re-running on every engagement snapshot.
  const getProfileData = useCallback((uid: string) => {
    return getUserEngagementsData(uid);
  }, []);

  const addEngagement = useCallback((newEngagement: Engagement) => {
    return createEngagement(newEngagement);
  }, []);

  const removeEngagement = useCallback((engagement: Engagement) => {
    return deleteEngagement(engagement);
  }, []);

  const takeShift = useCallback((id: string, userId: string) => {
    return updateShift(id, userId);
  }, []);

  const setUpForGrabs = useCallback((id: string, status: boolean) => {
    return updateGrabs(id, status);
  }, []);

  return {
    engagementState,
    addEngagement,
    removeEngagement,
    takeShift,
    setUpForGrabs,
    getProfileData,
  };
};

export default useEngagements;
