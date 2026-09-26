import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  streamEngagementsForShifts,
  streamUserFutureEngagements,
} from "../firebase/api/engagements";
import { streamShiftsByIds } from "../firebase/api/shifts";
import { streamEventsByIds } from "../firebase/api/events";
import { Engagement, Event, Shift } from "../types/types-file";
import { toEngagement } from "./useEngagements";
import { sortShifts, toShift } from "./useShifts";
import { toEvent } from "./useEvents";

export type MyShiftsState = {
  loading: boolean;
  shifts: Shift[];
  engagements: Engagement[];
  events: (Event & { key: string })[];
};

// Each stage remembers which ids it was loaded for, so loading stays true
// while a stage catches up after the ids change.
type Loaded<T> = { forKey: string; items: T[] };

/**
 * One user's upcoming shifts with everything needed to render them: the shifts,
 * every engagement on them (so coworkers show), and their events. Only these
 * documents are fetched, instead of streaming every shift, event and engagement.
 */
export const useMyShifts = (uid: string | undefined): MyShiftsState => {
  const [myShiftIdsKey, setMyShiftIdsKey] = useState<string | null>(null);
  const [engagements, setEngagements] = useState<Loaded<Engagement> | null>(null);
  const [shifts, setShifts] = useState<Loaded<Shift> | null>(null);
  const [events, setEvents] = useState<Loaded<Event & { key: string }> | null>(null);

  useEffect(() => {
    if (!uid) return;
    return streamUserFutureEngagements(
      uid,
      (snapshot) => {
        const ids = [...new Set(snapshot.docs.map((doc) => doc.get("shiftId") as string))].sort();
        setMyShiftIdsKey(ids.join(","));
      },
      (error) => {
        message.error("An error occurred loading your shifts: " + error.message);
        setMyShiftIdsKey("");
      }
    );
  }, [uid]);

  useEffect(() => {
    if (myShiftIdsKey === null) return;
    const key = myShiftIdsKey;
    const ids = key ? key.split(",") : [];
    const onError = (error: Error) => {
      message.error("An error occurred loading your shifts: " + error.message);
      setEngagements({ forKey: key, items: [] });
      setShifts({ forKey: key, items: [] });
    };
    const unsubscribeEngagements = streamEngagementsForShifts(
      ids,
      (docs) => setEngagements({ forKey: key, items: docs.map(toEngagement) }),
      onError
    );
    const unsubscribeShifts = streamShiftsByIds(
      ids,
      (docs) => setShifts({ forKey: key, items: docs.map(toShift).sort(sortShifts) }),
      onError
    );
    return () => {
      unsubscribeEngagements();
      unsubscribeShifts();
    };
  }, [myShiftIdsKey]);

  const eventIdsKey = useMemo(() => {
    if (!shifts || shifts.forKey !== myShiftIdsKey) return null;
    return [...new Set(shifts.items.map((shift) => shift.eventId))].sort().join(",");
  }, [shifts, myShiftIdsKey]);

  useEffect(() => {
    if (eventIdsKey === null) return;
    const key = eventIdsKey;
    return streamEventsByIds(
      key ? key.split(",") : [],
      (docs) => {
        const now = new Date();
        // Same rules as useEvents: soft-deleted and finished events are hidden.
        const upcoming = docs
          .map(toEvent)
          .filter((event) => !event.deleted && event.end >= now);
        setEvents({ forKey: key, items: upcoming });
      },
      (error) => {
        message.error("An error occurred loading events: " + error.message);
        setEvents({ forKey: key, items: [] });
      }
    );
  }, [eventIdsKey]);

  const loading =
    myShiftIdsKey === null ||
    engagements?.forKey !== myShiftIdsKey ||
    shifts?.forKey !== myShiftIdsKey ||
    eventIdsKey === null ||
    events?.forKey !== eventIdsKey;

  return useMemo(
    () => ({
      loading,
      shifts: shifts?.items ?? [],
      engagements: engagements?.items ?? [],
      events: events?.items ?? [],
    }),
    [loading, shifts, engagements, events]
  );
};
