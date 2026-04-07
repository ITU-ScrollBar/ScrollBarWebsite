import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { marked } from 'marked';
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

const renderMarkdownToHtml = (markdown: string): string => {
    return marked.parse(markdown, {
        async: false,
        gfm: true,
        breaks: true,
    }) as string;
};

const updateApplicationDeliveryStatus = async (
    envName: string | undefined,
    applicationId: string | undefined,
    status: 'success' | 'failed'
) => {
    if (!envName || !applicationId) return;
    try {
        await db.doc(`env/${envName}/applications/${applicationId}`).update({
            emailDeliveryStatus: status,
        });
    } catch (error) {
        console.error('updateApplicationDeliveryStatus error', error);
    }
};

export const sendEmailInvite = onDocumentCreated(
    { document: 'invites/{email}', region: 'europe-west1' },
    async (event: any) => {
        const email = event.params?.email;
        const data = event.data?.data ? event.data.data() : {};
        const fullName = data?.fullName || 'ScrollBar Applicant';
        const bodyText = renderMarkdownToHtml(data?.bodyText?.trim?.()) || "You have been invited to ScrollBar Tender site. Please follow your invitation link to continue.";
        const applicationId = data?.applicationId;
        const applicationEnv = data?.applicationEnv;
        if (!email) {
            console.warn('sendEmailInvite: missing email param');
            return;
        }
        try {
            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject: 'You have been invited to ScrollBar Tender site',
                template: 'invite_template',
                'h:X-Mailgun-Variables': JSON.stringify({
                    name: fullName,
                    bodyText,
                }),
            });
            await updateApplicationDeliveryStatus(applicationEnv, applicationId, 'success');
            return;
        } catch (err) {
            console.error('sendEmailInvite error', err);
            await updateApplicationDeliveryStatus(applicationEnv, applicationId, 'failed');
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

export const sendRejectedApplicationEmail = onDocumentCreated(
    { document: 'env/{_env}/applicationRejectionEmails/{docId}', region: 'europe-west1' },
    async (event: any) => {
        const envName = event.params?._env;
        const data = event.data?.data ? event.data.data() : {};
        const applicationId = data?.applicationId;
        const email = data?.email;
        const fullName = data?.fullName || 'ScrollBar Applicant';
        const bodyText = renderMarkdownToHtml(data?.bodyText?.trim?.()) || 'Thank you for your application. Unfortunately, we are not able to offer you a position at this time.';

        if (!email) {
            console.warn('sendRejectedApplicationEmail: missing email');
            return;
        }

        try {
            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject: 'Regarding your ScrollBar application',
                template: 'application_rejected_template',
                'h:X-Mailgun-Variables': JSON.stringify({
                    name: fullName,
                    bodyText,
                }),
            });
            await updateApplicationDeliveryStatus(envName, applicationId, 'success');
            return;
        } catch (err) {
            console.error('sendRejectedApplicationEmail error', err);
            await updateApplicationDeliveryStatus(envName, applicationId, 'failed');
        }
    }
);

export const sendTemplateTestEmail = onDocumentCreated(
    { document: 'env/{_env}/emailTemplateTests/{docId}', region: 'europe-west1' },
    async (event: any) => {
        const data = event.data?.data ? event.data.data() : {};
        const templateType = data?.templateType;
        const email = data?.email;
        const fullName = data?.fullName || 'ScrollBar Applicant';
        const bodyText = renderMarkdownToHtml(data?.bodyText?.trim?.()) || '';

        if (!email || (templateType !== 'invite' && templateType !== 'rejection')) {
            console.warn('sendTemplateTestEmail: invalid payload');
            return;
        }

        try {
            const template = templateType === 'invite' ? 'invite_template' : 'application_rejected_template';
            const subject = templateType === 'invite'
                ? '[TEST] You have been invited to ScrollBar Tender site'
                : '[TEST] Regarding your ScrollBar application';

            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject,
                template,
                'h:X-Mailgun-Variables': JSON.stringify({
                    name: fullName,
                    bodyText,
                }),
            });
            return;
        } catch (err) {
            console.error('sendTemplateTestEmail error', err);
        }
    }
);