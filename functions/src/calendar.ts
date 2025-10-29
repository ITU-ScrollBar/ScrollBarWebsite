import express from 'express';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { createEvents, EventAttributes } from 'ics';
import { InternalEvent } from './types/types-file';

var serviceAccount = require("../../.credentials.json");

// Safe admin init (prevents multiple inits during local tests)
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

export const app = express();

type Shift = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description: string;
  location: string;
  uid: string;
  eventId: string;
}

type Engagement = {
  id: string;
  eventId: string;
  userId: string;
  shiftId: string;
  type: "tender" | "anchor";
}

type User = {
  id: string;
  displayName: string;
}

type Event = {
  id: string;
  displayName: string;
  description: string;
  where: string;
}

type MapToIcsEventProps = {
  shift: Shift;
  event?: Event;
  shiftMembers: Array<{ type: "anchor" | "tender"; name: string }>;
}

const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (typeof v === 'number') return new Date(v);
  if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const parsed = new Date(v);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

function toIcsArray(d: Date): [number, number, number, number, number] {
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
}

function mapDocToIcsEvent({shift, event, shiftMembers}: MapToIcsEventProps): EventAttributes | null {
  if (!shift || !event) return null;

  const start = toDate(shift.start);
  const end = toDate(shift.end);
  if (!start || !end) return null;

  let description = event.description || '';
  const anchors = shiftMembers.filter(m => m.type === 'anchor').map(m => m.name);
  const tenders = shiftMembers.filter(m => m.type === 'tender').map(m => m.name);
  description += anchors.length > 1 ? '\n\nAnchors:\n' : '\n\nAnchor:\n';
  for (const anchor of anchors) {
    description += `- ${anchor}\n`;
  }
  description += '\nTenders:\n';
  for (const tender of tenders) {
    description += `- ${tender}\n`;
  }

  const calEvent: Partial<EventAttributes> & { end?: any } = {
    start: toIcsArray(start),
    end: toIcsArray(end),
    title: `${event?.displayName} - ${shift.title}`,
    startInputType: 'utc',
    description: description,
    location: `${event?.where} ${shift.location}`,
    uid: shift.id,
  };

  return calEvent as EventAttributes;
}

app.get('/calendar/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) return res.status(400).send('Missing uid');

    const shiftEvents = await handleShifts(uid);

    const internalEvents = await handleInternalEvents(uid);

    const { error, value } = createEvents(shiftEvents.concat(internalEvents));
    if (error) {
      console.error('ICS generation error', error);
      return res.status(500).send('Failed to create calendar');
    }

    const filename = `calendar-${uid}.ics`;
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');

    return res.status(200).send(value);
  } catch (err) {
    console.error('Calendar error', err);
    return res.status(500).send('Server error');
  }
});

const handleShifts = async (uid: string): Promise<EventAttributes[]> => {
  // Handle shifts for the user
  const userEngagementsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('engagements')
      .where('userId', '==', uid)
      .where('shiftEnd', '>=', Timestamp.now())
      .get();

    const shiftIds = userEngagementsSnapshot.docs.map(doc => doc.data().shiftId);

    const shiftsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('shifts')
      .where('__name__', 'in', shiftIds)
      .get();
    
    const relatedEngagementsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('engagements')
      .where('shiftId', 'in', shiftIds)
      .get();

    const eventIds = shiftsSnapshot.docs.map(doc => doc.data().eventId);

    const eventsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('events')
      .where('__name__', 'in', eventIds)
      .get();

    const eventsMap = eventsSnapshot.docs.map(doc => {
      const d = doc.data() as Event;
      return {...d, id: doc.id};
    });

    const relatedEngagementsMap = relatedEngagementsSnapshot.docs.map(doc => {
      return { ...doc.data(), id: doc.id } as Engagement;
    });

    const allUsers = (await db.collection('users').get()).docs.map(doc => {
      return { ...doc.data(), id: doc.id } as User;
    });

    const relatedUsersMap = allUsers
                          .filter(u => relatedEngagementsMap.some(e => e.userId === u.id))
                          .map(user => {
                            return { ...user, id: user.id } as User;
                          });

    const events: EventAttributes[] = [];
    for (const doc of shiftsSnapshot.docs) {
      const d = { ...doc.data(), id: doc.id } as Shift;
      const event = eventsMap.find(event => event.id === d.eventId);
      const relatedEngagements = relatedEngagementsMap.filter(e => e.shiftId === d.id);
      const shiftMembers = relatedEngagements.map(e => {
        const user = relatedUsersMap.find(u => u.id === e.userId);
        return { type: e.type, name: user?.displayName ?? "Unknown user" };
      });
      const e = mapDocToIcsEvent({ shift: d, event, shiftMembers });
      if (e) events.push(e);
    }
    return events;
};

const handleInternalEvents = async (uid: string): Promise<EventAttributes[]> => {
  // Handle internal events for the user
  const internalEventsSnapshot = await db
    .collection('env')
    .doc('dev')  
    .collection('internalEvents')
    .where('end', '>=', Timestamp.now())
    .get();

  const internalEvents: EventAttributes[] = [];
  internalEventsSnapshot.forEach(doc => {
    const data = doc.data() as InternalEvent;

    const start = toDate(data.start);
    const end = toDate(data.end);
    if (!start || !end) return;

    const calEvent: Partial<EventAttributes> & { end?: any } = {
      start: toIcsArray(start),
      end: toIcsArray(end),
      title: data.title,
      startInputType: 'utc',
      description: data.description,
      location: data.location,
      uid: data.id,
    };

    if (calEvent) internalEvents.push(calEvent as EventAttributes);
  });
  return internalEvents;
};

export default app;
