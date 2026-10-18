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
import { DocumentData, QueryDocumentSnapshot, Timestamp } from 'firebase/firestore';

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
  shiftsPublished: boolean;
  internal: boolean;
  deleted?: boolean;
};



export const toEvent = (doc: QueryDocumentSnapshot<DocumentData>): Event & { key: string } => {
  const data = doc.data() as EventFirebase;
  return {
    ...data,
    id: doc.id,
    key: doc.id, // `key` is guaranteed to be a string
    start: data.start?.toDate(), // Convert Timestamp to Date
    end: data.end?.toDate(), // Convert Timestamp to Date
  };
};

// `enabled` stays false until a component actually reads this data (see
// useStreamRequest), so routes that don't need it never download it.
const useEvents = (enabled: boolean) => {
  const [eventState, setEventState] = useState<EventState>({
    loading: true,
    isLoaded: false,
    events: [],
    previousEvents: [],
  });

  useEffect(() => {
    if (!enabled) return;
    setEventState((prev) => ({ ...prev, loading: true }));

    const unsubscribe = streamEvents({
      next: (snapshot) => {
        const updatedEvents = snapshot.docs
          .map(toEvent)
          // Soft-deleted events are filtered here rather than in the query so
          // the stream can keep a single inequality filter for its date window.
          .filter((event) => !event.deleted);

        const now = new Date(Date.now());

        setEventState({
          loading: false,
          isLoaded: true,
          events: updatedEvents.filter(
            (_event) => _event.end >= now
          ),
          previousEvents: updatedEvents.filter(
            (_event) => _event.end < now
          ),
        });
      },
      error: (error: Error) => {
        message.error('An error occurred loading events: ' + error.message);
        setEventState((prev) => ({ ...prev, loading: false }));
      },
    });

    return unsubscribe;
  }, [enabled]);

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
        message.error('An error occurred loading next event: ' + error.message);
        setLoading(false);
      },
    });

    return unsubscribe;
  }, []);

  return { nextEvent, loading };
};

export default useEvents;
