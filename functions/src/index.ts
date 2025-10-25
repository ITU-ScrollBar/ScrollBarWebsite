import * as functions from 'firebase-functions/v2';
import calendarApp from './calendar';
import * as mailservice from './mailservice';

// Export the express app as the `calendar` HTTPS function.
export const calendar = functions.https.onRequest(calendarApp as any);

// Export mail service functions individually so the emulator can detect them.
export const sendEmailInvite = mailservice.sendEmailInvite;
export const sendShiftGrabbedConfirmation = mailservice.sendShiftGrabbedConfirmation;
