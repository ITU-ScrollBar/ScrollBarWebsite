"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const admin = __importStar(require("firebase-admin"));
const ics_1 = require("ics");
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
var serviceAccount = require("../.credentials.json");
// Try loading .env from several likely locations so parent-dir .env files are found
const envCandidates = [
    node_path_1.default.resolve(__dirname, '..', '.env'), // functions/.env when running compiled code
    node_path_1.default.resolve(__dirname, '..', '..', '.env'), // project-root .env when running from functions/src
    node_path_1.default.resolve(process.cwd(), '.env'), // current working directory
    node_path_1.default.resolve(process.cwd(), '..', '.env'), // parent of cwd
];
function tryLoadEnv(paths) {
    for (const p of paths) {
        try {
            const res = dotenv_1.default.config({ path: p });
            if (!res.error && res.parsed) {
                const pid = res.parsed.VITE_APP_FIREBASE_PROJECT_ID;
                if (!pid)
                    continue;
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
        }
        catch (e) {
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
    const initOpts = projectConfig ?? {};
    console.log("Initializing app with config:", initOpts);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
exports.app = (0, express_1.default)();
function toIcsArray(d) {
    return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
}
function mapDocToIcsEvent(doc) {
    if (!doc)
        return null;
    const toDate = (v) => {
        console.log(typeof v);
        if (!v)
            return null;
        if (v instanceof Date)
            return v;
        if (v && typeof v.toDate === 'function')
            return v.toDate();
        if (typeof v === 'number')
            return new Date(v);
        if (v && typeof v.seconds === 'number')
            return new Date(v.seconds * 1000);
        const parsed = new Date(v);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };
    const start = toDate(doc.start);
    const end = toDate(doc.end);
    if (!start)
        return null;
    const makeDateArray = (d, allDay) => {
        if (allDay)
            return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
        return toIcsArray(d);
    };
    const allDay = !!doc.allDay;
    let endArray;
    if (end) {
        endArray = makeDateArray(end, allDay);
    }
    else if (allDay) {
        const e = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 1));
        endArray = makeDateArray(e, true);
    }
    const event = {
        start: makeDateArray(start, allDay),
        title: `${doc.title} shift`,
        startInputType: 'utc',
        description: doc.description || doc.notes || undefined,
        location: doc.location,
        uid: doc.id,
    };
    if (endArray)
        event.end = endArray;
    if (doc.url)
        event.url = doc.url;
    if (doc.status)
        event.status = doc.status;
    if (doc.organizer)
        event.organizer = doc.organizer;
    if (doc.attendees)
        event.attendees = doc.attendees;
    return event;
}
exports.app.get('/calendar/:uid', async (req, res) => {
    try {
        const uid = req.params.uid;
        if (!uid)
            return res.status(400).send('Missing uid');
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
        const events = [];
        for (const doc of shiftsSnapshot.docs) {
            const d = doc.data();
            const e = mapDocToIcsEvent({ ...d, id: doc.id });
            if (e)
                events.push(e);
        }
        const { error, value } = (0, ics_1.createEvents)(events);
        if (error) {
            console.error('ICS generation error', error);
            return res.status(500).send('Failed to create calendar');
        }
        const filename = `calendar-${uid}.ics`;
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
        return res.status(200).send(value);
    }
    catch (err) {
        console.error('Calendar error', err);
        return res.status(500).send('Server error');
    }
});
exports.default = exports.app;
