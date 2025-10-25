import * as functions from 'firebase-functions';
import calendarApp from './calendar';

// Export the express app as the `calendar` HTTPS function.
export const calendar = functions.https.onRequest(calendarApp as any);
