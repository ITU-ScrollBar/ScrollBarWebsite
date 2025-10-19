import express from 'express';
import * as admin from 'firebase-admin';
import { createEvents, EventAttributes } from 'ics';
import path from 'node:path';
import dotenv from 'dotenv';

var serviceAccount = require("../.credentials.json");

// Try loading .env from several likely locations so parent-dir .env files are found
const envCandidates = [
  path.resolve(__dirname, '..', '.env'), // functions/.env when running compiled code
  path.resolve(__dirname, '..', '..', '.env'), // project-root .env when running from functions/src
  path.resolve(process.cwd(), '.env'), // current working directory
  path.resolve(process.cwd(), '..', '.env'), // parent of cwd
];

function tryLoadEnv(paths: string[]) {
  for (const p of paths) {
    try {
      const res = dotenv.config({ path: p });
      if (!res.error && res.parsed) {
        const pid = res.parsed.VITE_APP_FIREBASE_PROJECT_ID;
        if (!pid) continue;
        return {
          apiKey: res.parsed.VITE_APP_FIREBASE_API_KEY,
          authDomain: res.parsed.VITE_APP_FIREBASE_AUTH_DOMAIN,
          projectId: res.parsed.VITE_APP_FIREBASE_PROJECT_ID,
          storageBucket: res.parsed.VITE_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: res.parsed.VITE_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: res.parsed.VITE_APP_FIREBASE_APP_ID,
          credential: admin.credential.applicationDefault(),
        };
      }
    } catch (e) {
      // ignore and continue
    }
  }
  console.log('No .env file loaded from candidate paths');
  return null;
}

const projectConfig = tryLoadEnv(envCandidates);

// Safe admin init (prevents multiple inits during local tests)
if (!admin.apps.length) {
  // Pass projectId so the admin SDK doesn't need to auto-detect it
  const initOpts: admin.AppOptions = projectConfig ?? {};

  console.log("Initializing app with config:", initOpts);

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

type Event = {
  id: string;
  displayName: string;
  description: string;
  where: string;
}

type MapToIcsEventProps = {
  shift: Shift;
  event?: Event;
}

function toIcsArray(d: Date): [number, number, number, number, number] {
  return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
}

function mapDocToIcsEvent({shift, event}: MapToIcsEventProps): EventAttributes | null {
  if (!shift || !event) return null;

  const toDate = (v: any): Date | null => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v && typeof v.toDate === 'function') return v.toDate();
    if (typeof v === 'number') return new Date(v);
    if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const start = toDate(shift.start);
  const end = toDate(shift.end);
  if (!start || !end) return null;

  const calEvent: Partial<EventAttributes> & { end?: any } = {
    start: toIcsArray(start),
    end: toIcsArray(end),
    title: `${event?.displayName} - ${shift.title}`,
    startInputType: 'utc',
    description: shift.description,
    location: `${event?.where} ${shift.location}`,
    uid: shift.id,
  };

  return calEvent as EventAttributes;
}

app.get('/calendar/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) return res.status(400).send('Missing uid');

    const engagementsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('engagements')
      .where('userId', '==', uid)
      .get();

    const shiftIds = engagementsSnapshot.docs.map(doc => doc.data().shiftId);

    const shiftsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('shifts')
      .where(admin.firestore.FieldPath.documentId(), 'in', shiftIds)
      .get();
    
    const eventIds = shiftsSnapshot.docs.map(doc => doc.data().eventId);

    const eventsSnapshot = await db
      .collection('env')
      .doc('dev')
      .collection('events')
      .where(admin.firestore.FieldPath.documentId(), 'in', eventIds)
      .get();

    const eventsMap = eventsSnapshot.docs.map(doc => {
      const d = doc.data() as Event;
      console.log('Event data', d);
      return {...d, id: doc.id};
    });

    const events: EventAttributes[] = [];
    for (const doc of shiftsSnapshot.docs) {
      const d = doc.data() as Shift;
      console.log('Shift data', d);
      const e = mapDocToIcsEvent({ shift: d, event: eventsMap.find(event => event.id === d.eventId)});
      if (e) events.push(e);
    }

    const { error, value } = createEvents(events);
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

export default app;
