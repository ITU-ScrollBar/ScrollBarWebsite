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
import { Engagement, EngagementState } from '../types/types-file'; // Make sure Engagement is defined
import { useAuth } from '../contexts/AuthContext';

const useEngagements = () => {
  const [engagementState, setEngagementState] = useState<EngagementState>({
    loading: false,
    isLoaded: false,
    engagements: [],
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    setEngagementState((prev) => ({ ...prev, loading: true }));
  
    const unsubscribe = streamEngagements(
      (snapshot) => {
        const updatedEngagements = snapshot.docs.map((doc) => {
          const data = doc.data();
          const id = doc.id;
          
          return {
            ...data,
            shiftEnd: data.shiftEnd.toDate(), // Convert Firestore Timestamp to JS Date
            id,
            key: id, // key guaranteed to be string
          } as Engagement;
        });
          
  
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
  }, [currentUser]);

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
