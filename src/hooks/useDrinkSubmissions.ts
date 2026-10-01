import { useCallback, useEffect, useState } from "react";
import {
  deleteDrinkSubmission as deleteDrinkSubmissionInDb,
  listDrinkSubmissions,
  submitDrink as submitDrinkInDb,
} from "../firebase/api/drinkSubmissions";
import { DrinkSubmission, DrinkSubmissionCreateParams } from "../types/drinkRecipe";

type DrinkSubmissionsState = {
  loading: boolean;
  isLoaded: boolean;
  error: string | null;
  drinks: DrinkSubmission[];
};

type UseDrinkSubmissionsOptions = {
  // Listing is board-only, so the public drink builder opts out of loading entirely.
  autoLoad?: boolean;
};

export type UseDrinkSubmissionsResult = {
  drinksState: DrinkSubmissionsState;
  submitDrink: (params: DrinkSubmissionCreateParams) => Promise<{ id: string }>;
  deleteDrink: (id: string) => Promise<void>;
  refreshDrinks: (silent?: boolean) => Promise<void>;
};

const refreshIntervalMs = 30000;

const useDrinkSubmissions = ({
  autoLoad = true,
}: UseDrinkSubmissionsOptions = {}): UseDrinkSubmissionsResult => {
  const [drinksState, setDrinksState] = useState<DrinkSubmissionsState>({
    loading: autoLoad,
    isLoaded: false,
    error: null,
    drinks: [],
  });

  const loadDrinks = useCallback(async (silent = false) => {
    if (!silent) {
      setDrinksState((prev) => ({ ...prev, loading: true }));
    }

    try {
      const drinks = await listDrinkSubmissions();
      setDrinksState({ loading: false, isLoaded: true, error: null, drinks });
    } catch (error) {
      setDrinksState((prev) => ({
        ...prev,
        loading: false,
        isLoaded: true,
        error: error instanceof Error ? error.message : "Failed to load drinks.",
      }));
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    void loadDrinks(false);

    const intervalId = window.setInterval(() => {
      void loadDrinks(true);
    }, refreshIntervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoLoad, loadDrinks]);

  const submitDrink = useCallback(
    (params: DrinkSubmissionCreateParams) => submitDrinkInDb(params),
    []
  );

  const deleteDrink = useCallback(
    async (id: string) => {
      await deleteDrinkSubmissionInDb(id);
      await loadDrinks(true);
    },
    [loadDrinks]
  );

  return { drinksState, submitDrink, deleteDrink, refreshDrinks: loadDrinks };
};

export default useDrinkSubmissions;
