import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  createEngagement,
  deleteEngagement,
  setUpForGrabs as updateGrabs,
  streamEngagements,
  takeShift as updateShift,
} from '../firebase/api/engagements'; // Adjust the import path as necessary
import { Engagement, EngagementState } from '../types/types-file'; // Make sure Engagement is defined

const useEngagements = () => {
  const [engagementState, setEngagementState] = useState<EngagementState>({
    loading: false,
    isLoaded: false,
    engagements: [],
  });

  useEffect(() => {
    setEngagementState((prev) => ({ ...prev, loading: true }));
  
    const unsubscribe = streamEngagements(
      (snapshot) => {
        const updatedEngagements = snapshot.docs.map((doc) => {
            const data = doc.data() as Engagement;
            const id = doc.id;
          
            return {
              ...data,
              id,
              key: id, // key guaranteed to be string
            };
          });
          
  
        setEngagementState({
          loading: false,
          isLoaded: true,
          engagements: updatedEngagements,
        });
      },
      (error: Error) => {
        message.error('An error occurred: ' + error.message);
      }
    );
  
    return unsubscribe;
  }, []);

  const addEngagement = (newEngagement: Engagement) => {
    return createEngagement(newEngagement);
  };

  const removeEngagement = (engagement: Engagement) => {
    return deleteEngagement(engagement);
  };

  const takeShift = (id: string, userId: string) => {
    return updateShift(id, userId);
  };

  const setUpForGrabs = (id: string, status: boolean) => {
    return updateGrabs(id, status);
  };

  return {
    engagementState,
    addEngagement,
    removeEngagement,
    takeShift,
    setUpForGrabs,
  };
};

export default useEngagements;
