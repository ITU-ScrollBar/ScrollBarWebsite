export type SignupWindowState = {
  isOpen: boolean;
  isConfigured: boolean;
  start: Date | null;
  end: Date | null;
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

export const getSignupWindowState = (
  startValue?: string,
  endValue?: string,
  now = new Date()
): SignupWindowState => {
  const start = parseDate(startValue);
  const end = parseDate(endValue);
  const isConfigured = !!start && !!end;

  if (!isConfigured) {
    return {
      isOpen: false,
      isConfigured,
      start,
      end,
    };
  }

  return {
    isOpen: now >= start && now <= end,
    isConfigured,
    start,
    end,
  };
};

export const toDateTimeInputValue = (value?: string): string => {
  const parsed = parseDate(value);
  if (!parsed) return "";

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60000;
  const localDate = new Date(parsed.getTime() - timezoneOffsetMs);
  return localDate.toISOString().slice(0, 16);
};

export const fromDateTimeInputValue = (value: string): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
};

export const formatWindowDate = (value?: Date | null): string => {
  if (!value) return "Not set";
  return value.toLocaleString();
};
