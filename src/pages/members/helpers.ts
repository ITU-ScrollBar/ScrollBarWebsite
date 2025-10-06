import { FirebaseDate } from "../../types/types-file";

/**
 * Converts a FirebaseDate object to a number representing the hour.
 * @param date - The FirebaseDate object to convert.
 * @returns A number representing the hour.
 */
export const dateToHour = (date: FirebaseDate): number => {
  const jsDate = new Date(
    (date.seconds || 0) * 1000 + Math.floor((date.nanoseconds || 0) / 1e6)
  );
  return jsDate.getHours();
};

/**
 * Converts a FirebaseDate object to a string representing the hour.
 * @param date - The FirebaseDate object to convert.
 * @returns A string representing the hour.
 */
export const dateToHourString = (date: FirebaseDate): string => {
  return dateToHour(date).toString();
};
