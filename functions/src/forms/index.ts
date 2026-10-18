import express from 'express';
import feedbackRoutes from './feedbackRoutes';
import lendingRoutes from './lendingRoutes';

// Mounted on the shared `calendar` express function, so these live at /lending and /feedback
// alongside the existing /tickets routes.
const formsRouter = express.Router();

formsRouter.use('/lending', lendingRoutes);
formsRouter.use('/feedback', feedbackRoutes);

export default formsRouter;
