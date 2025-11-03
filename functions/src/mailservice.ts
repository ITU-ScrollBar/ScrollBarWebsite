import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { Tender } from '../src/types/types-file';

// Initialize admin only if not already initialized by another module (prevents "already exists" errors)
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();

const mailgun = new Mailgun(FormData).client({
  username: "api",
  key: process.env.MAILGUN_API_KEY?.trim() || "API_KEY",
  url: "https://api.eu.mailgun.net"
});

const mailgunDomain = process.env.MAILGUN_DOMAIN || 'dev.scrollbar.dk';

export const sendEmailInvite = onDocumentCreated(
    { document: 'invites/{email}', region: 'europe-west1' },
    async (event: any) => {
        const email = event.params?.email;
        if (!email) {
            console.warn('sendEmailInvite: missing email param');
            return;
        }
        try {
            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <no-reply@${mailgunDomain}>`,
                subject: 'You have been invited to ScrollBar Tender site',
                template: 'invite_template',
            });
            return;
        } catch (err) {
            console.error('sendEmailInvite error', err);
        }
    }
);

export const sendShiftGrabbedConfirmation = onDocumentUpdated(
    { document: 'env/{_env}/engagements/{engagementId}', region: 'europe-west1' },
    async (event: any) => {
        try {
            // v2 update event should provide before/after on event.data; guard for availability
            const before = event.data?.before;
            const after = event.data?.after ?? event.data;
            const engagementBefore = before?.data ? before.data() : before;
            const engagementAfter = after?.data ? after.data() : after;

            if (!engagementBefore || !engagementAfter) {
                console.debug('sendShiftGrabbedConfirmation: missing before/after in event.data, aborting');
                return;
            }

            if (engagementBefore.userId !== engagementAfter.userId) {
                const tenderSnap = await db.collection('/users').doc(engagementBefore.userId).get();
                const tender = tenderSnap.data() as Tender;
                const tenderTakingShiftSnap = await db.collection('/users').doc(engagementAfter.userId).get();
                const tenderTakingShift = tenderTakingShiftSnap.data() as Tender;

                await mailgun.messages.create(mailgunDomain, {
                    to: tender.email,
                    from: `ScrollBar Web <no-reply@${mailgunDomain}>`,
                    subject: 'Your shift has been grabbed!',
                    template: 'shift_taken',
                    'h:X-Mailgun-Variables': JSON.stringify({ name: tenderTakingShift.displayName }),
                });
            }
            return;
        } catch (err) {
            console.error('sendShiftGrabbedConfirmation error', err);
        }
    }
);