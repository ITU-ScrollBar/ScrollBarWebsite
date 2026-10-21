import express from 'express';
import drinkRoutes from './drinkRoutes';
import feedbackRoutes from './feedbackRoutes';
import lendingRoutes from './lendingRoutes';

// Mounted on the shared `calendar` express function, so these live at /lending and /feedback
// alongside the existing /tickets routes. /drinks is the public drink builder.
const formsRouter = express.Router();

formsRouter.use('/lending', lendingRoutes);
formsRouter.use('/feedback', feedbackRoutes);
formsRouter.use('/drinks', drinkRoutes);

export default formsRouter;
