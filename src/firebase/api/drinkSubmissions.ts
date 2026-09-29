import { DrinkStep, DrinkSubmission, DrinkSubmissionCreateParams } from "../../types/drinkRecipe";
import { callCalendarFunction } from "./common";

const basePath = "/drinks";

type DrinkSubmissionsHttpResponse = {
  drinks: {
    id: string;
    drinkName: string;
    creatorName: string;
    ituInitials: string;
    steps: DrinkStep[];
    totalCl: number;
    shots: number;
    createdAtMs?: number;
  }[];
};

/** Submits a drink from the public drink builder. Works whether or not someone is signed in. */
export const submitDrink = async (params: DrinkSubmissionCreateParams): Promise<{ id: string }> => {
  return callCalendarFunction<{ id: string }>(basePath, {
    method: "POST",
    body: params,
    requireAuth: false,
    failureMessage: "Failed to submit drink",
  });
};

export const listDrinkSubmissions = async (): Promise<DrinkSubmission[]> => {
  const payload = await callCalendarFunction<DrinkSubmissionsHttpResponse>(basePath, {
    method: "GET",
    unauthenticatedMessage: "You must be signed in to list drinks.",
    failureMessage: "Failed to load drinks",
  });

  return payload.drinks.map((entry) => ({
    id: entry.id,
    key: entry.id,
    drinkName: entry.drinkName,
    creatorName: entry.creatorName,
    ituInitials: entry.ituInitials,
    steps: entry.steps,
    totalCl: entry.totalCl,
    shots: entry.shots,
    createdAt: entry.createdAtMs ? new Date(entry.createdAtMs) : undefined,
  }));
};

export const deleteDrinkSubmission = async (id: string): Promise<void> => {
  await callCalendarFunction(`${basePath}/${id}`, {
    method: "DELETE",
    unauthenticatedMessage: "You must be signed in to delete drinks.",
    failureMessage: "Failed to delete drink",
  });
};
