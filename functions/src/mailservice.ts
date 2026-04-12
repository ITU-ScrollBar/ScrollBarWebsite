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
const registerBaseUrl = 'https://scrollbar.dk/register';
const manualInviteTemplateName = 'manual_invite_template';
const applicationInviteTemplateName = 'application_invite_template';

const buildRegisterUrl = (payload: {
    email?: string;
    fullName?: string;
    studyline?: string;
}): string => {
    const url = new URL(registerBaseUrl);

    const email = payload.email?.trim();
    const fullName = payload.fullName?.trim();
    const studyline = payload.studyline?.trim();

    if (fullName) url.searchParams.set('displayName', fullName);
    if (email) url.searchParams.set('email', email);
    if (studyline) url.searchParams.set('studyline', studyline);

    return url.toString();
};

const toRequiredHtmlBody = (markdown: unknown, context: string): string => {
    const value = typeof markdown === 'string' ? markdown.trim() : '';
    if (!value) {
        throw new Error(`${context}: missing template body text`);
    }
    return marked.parse(value, {
        async: false,
        gfm: true,
        breaks: true,    
    }) as string;
};

const getSettingsDoc = async () => {
    const snapshot = await db.doc('settings/settings').get();
    return snapshot.exists ? snapshot.data() : undefined;
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

export const sendManualInviteEmail = onDocumentCreated(
    { document: 'invites/{email}', region: 'europe-west1' },
    async (event: any) => {
        const email = event.params?.email;
        const data = event.data?.data ? event.data.data() : {};
        if (!data?.manualInviteRequestId) {
            return;
        }

        try {
            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject: 'ScrollBar invitation',
                template: manualInviteTemplateName,
                'h:Reply-To': 'board@scrollbar.dk',
            });
            return;
        } catch (err) {
            console.error('sendManualInviteEmail (create) error', err);
        }
    }
);

export const sendApplicationInviteEmail = onDocumentCreated(
    { document: 'env/{_env}/applicationInviteEmails/{docId}', region: 'europe-west1' },
    async (event: any) => {
        const envName = event.params?._env;
        const data = event.data?.data ? event.data.data() : {};
        const email = data?.email;
        const fullName = data?.fullName || '';
        const studyline = data?.studyline;
        const applicationId = data?.applicationId;
        const registerUrl = buildRegisterUrl({
            email,
            fullName,
            studyline,
        });
        if (!email) {
            console.warn('sendApplicationInviteEmail: missing email');
            await updateApplicationDeliveryStatus(envName, applicationId, 'failed');
            return;
        }
        try {
            const bodyText = toRequiredHtmlBody(data?.bodyText, 'sendApplicationInviteEmail');
            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject: 'Welcome to the ScrollBar family',
                template: applicationInviteTemplateName,
                'h:Reply-To': 'board@scrollbar.dk',
                'h:X-Mailgun-Variables': JSON.stringify({
                    name: fullName || 'ScrollBar Applicant',
                    bodyText,
                    registerUrl,
                }),
            });
            await updateApplicationDeliveryStatus(envName, applicationId, 'success');
            return;
        } catch (err) {
            console.error('sendApplicationInviteEmail error', err);
            await updateApplicationDeliveryStatus(envName, applicationId, 'failed');
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

        if (!email) {
            console.warn('sendRejectedApplicationEmail: missing email');
            return;
        }

        try {
            const bodyText = toRequiredHtmlBody(data?.bodyText, 'sendRejectedApplicationEmail');
            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject: 'Regarding your ScrollBar application',
                template: 'application_rejected_template',
                'h:Reply-To': 'board@scrollbar.dk',
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
        const fullName = data?.fullName || '';
        const registerUrl = buildRegisterUrl({
            email,
            fullName,
            studyline: data?.studyline,
        });

        if (!email || (templateType !== 'invite' && templateType !== 'rejection')) {
            console.warn('sendTemplateTestEmail: invalid payload');
            return;
        }

        try {
            const bodyText = toRequiredHtmlBody(data?.bodyText, 'sendTemplateTestEmail');
            const template = templateType === 'invite' ? applicationInviteTemplateName : 'application_rejected_template';
            const subject = templateType === 'invite'
                ? '[TEST] You have been invited to ScrollBar Tender site'
                : '[TEST] Regarding your ScrollBar application';

            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject,
                template,
                'h:Reply-To': 'board@scrollbar.dk',
                'h:X-Mailgun-Variables': JSON.stringify({
                    name: fullName || 'ScrollBar Applicant',
                    bodyText,
                    registerUrl,
                }),
            });
            return;
        } catch (err) {
            console.error('sendTemplateTestEmail error', err);
        }
    }
);

export const sendApplicationSubmittedEmail = onDocumentCreated(
    { document: 'env/{_env}/applications/{applicationId}', region: 'europe-west1' },
    async (event: any) => {
        const envName = event.params?._env;
        const applicationId = event.params?.applicationId;
        const data = event.data?.data ? event.data.data() : {};
        const email = data?.email;
        const fullName = data?.fullName || 'ScrollBar Applicant';

        if (!email) {
            console.warn('sendApplicationSubmittedEmail: missing email');
            return;
        }

        try {
            const settings = await getSettingsDoc();
            const configuredText = settings?.applicationSubmittedEmailBodyText?.trim?.();
            const bodyText = toRequiredHtmlBody(configuredText ?? 'Thank you for your application to ScrollBar. We have received it and will review it as soon as possible.', 'sendApplicationSubmittedEmail');

            await mailgun.messages.create(mailgunDomain, {
                to: email,
                from: `ScrollBar Web <board@${mailgunDomain}>`,
                subject: 'We received your ScrollBar application',
                template: 'application_submitted_template',
                'h:Reply-To': 'no-reply@scrollbar.dk',
                'h:X-Mailgun-Variables': JSON.stringify({
                    name: fullName,
                    bodyText,
                }),
            });
            return;
        } catch (err) {
            console.error('sendApplicationSubmittedEmail error', err);
        }
    }
);