import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { marked } from 'marked';
import * as admin from 'firebase-admin';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { LendingEquipment, Tender, TicketDepartment } from './types/types-file';

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

export const sendEmailInvite = onDocumentCreated(
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
            console.error('sendEmailInvite (create) error', err);
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
            const bodyText = toRequiredHtmlBody(configuredText?.trim()?.length > 0 ? configuredText : 'Thank you for your application to ScrollBar. We have received it and will review it as soon as possible.', 'sendApplicationSubmittedEmail');

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

const ticketCreatedTemplateName = 'ticket_created_template';

// Readable cap on the description, applied in code points so an emoji is never bisected.
const ticketDescriptionMaxLength = 500;

// Mailgun folds the template variables into a single header, so the encoded payload has to
// stay under the SMTP header line limit even when the description is quote or emoji heavy.
const ticketVariablesMaxBytes = 900;

// Each ticket department maps to a board role. The role's contactEmail is maintained from
// Board Management, so it stays the source of truth; the fallback keeps mail flowing if the
// role was renamed or its contact email was never filled in.
const ticketDepartmentRecipients: Record<TicketDepartment, { roleName: string; fallbackEmail: string }> = {
    [TicketDepartment.IT]: { roleName: 'it', fallbackEmail: 'it@scrollbar.dk' },
    [TicketDepartment.MAINTENANCE]: { roleName: 'maintenance', fallbackEmail: 'maintenance@scrollbar.dk' },
};

// Looks up the contact address configured for a board role, so the board can redirect these
// notifications from Board Management without a deploy.
const resolveBoardRoleEmail = async (
    envName: string | undefined,
    roleName: string,
    fallbackEmail: string
): Promise<string> => {
    if (envName) {
        try {
            const snapshot = await db.collection(`env/${envName}/boardRoles`).get();
            const match = snapshot.docs.find(
                (roleDoc) => (roleDoc.data()?.name ?? '').trim().toLowerCase() === roleName
            );
            const contactEmail = match?.data()?.contactEmail;
            if (typeof contactEmail === 'string' && contactEmail.trim().length > 0) {
                return contactEmail.trim();
            }
        } catch (error) {
            console.error('resolveBoardRoleEmail lookup error', error, { roleName });
        }
    }

    console.info('resolveBoardRoleEmail: falling back to hardcoded address', {
        envName,
        roleName,
    });

    return fallbackEmail;
};

const resolveTicketDepartmentEmail = async (
    envName: string | undefined,
    department: string | undefined
): Promise<string | undefined> => {
    const recipient = ticketDepartmentRecipients[(department ?? '') as TicketDepartment];
    if (!recipient?.roleName) {
        return undefined;
    }

    return resolveBoardRoleEmail(envName, recipient.roleName, recipient.fallbackEmail);
};

const humanizeTicketValue = (value: unknown): string => {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) {
        return 'Unknown';
    }
    const spaced = raw.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

const formatTicketDepartment = (department: unknown): string =>
    department === TicketDepartment.IT ? 'IT' : humanizeTicketValue(department);

const truncateFreeText = (characters: string[], maxLength: number): string => {
    if (characters.length <= maxLength) {
        return characters.join('');
    }
    if (maxLength <= 0) {
        return '';
    }
    return `${characters.slice(0, maxLength).join('').trimEnd()}...`;
};

const toTicketDescription = (value: unknown): string => {
    const raw = typeof value === 'string' ? value.trim() : '';
    return truncateFreeText(Array.from(raw), ticketDescriptionMaxLength);
};

// The character cap covers the realistic case; this shrinks further when JSON escaping pushes
// the encoded header over the limit anyway.
const buildVariables = (
    variables: Record<string, unknown>,
    freeTextKey: string,
    freeText: string
): string => {
    const characters = Array.from(freeText);
    let maxLength = characters.length;
    let payload = JSON.stringify({ ...variables, [freeTextKey]: freeText });

    while (Buffer.byteLength(payload, 'utf8') > ticketVariablesMaxBytes && maxLength > 0) {
        maxLength = Math.floor(maxLength * 0.8);
        payload = JSON.stringify({
            ...variables,
            [freeTextKey]: truncateFreeText(characters, maxLength),
        });
    }

    return payload;
};

export const sendTicketCreatedEmail = onDocumentCreated(
    { document: 'env/{_env}/tickets/{ticketId}', region: 'europe-west1' },
    async (event: any) => {
        const envName = event.params?._env;
        const ticketId = event.params?.ticketId;
        const data = event.data?.data ? event.data.data() : {};
        const title = typeof data?.title === 'string' ? data.title.trim() : '';
        const department = data?.department;

        if (!title) {
            console.warn('sendTicketCreatedEmail: missing ticket title', { envName, ticketId });
            return;
        }

        const to = await resolveTicketDepartmentEmail(envName, department);

        if (!to) {
            console.warn('sendTicketCreatedEmail: no recipient for department', { envName, ticketId, department });
            return;
        }

        try {
            await mailgun.messages.create(mailgunDomain, {
                to,
                from: `ScrollBar Web <no-reply@${mailgunDomain}>`,
                // Titles are user supplied, so keep line breaks out of the header.
                subject: `New ticket created: ${title.replace(/[\r\n]+/g, ' ')}`,
                template: ticketCreatedTemplateName,
                'h:Reply-To': 'no-reply@scrollbar.dk',
                'h:X-Mailgun-Variables': buildVariables(
                    {
                        title,
                        department: formatTicketDepartment(department),
                        requestType: humanizeTicketValue(data?.requestType),
                        impact: humanizeTicketValue(data?.impact),
                        ticketId: ticketId ?? '',
                    },
                    'description',
                    toTicketDescription(data?.description)
                ),
            });
            return;
        } catch (err) {
            console.error('sendTicketCreatedEmail error', err);
        }
    }
);

const formSubmissionTemplateName = 'form_submission_template';
const lendingApprovedTemplateName = 'lending_approved_template';
const formResponsesUrl = 'https://scrollbar.dk/admin/forms';

// Equipment lending and anonymous feedback both notify the board; the address is configurable
// through the board role of the same name.
const formsRecipient = { roleName: 'board', fallbackEmail: 'board@scrollbar.dk' };

const lendingEquipmentLabels: Record<LendingEquipment, string> = {
    [LendingEquipment.SOUNDBOKS]: 'Soundboks',
    [LendingEquipment.SPEAKER_STAND]: 'Speaker stand',
    [LendingEquipment.ICE_BUCKET]: 'Ice bucket(s)',
    [LendingEquipment.IPAD]: 'iPad(s)',
    [LendingEquipment.OTHER]: 'Other',
};

const formDateFormatter = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'Europe/Copenhagen',
});

const formatFormDate = (value: any): string => {
    const date = typeof value?.toDate === 'function' ? value.toDate() : value instanceof Date ? value : null;
    if (!date || Number.isNaN(date.getTime())) {
        return 'Unknown';
    }
    return formDateFormatter.format(date);
};

// buildVariables can only shrink the one free-text field, so every other member-supplied value
// gets a hard cap first; otherwise a long occasion or name pushes the header over the byte budget
// and Mailgun rejects the whole message.
const fixedVariableMaxLength = 80;

const capFixedVariable = (value: string): string =>
    truncateFreeText(Array.from(value), fixedVariableMaxLength);

const buildLendingBody = (occasion: string, additionalInfo: unknown): string => {
    const extra = typeof additionalInfo === 'string' ? additionalInfo.trim() : '';
    return extra ? `${occasion}\n\nAnything else we should know?\n${extra}` : occasion;
};

// Resolves the lender's own contact details from the stored user reference, so the approval mail
// can reach them directly.
const resolveTenderContact = async (
    createdByRef: any
): Promise<{ email?: string; displayName?: string } | null> => {
    if (!createdByRef?.get) {
        return null;
    }

    try {
        const snapshot = await createdByRef.get();
        const tender = snapshot.data() as Tender | undefined;
        if (!tender) {
            return null;
        }

        return { email: tender.email?.trim(), displayName: tender.displayName?.trim() };
    } catch (error) {
        console.error('resolveTenderContact error', error);
        return null;
    }
};

const resolveRequesterLabel = async (createdByRef: any): Promise<string> => {
    if (!createdByRef?.get) {
        return 'Unknown member';
    }

    try {
        const snapshot = await createdByRef.get();
        const requester = snapshot.data() as Tender | undefined;
        const name = requester?.displayName?.trim();
        const email = requester?.email?.trim();

        if (name && email) return `${name} (${email})`;
        return name || email || 'Unknown member';
    } catch (error) {
        console.error('resolveRequesterLabel error', error);
        return 'Unknown member';
    }
};

export const sendLendingRequestCreatedEmail = onDocumentCreated(
    { document: 'env/{_env}/lendingRequests/{requestId}', region: 'europe-west1' },
    async (event: any) => {
        const envName = event.params?._env;
        const requestId = event.params?.requestId;
        const data = event.data?.data ? event.data.data() : {};
        const occasion = typeof data?.occasion === 'string' ? data.occasion.trim() : '';

        if (!occasion) {
            console.warn('sendLendingRequestCreatedEmail: missing occasion', { envName, requestId });
            return;
        }

        const equipment = lendingEquipmentLabels[data?.equipment as LendingEquipment] ?? 'Other';
        const equipmentDetails = typeof data?.equipmentDetails === 'string' ? data.equipmentDetails.trim() : '';

        try {
            await mailgun.messages.create(mailgunDomain, {
                to: await resolveBoardRoleEmail(envName, formsRecipient.roleName, formsRecipient.fallbackEmail),
                from: `ScrollBar Web <no-reply@${mailgunDomain}>`,
                // The label comes from a fixed map, so no member text can reach the header.
                subject: `New equipment booking request: ${equipment}`,
                template: formSubmissionTemplateName,
                'h:Reply-To': 'no-reply@scrollbar.dk',
                // Only the fields the loop can shrink may carry unbounded member text, so the
                // occasion and the extra info go into the body rather than into `details`.
                'h:X-Mailgun-Variables': buildVariables(
                    {
                        heading: 'A new equipment booking request',
                        title: capFixedVariable(
                            equipmentDetails ? `${equipment} - ${equipmentDetails}` : equipment
                        ),
                        details: [
                            {
                                label: 'Requested by',
                                value: capFixedVariable(await resolveRequesterLabel(data?.createdByRef)),
                            },
                            { label: 'Pick-up', value: formatFormDate(data?.pickupAt) },
                            { label: 'Return', value: formatFormDate(data?.returnAt) },
                        ],
                        bodyLabel: 'Occasion',
                        linkLabel: 'Open form responses',
                        linkUrl: formResponsesUrl,
                    },
                    'body',
                    buildLendingBody(occasion, data?.additionalInfo)
                ),
            });
            return;
        } catch (err) {
            console.error('sendLendingRequestCreatedEmail error', err);
        }
    }
);

export const sendAnonymousFeedbackCreatedEmail = onDocumentCreated(
    { document: 'env/{_env}/anonymousFeedback/{feedbackId}', region: 'europe-west1' },
    async (event: any) => {
        const envName = event.params?._env;
        const feedbackId = event.params?.feedbackId;
        const data = event.data?.data ? event.data.data() : {};
        const feedback = typeof data?.feedback === 'string' ? data.feedback.trim() : '';

        if (!feedback) {
            console.warn('sendAnonymousFeedbackCreatedEmail: missing feedback', { envName, feedbackId });
            return;
        }

        try {
            await mailgun.messages.create(mailgunDomain, {
                to: await resolveBoardRoleEmail(envName, formsRecipient.roleName, formsRecipient.fallbackEmail),
                from: `ScrollBar Web <no-reply@${mailgunDomain}>`,
                // The submission carries no identity, and neither does this mail.
                subject: 'New anonymous feedback',
                template: formSubmissionTemplateName,
                'h:Reply-To': 'no-reply@scrollbar.dk',
                'h:X-Mailgun-Variables': buildVariables(
                    {
                        heading: 'New anonymous feedback',
                        title: '',
                        details: [],
                        bodyLabel: 'Feedback',
                        linkLabel: 'Open form responses',
                        linkUrl: formResponsesUrl,
                    },
                    'body',
                    feedback
                ),
            });
            return;
        } catch (err) {
            console.error('sendAnonymousFeedbackCreatedEmail error', err);
        }
    }
);

// When a lending request collects its second board approval, deriveLendingStatus flips the stored
// status to "approved". This fires on that transition and tells the lender their request went
// through. Guarding on the status change (not merely the "approved" state) keeps a later comment
// edit — which also updates the document — from resending the mail.
export const sendLendingRequestApprovedEmail = onDocumentUpdated(
    { document: 'env/{_env}/lendingRequests/{requestId}', region: 'europe-west1' },
    async (event: any) => {
        const requestId = event.params?.requestId;
        const before = event.data?.before?.data ? event.data.before.data() : undefined;
        const after = event.data?.after?.data ? event.data.after.data() : undefined;

        if (!before || !after) {
            return;
        }

        if (before.status === 'approved' || after.status !== 'approved') {
            return;
        }

        const contact = await resolveTenderContact(after.createdByRef);
        if (!contact?.email) {
            console.warn('sendLendingRequestApprovedEmail: no lender email', { requestId });
            return;
        }

        const equipment = lendingEquipmentLabels[after.equipment as LendingEquipment] ?? 'Other';
        const equipmentDetails = typeof after.equipmentDetails === 'string' ? after.equipmentDetails.trim() : '';
        const occasion = typeof after.occasion === 'string' ? after.occasion.trim() : '';

        try {
            await mailgun.messages.create(mailgunDomain, {
                to: contact.email,
                from: `ScrollBar Web <no-reply@${mailgunDomain}>`,
                // The label comes from a fixed map, so no member text can reach the header.
                subject: `Your equipment booking is approved: ${equipment}`,
                template: lendingApprovedTemplateName,
                // A member may want to reply to the board about the approved booking.
                'h:Reply-To': 'board@scrollbar.dk',
                'h:X-Mailgun-Variables': buildVariables(
                    {
                        name: capFixedVariable(contact.displayName || 'there'),
                        equipment: capFixedVariable(
                            equipmentDetails ? `${equipment} - ${equipmentDetails}` : equipment
                        ),
                        pickup: formatFormDate(after.pickupAt),
                        returnDate: formatFormDate(after.returnAt),
                    },
                    'occasion',
                    occasion
                ),
            });
            return;
        } catch (err) {
            console.error('sendLendingRequestApprovedEmail error', err);
        }
    }
);
