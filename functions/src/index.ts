import * as functions from 'firebase-functions/v2';
import calendarApp from './calendar';
import * as mailservice from './mailservice';
import { adminChangeUserEmail } from './userManagerService';

// Export the express app as the `calendar` HTTPS function.
export const calendar = functions.https.onRequest({invoker: "public", region: "europe-west1"}, calendarApp as any);

// Export mail service functions individually so the emulator can detect them.
export const sendManualInviteEmail = mailservice.sendManualInviteEmail;
export const sendApplicationInviteEmail = mailservice.sendApplicationInviteEmail;
export const sendRejectedApplicationEmail = mailservice.sendRejectedApplicationEmail;
export const sendTemplateTestEmail = mailservice.sendTemplateTestEmail;
export const sendApplicationSubmittedEmail = mailservice.sendApplicationSubmittedEmail;
export const sendShiftGrabbedConfirmation = mailservice.sendShiftGrabbedConfirmation;
export const resetUserMail = adminChangeUserEmail;
