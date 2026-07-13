import express from 'express';
import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { createEvents, EventAttributes } from 'ics';
import {
  Event,
  InternalEvent,
  Role,
  Tender,
  TicketDepartment,
  TicketImpact,
  TicketRequestType,
  TicketStatus,
} from './types/types-file';

// Safe admin init (prevents multiple inits during local tests)
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  admin.initializeApp(serviceAccount ? {credential: admin.credential.cert(serviceAccount)} : {});
}
const db = admin.firestore();

export const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }
  return next();
});

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

type FirebaseEvent = Event & { deleted: boolean }

type TicketRequestPayload = {
  title?: string;
  description?: string;
  department?: TicketDepartment;
  requestType?: TicketRequestType;
  impact?: TicketImpact;
};

type TicketStatusPayload = {
  status?: TicketStatus;
};

type TicketUpdatePayload = {
  title?: string;
  description?: string;
  department?: TicketDepartment;
  requestType?: TicketRequestType;
  impact?: TicketImpact;
  status?: TicketStatus;
};

const ensureBoardAccess = async (uid: string): Promise<boolean> => {
  const user = (await db.collection('users').doc(uid).get()).data() as Tender | undefined;
  return Boolean(user?.isAdmin || user?.roles?.includes(Role.BOARD));
};

type MapToIcsEventProps = {
  shift: Shift;
  event: FirebaseEvent;
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
    title: `${event?.title} - ${shift.title}`,
    startInputType: 'utc',
    description: description,
    location: `${event?.where} ${shift.location}`,
    uid: shift.id,
  };

  return calEvent as EventAttributes;
}

app.post('/tickets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).send('Missing authentication token');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    const { title, description, department, requestType, impact } = (req.body ?? {}) as TicketRequestPayload;
    const trimmedTitle = title?.trim() ?? '';
    const trimmedDescription = description?.trim() ?? '';

    if (!trimmedTitle || trimmedTitle.length > 120) {
      return res.status(400).send('title must be between 1 and 120 characters');
    }

    if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 1500) {
      return res.status(400).send('description must be between 10 and 1500 characters');
    }

    if (!Object.values(TicketDepartment).includes(department as TicketDepartment)) {
      return res.status(400).send('department must be a valid value');
    }

    if (!Object.values(TicketRequestType).includes(requestType as TicketRequestType)) {
      return res.status(400).send('requestType must be a valid value');
    }

    if (!Object.values(TicketImpact).includes(impact as TicketImpact)) {
      return res.status(400).send('impact must be a valid value');
    }

    const env = process.env.VITE_APP_ENV || 'dev';
    const userRef = db.collection('users').doc(uid);

    const ticketPayload = {
      title: trimmedTitle,
      description: trimmedDescription,
      department,
      requestType,
      impact,
      status: 'open',
      deleted: false,
      createdByRef: userRef,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const ticketRef = await db.collection('env').doc(env).collection('tickets').add(ticketPayload);

    return res.status(201).json({ id: ticketRef.id });
  } catch (error) {
    console.error('Ticket creation error', error);
    return res.status(500).send('Unable to create ticket');
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).send('Missing authentication token');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const hasAccess = await ensureBoardAccess(uid);
    if (!hasAccess) {
      return res.status(403).send('Insufficient permissions');
    }

    const env = process.env.VITE_APP_ENV || 'dev';
    const ticketsSnapshot = await db.collection('env').doc(env).collection('tickets').get();

    const tickets = ticketsSnapshot.docs
      .map((ticketDoc) => {
        const data = ticketDoc.data() as {
          title?: string;
          description?: string;
          department?: TicketDepartment;
          requestType?: TicketRequestType;
          impact?: TicketImpact;
          status?: TicketStatus;
          deleted?: boolean;
          createdByRef?: admin.firestore.DocumentReference;
          createdAt?: admin.firestore.Timestamp;
          updatedAt?: admin.firestore.Timestamp;
        };

        if (data.deleted === true) {
          return null;
        }

        return {
          id: ticketDoc.id,
          title: data.title ?? '',
          description: data.description ?? '',
          department: data.department ?? TicketDepartment.IT,
          requestType: data.requestType ?? TicketRequestType.BROKEN,
          impact: data.impact ?? TicketImpact.LOW,
          status: data.status ?? 'open',
          createdByUid: data.createdByRef?.id,
          createdAtMs: data.createdAt?.toMillis(),
          updatedAtMs: data.updatedAt?.toMillis(),
        };
      })
      .filter((ticket) => ticket !== null)
      .sort((a, b) => {
        const aDate = a.updatedAtMs ?? a.createdAtMs ?? 0;
        const bDate = b.updatedAtMs ?? b.createdAtMs ?? 0;
        return bDate - aDate;
      });

    return res.status(200).json({ tickets });
  } catch (error) {
    console.error('Ticket list error', error);
    return res.status(500).send('Unable to list tickets');
  }
});

app.patch('/tickets/:id/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).send('Missing authentication token');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const hasAccess = await ensureBoardAccess(uid);
    if (!hasAccess) {
      return res.status(403).send('Insufficient permissions');
    }

    const ticketId = req.params.id;
    const { status } = (req.body ?? {}) as TicketStatusPayload;
    if (!ticketId) {
      return res.status(400).send('Missing ticket id');
    }

    if (!["open", "in_progress", "resolved"].includes(status ?? '')) {
      return res.status(400).send('status must be a valid value');
    }

    const env = process.env.VITE_APP_ENV || 'dev';

    await db.collection('env').doc(env).collection('tickets').doc(ticketId).set(
      {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ticket status update error', error);
    return res.status(500).send('Unable to update ticket status');
  }
});

app.patch('/tickets/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).send('Missing authentication token');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const hasAccess = await ensureBoardAccess(uid);
    if (!hasAccess) {
      return res.status(403).send('Insufficient permissions');
    }

    const ticketId = req.params.id;
    if (!ticketId) {
      return res.status(400).send('Missing ticket id');
    }

    const {
      title,
      description,
      department,
      requestType,
      impact,
      status,
    } = (req.body ?? {}) as TicketUpdatePayload;

    const updatePayload: Record<string, unknown> = {};

    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (!trimmedTitle || trimmedTitle.length > 120) {
        return res.status(400).send('title must be between 1 and 120 characters');
      }
      updatePayload.title = trimmedTitle;
    }

    if (description !== undefined) {
      const trimmedDescription = description.trim();
      if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 1500) {
        return res.status(400).send('description must be between 10 and 1500 characters');
      }
      updatePayload.description = trimmedDescription;
    }

    if (department !== undefined) {
      if (!Object.values(TicketDepartment).includes(department)) {
        return res.status(400).send('department must be a valid value');
      }
      updatePayload.department = department;
    }

    if (requestType !== undefined) {
      if (!Object.values(TicketRequestType).includes(requestType)) {
        return res.status(400).send('requestType must be a valid value');
      }
      updatePayload.requestType = requestType;
    }

    if (impact !== undefined) {
      if (!Object.values(TicketImpact).includes(impact)) {
        return res.status(400).send('impact must be a valid value');
      }
      updatePayload.impact = impact;
    }

    if (status !== undefined) {
      if (!Object.values(["open", "in_progress", "resolved"]).includes(status)) {
        return res.status(400).send('status must be a valid value');
      }
      updatePayload.status = status;
    }

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).send('No valid fields to update');
    }

    const env = process.env.VITE_APP_ENV || 'dev';

    await db.collection('env').doc(env).collection('tickets').doc(ticketId).set(
      {
        ...updatePayload,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ticket update error', error);
    return res.status(500).send('Unable to update ticket');
  }
});

app.delete('/tickets/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!token) {
      return res.status(401).send('Missing authentication token');
    }

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const hasAccess = await ensureBoardAccess(uid);
    if (!hasAccess) {
      return res.status(403).send('Insufficient permissions');
    }

    const ticketId = req.params.id;
    if (!ticketId) {
      return res.status(400).send('Missing ticket id');
    }

    const env = process.env.VITE_APP_ENV || 'dev';

    await db.collection('env').doc(env).collection('tickets').doc(ticketId).set(
      {
        deleted: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Ticket delete error', error);
    return res.status(500).send('Unable to delete ticket');
  }
});

app.get('/calendar/:uid', async (req, res) => {
  try {
    const uid = req.params.uid;
    if (!uid) return res.status(400).send('Missing uid');

    const env = process.env.VITE_APP_ENV || 'dev';

    const shiftEvents = await handleShifts(uid, env);
    
    const internalEvents = await handleInternalEvents(uid, env);

    const { error, value } = createEvents(shiftEvents.concat(internalEvents));
    if (error) {
      console.error('ICS generation error', error);
      return res.status(500).send('Failed to create calendar');
    }

    const currentUser = (await db.collection('users').doc(uid).get()).data() as Tender;
    currentUser.lastCalendarDownload = new Date();
    await db.collection('users').doc(uid).set(currentUser);

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

const cutoff = Timestamp.fromMillis(Date.now() - 90 * 24 * 60 * 60 * 1000);

const handleShifts = async (uid: string, env: string): Promise<EventAttributes[]> => {
  // Handle shifts for the user
  const userEngagementsSnapshot = await db
    .collection('env')
    .doc(env)
    .collection('engagements')
    .where('userId', '==', uid)
    .where('shiftEnd', '>=', cutoff)
    .get();

    const shiftIds = userEngagementsSnapshot.docs.map(doc => doc.data().shiftId);

    // User has no assigned shifts left
    if (shiftIds.length === 0) return [];

    const shiftsSnapshot = await db
      .collection('env')
      .doc(env)
      .collection('shifts')
      .where('__name__', 'in', shiftIds)
      .get();
    
    const relatedEngagementsSnapshot = await db
      .collection('env')
      .doc(env)
      .collection('engagements')
      .where('shiftId', 'in', shiftIds)
      .get();

    const eventIds = shiftsSnapshot.docs.map(doc => doc.data().eventId);

    if (eventIds.length === 0) return [];
  
    const eventsSnapshot = await db
      .collection('env')
      .doc(env)
      .collection('events')
      .where('__name__', 'in', eventIds)
      .get();

    const eventsMap = eventsSnapshot.docs.map(doc => {
      const d = doc.data() as FirebaseEvent;
      
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
      const shift = { ...doc.data(), id: doc.id } as Shift;
      const event = eventsMap.find(event => event.id === shift.eventId);
      const relatedEngagements = relatedEngagementsMap.filter(e => e.shiftId === shift.id);
      const shiftMembers = relatedEngagements.map(e => {
        const user = relatedUsersMap.find(u => u.id === e.userId);
        return { type: e.type, name: user?.displayName ?? "Unknown user" };
      });
      if (!event || event.deleted || !shift || !event.shiftsPublished) continue;
      const e = mapDocToIcsEvent({ shift: shift, event, shiftMembers });
      if (e) events.push(e);
    }
    return events;
};

const handleInternalEvents = async (uid: string, env: string): Promise<EventAttributes[]> => {
  // Handle internal events for the user
  const internalEventsSnapshot = await db
    .collection('env')
    .doc(env)
    .collection('internalEvents')
    .where('end', '>=', cutoff)
    .get();

  const currentUser = (await db.collection('users').doc(uid).get()).data() as Tender;

  if (!currentUser) return [];

  const internalEvents: EventAttributes[] = [];
  internalEventsSnapshot.forEach(doc => {
    const data = doc.data() as InternalEvent;    

    const start = toDate(data.start);
    const end = toDate(data.end);
    if (!start || !end) return;

    if (!currentUser.roles?.includes(data.scope) &&
        !currentUser.teamIds?.includes(data.scope)) {
      return;
    }

    const calEvent: Partial<EventAttributes> & { end?: any } = {
      start: toIcsArray(start),
      end: toIcsArray(end),
      title: data.title,
      startInputType: 'utc',
      description: data.description,
      location: data.location,
      uid: doc.id,
    };

    if (calEvent) internalEvents.push(calEvent as EventAttributes);
  });
  return internalEvents;
};

export default app;
