import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  createInternalEvent,
  deleteInternalEvent,
  streamInternalEvents,
  updateInternalEvent as updateInternalEventInDb,
} from '../firebase/api/internalEvents'; // Adjust the import path as necessary
import { InternalEvent, InternalEventCreateParams } from '../types/types-file'; // Ensure you have InternalEvent type defined
import { Timestamp } from 'firebase/firestore';

type InternalEventState = {
  loading: boolean;
  isLoaded: boolean;
  internalEvents: (InternalEvent & { key: string })[];
};

type InternalEventFirebase = {
  id: string;
  start: Timestamp;
  end: Timestamp;
  description: string;
  scope: string;
  title: string;
  location: string;
};

const useInternalEvents = () => {
  const [internalEventState, setInternalEventState] = useState<InternalEventState>({
    loading: false,
    isLoaded: false,
    internalEvents: [],
  });

  useEffect(() => {
    setInternalEventState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamInternalEvents({
      next: (snapshot) => {
        const updatedInternalEvents = snapshot.docs.map((doc) => {
          const data = doc.data() as InternalEventFirebase; // Assuming InternalEvent is the correct type of data
          const id = doc.id;

          return {
            ...data,
            id,
            key: id, // `key` is guaranteed to be a string
            start: data.start?.toDate(), // Convert Timestamp to Date
            end: data.end?.toDate(), // Convert Timestamp to Date
          };
        });

        setInternalEventState({
          loading: false,
          isLoaded: true,
          internalEvents: updatedInternalEvents.filter(
            (_internalEvent) => _internalEvent.end >= new Date(Date.now())
          ),
        });
      },
      error: (error: Error) => {
        message.error('An error occurred: ' + error.message);
      },
    });

    return unsubscribe;
  }, []); // Empty dependency array ensures this runs only once on mount

const addInternalEvent = (internalEvent: InternalEventCreateParams) => {
  return createInternalEvent(internalEvent)
    .then((docData) => {
      message.success('InternalEvent created successfully!');
      return docData; // Return the DocumentData here
    })
    .catch((error) => {
      message.error('Error creating internalEvent: ' + error.message);
      return Promise.reject(error);
    });
};

  const removeInternalEvent = (internalEvent: InternalEvent) => {
    return deleteInternalEvent(internalEvent);
  };

  const updateInternalEvent = (internalEvent: InternalEvent) => {
    return updateInternalEventInDb(internalEvent);
  };

  return { internalEventState, addInternalEvent, removeInternalEvent, updateInternalEvent };
};

export default useInternalEvents;
