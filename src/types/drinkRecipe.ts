// Drink builder catalog and pouring rules, shared by the /forms/drinks page and the `calendar`
// function that validates submissions. The functions prebuild copies this file next to
// types-file.ts, so it must stay self-contained (no imports).

export type DrinkCategory = "alcohol" | "soda" | "syrup";

export type DrinkAmount = "2cl" | "4cl" | "8cl" | "half" | "fill" | "top";

export interface DrinkIngredient {
  id: string;
  name: string;
  category: DrinkCategory;
  /** CSS color of the liquid in the cup. Clear liquids use a pale translucent tint. */
  color: string;
  clear?: boolean;
  /** Pure and Råstoff: 4cl counts as one shot instead of 2cl. */
  strong?: boolean;
}

export interface DrinkStep {
  ingredientId: string;
  amount: DrinkAmount;
}

export interface DrinkPour {
  ingredient: DrinkIngredient;
  amount: DrinkAmount;
  cl: number;
}

export interface DrinkState {
  pours: DrinkPour[];
  levelCl: number;
  shots: number;
  syrupCl: number;
  halfFills: number;
  /** Soda reached the fill line; only a "Top with" can follow. */
  filled: boolean;
  /** A "Top with" was poured; the drink is finished. */
  topped: boolean;
}

export type DrinkCheck = { ok: true; cl: number } | { ok: false; reason: string };

export type DrinkBuildResult = { state: DrinkState; error?: string };

export interface DrinkSubmissionCreateParams {
  drinkName: string;
  creatorName: string;
  ituInitials: string;
  steps: DrinkStep[];
}

export interface DrinkSubmission extends DrinkSubmissionCreateParams {
  id: string;
  key?: string;
  totalCl: number;
  shots: number;
  createdAt?: Date;
}

export const DRINK_CUP_CL = 40;
/** Room a Fill (or two half fills) leaves free so the drink can still be topped. */
export const DRINK_TOP_ROOM_CL = 4;
export const DRINK_FILL_LINE_CL = DRINK_CUP_CL - DRINK_TOP_ROOM_CL;
export const DRINK_MAX_SHOTS = 2;
/** Syrups and lime juice combined. */
export const DRINK_MAX_SYRUP_CL = 4;
/** A syrup "Top with" is a splash, not a pour to the brim. */
export const DRINK_SYRUP_TOP_CL = 2;
export const DRINK_MAX_STEPS = 20;
export const DRINK_NAME_MAX_LENGTH = 60;
export const DRINK_CREATOR_NAME_MAX_LENGTH = 100;

const CLEAR = "rgba(205, 228, 242, 0.6)";

export const DRINK_INGREDIENTS: DrinkIngredient[] = [
  { id: "minttu", name: "Minttu", category: "alcohol", color: CLEAR, clear: true },
  { id: "fireball", name: "Fireball", category: "alcohol", color: "#d9661f" },
  { id: "tequila", name: "Tequila", category: "alcohol", color: CLEAR, clear: true },
  { id: "sambuca", name: "Sambuca", category: "alcohol", color: CLEAR, clear: true },
  { id: "jagermeister", name: "Jägermeister", category: "alcohol", color: "#21150e" },
  { id: "fernet-branca", name: "Fernet Branca", category: "alcohol", color: "#1a1512" },
  { id: "pure-apple", name: "Pure Shot Apple", category: "alcohol", color: "#6abf3c", strong: true },
  { id: "pure-liquorice", name: "Pure Shot Liquorice", category: "alcohol", color: "#121212", strong: true },
  { id: "pure-pink-grape", name: "Pure Shot Pink Grape", category: "alcohol", color: "#f06292", strong: true },
  { id: "rastoff-strawberry", name: "Råstoff Strawberry", category: "alcohol", color: "#d7263d", strong: true },
  { id: "dark-rum", name: "Dark Rum", category: "alcohol", color: "#6f3510" },
  { id: "vodka", name: "Vodka", category: "alcohol", color: CLEAR, clear: true },
  { id: "gin", name: "Gin", category: "alcohol", color: CLEAR, clear: true },

  { id: "lemon-soda", name: "Lemon Soda", category: "soda", color: "#f1f1e4" },
  { id: "sparkling-water", name: "Sparkling Water", category: "soda", color: CLEAR, clear: true },
  { id: "red-soda", name: "Red Soda", category: "soda", color: "#e53935" },
  { id: "ginger-beer", name: "Ginger Beer", category: "soda", color: "#e3cf7e" },
  { id: "coca-cola", name: "Coca-Cola", category: "soda", color: "#2a140b" },
  { id: "coca-cola-zero", name: "Coca-Cola Zero", category: "soda", color: "#2a140b" },
  { id: "tonic", name: "Tonic", category: "soda", color: CLEAR, clear: true },
  { id: "redbull-original", name: "Red Bull Original", category: "soda", color: "rgba(242, 214, 80, 0.8)" },
  { id: "redbull-sugarfree", name: "Red Bull Sugarfree", category: "soda", color: "rgba(242, 214, 80, 0.8)" },
  { id: "redbull-sudachi", name: "Red Bull Sudachi Lime", category: "soda", color: "#e2e199" },
  { id: "redbull-cherry", name: "Red Bull Cherry Sakura", category: "soda", color: "#d63a55" },
  { id: "redbull-lilac", name: "Red Bull Lilac", category: "soda", color: "#f4c3dd" },
  { id: "redbull-peach", name: "Red Bull Peach", category: "soda", color: "#f6dea2" },
  { id: "redbull-raspberry", name: "Red Bull Raspberry", category: "soda", color: "#f5b8c4" },
  { id: "cranberry-juice", name: "Cranberry Juice", category: "soda", color: "#b01238" },
  { id: "orange-juice", name: "Orange Juice", category: "soda", color: "#f7941d" },

  { id: "mango-syrup", name: "Mango Syrup", category: "syrup", color: "#f4a722" },
  { id: "passion-syrup", name: "Passion Syrup", category: "syrup", color: "#efb031" },
  { id: "sugar-syrup", name: "Sugar Syrup", category: "syrup", color: CLEAR, clear: true },
  { id: "grenadine-syrup", name: "Grenadine Syrup", category: "syrup", color: "#b3001b" },
  { id: "lime-juice", name: "Lime Juice", category: "syrup", color: "#eef2d8" },
];

const ingredientsById = new Map(DRINK_INGREDIENTS.map((ingredient) => [ingredient.id, ingredient]));

export const findDrinkIngredient = (id: string): DrinkIngredient | undefined =>
  ingredientsById.get(id);

export const amountsForIngredient = (ingredient: DrinkIngredient): DrinkAmount[] => {
  switch (ingredient.category) {
    case "alcohol":
      return ingredient.strong ? ["2cl", "4cl", "8cl"] : ["2cl", "4cl"];
    case "soda":
      return ["half", "fill", "top"];
    case "syrup":
      return ["2cl", "4cl", "top"];
  }
};

export const emptyDrinkState = (): DrinkState => ({
  pours: [],
  levelCl: 0,
  shots: 0,
  syrupCl: 0,
  halfFills: 0,
  filled: false,
  topped: false,
});

const shotsFor = (ingredient: DrinkIngredient, cl: number) => cl / (ingredient.strong ? 4 : 2);

const fixedCl: Partial<Record<DrinkAmount, number>> = { "2cl": 2, "4cl": 4, "8cl": 8 };

const formatNumber = (value: number) => String(Math.round(value * 10) / 10);

const fail = (reason: string): DrinkCheck => ({ ok: false, reason });

/** Whether `amount` of `ingredient` can be poured next, and how many cl it would be. */
export const checkDrinkStep = (
  state: DrinkState,
  ingredient: DrinkIngredient,
  amount: DrinkAmount
): DrinkCheck => {
  if (!amountsForIngredient(ingredient).includes(amount)) {
    return fail(`${ingredient.name} can't be poured that way.`);
  }

  if (state.topped) {
    return fail("The drink is already topped off. Go back a step to change it.");
  }

  if (amount === "top") {
    if (ingredient.category === "syrup") {
      if (state.syrupCl + DRINK_SYRUP_TOP_CL > DRINK_MAX_SYRUP_CL) {
        return fail(`Max ${DRINK_MAX_SYRUP_CL} cl of syrup and lime juice in total.`);
      }
      return { ok: true, cl: DRINK_SYRUP_TOP_CL };
    }

    const room = DRINK_CUP_CL - state.levelCl;
    return room > 0 ? { ok: true, cl: room } : fail("The cup is full.");
  }

  if (state.filled) {
    return fail("The cup is filled up. You can only top it off now.");
  }

  if (amount === "half" || amount === "fill") {
    const room = DRINK_FILL_LINE_CL - state.levelCl;
    if (room <= 0) {
      return fail("The cup is filled up. You can only top it off now.");
    }
    // A second half fill finishes what the first one started instead of halving again.
    const isFullPour = amount === "fill" || state.halfFills > 0;
    return { ok: true, cl: isFullPour ? room : room / 2 };
  }

  const cl = fixedCl[amount] ?? 0;

  if (ingredient.category === "alcohol") {
    const shots = state.shots + shotsFor(ingredient, cl);
    if (shots > DRINK_MAX_SHOTS) {
      return fail(`Max ${DRINK_MAX_SHOTS} shots. This would make it ${formatNumber(shots)}.`);
    }
  }

  if (ingredient.category === "syrup" && state.syrupCl + cl > DRINK_MAX_SYRUP_CL) {
    return fail(`Max ${DRINK_MAX_SYRUP_CL} cl of syrup and lime juice in total.`);
  }

  if (state.levelCl + cl > DRINK_FILL_LINE_CL) {
    return fail("There is not enough room left in the cup.");
  }

  return { ok: true, cl };
};

/** Pours one step, or returns why it can't be poured. */
export const applyDrinkStep = (
  state: DrinkState,
  step: DrinkStep
): { state: DrinkState } | { error: string } => {
  const ingredient = findDrinkIngredient(step.ingredientId);
  if (!ingredient) {
    return { error: `Unknown ingredient "${step.ingredientId}".` };
  }

  const check = checkDrinkStep(state, ingredient, step.amount);
  if (!check.ok) {
    return { error: check.reason };
  }

  const isAlcohol = ingredient.category === "alcohol";
  const isSyrup = ingredient.category === "syrup";

  return {
    state: {
      pours: [...state.pours, { ingredient, amount: step.amount, cl: check.cl }],
      levelCl: state.levelCl + check.cl,
      shots: state.shots + (isAlcohol ? shotsFor(ingredient, check.cl) : 0),
      syrupCl: state.syrupCl + (isSyrup ? check.cl : 0),
      halfFills: state.halfFills + (step.amount === "half" ? 1 : 0),
      filled:
        state.filled ||
        step.amount === "fill" ||
        (step.amount === "half" && state.halfFills > 0),
      topped: state.topped || step.amount === "top",
    },
  };
};

/** Replays the steps from an empty cup. Stops at the first step that breaks a rule. */
export const buildDrink = (steps: DrinkStep[]): DrinkBuildResult => {
  let state = emptyDrinkState();

  for (const [index, step] of steps.entries()) {
    const result = applyDrinkStep(state, step);
    if ("error" in result) {
      return { state, error: `Step ${index + 1}: ${result.error}` };
    }
    state = result.state;
  }

  return { state };
};

const drinkAmounts: DrinkAmount[] = ["2cl", "4cl", "8cl", "half", "fill", "top"];

export const isDrinkAmount = (value: unknown): value is DrinkAmount =>
  typeof value === "string" && (drinkAmounts as string[]).includes(value);

/**
 * Accepts initials typed as "abcd", "ABCD" or "abcd@itu.dk" and returns them lowercased, or null
 * when they don't look like ITU initials.
 */
export const normalizeItuInitials = (value: string): string | null => {
  const initials = value.trim().toLowerCase().replace(/@itu\.dk$/, "");
  return /^[a-z0-9]{2,12}$/.test(initials) ? initials : null;
};
