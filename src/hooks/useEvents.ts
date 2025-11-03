import { message } from 'antd';
import { useEffect, useState } from 'react';
import {
  createEvent,
  deleteEvent,
  streamEvents,
  streamNextEvent,
  updateEvent as updateEventInDb,
} from '../firebase/api/events'; // Adjust the import path as necessary
import { Event, EventCreateParams } from '../types/types-file'; // Ensure you have Event type defined
import { Timestamp } from 'firebase/firestore';

type EventState = {
  loading: boolean;
  isLoaded: boolean;
  events: (Event & { key: string })[];
  previousEvents: (Event & { key: string })[];
};

type EventFirebase = {
  id: string;
  start: Timestamp;
  end: Timestamp;
  description: string;
  title: string;
  location: string;
  published: boolean;
  internal: boolean;
};



const useEvents = () => {
  const [eventState, setEventState] = useState<EventState>({
    loading: false,
    isLoaded: false,
    events: [],
    previousEvents: [],
  });

  useEffect(() => {
    setEventState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamEvents({
      next: (snapshot) => {
        const updatedEvents = snapshot.docs.map((doc) => {
          const data = doc.data() as EventFirebase; // Assuming Event is the correct type of data
          const id = doc.id;

          return {
            ...data,
            id,
            key: id, // `key` is guaranteed to be a string
            start: data.start?.toDate(), // Convert Timestamp to Date
            end: data.end?.toDate(), // Convert Timestamp to Date
          };
        });

        setEventState({
          loading: false,
          isLoaded: true,
          events: updatedEvents.filter(
            (_event) => _event.end >= new Date(Date.now())
          ),
          previousEvents: updatedEvents.filter(
            (_event) => _event.end < new Date(Date.now())
          ),
        });
      },
      error: (error: Error) => {
        message.error('An error occurred: ' + error.message);
      },
    });

    return unsubscribe;
  }, []); // Empty dependency array ensures this runs only once on mount

const addEvent = (event: EventCreateParams) => {
  return createEvent(event)
    .then((docData) => {
      message.success('Event created successfully!');
      return docData; // Return the DocumentData here
    })
    .catch((error) => {
      message.error('Error creating event: ' + error.message);
      return Promise.reject(error);
    });
};

  const removeEvent = (id: string) => {
    return deleteEvent(id);
  };

  const updateEvent = (id: string, field: string, value: any) => {
    return updateEventInDb({
      id,
      field,
      value,
    });
  };

  return { eventState, addEvent, removeEvent, updateEvent };
};

export const useNextEvent = () => {
  const [nextEvent, setNextEvent] = useState<(Event & { key: string }) | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const unsubscribe = streamNextEvent({
      next: (snapshot) => {
        if (snapshot.docs.length > 0) {
          const doc = snapshot.docs[0];
          const data = doc.data() as EventFirebase;
          const id = doc.id;

          const event = {
            ...data,
            id,
            key: id,
            start: data.start?.toDate(),
            end: data.end?.toDate(),
          };

          setNextEvent(event);
        } else {
          setNextEvent(null);
        }
        setLoading(false);
      },
      error: (error: Error) => {
        message.error('An error occurred: ' + error.message);
        setLoading(false);
      },
    });

    return unsubscribe;
  }, []);

  return { nextEvent, loading };
};

export default useEvents;
