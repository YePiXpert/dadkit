const BABY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const BABY_TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isLocalCalendarDate(value: string) {
  const match = BABY_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isLocalClockTime(value: string) {
  return BABY_TIME_PATTERN.test(value);
}

export function birthDayNumber(birthDate: string, today = new Date()) {
  if (!isLocalCalendarDate(birthDate)) return undefined;
  const [year, month, day] = birthDate.split("-").map(Number);
  const birthNoon = new Date(year!, month! - 1, day!, 12);
  const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12);
  const difference = Math.round((todayNoon.getTime() - birthNoon.getTime()) / 86_400_000);
  return difference < 0 ? undefined : difference + 1;
}

export function localDayRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export function localDateTimeInputValue(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${localDateString(date)}T${hours}:${minutes}`;
}

export function localDateTimeInputToIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, yearText, monthText, dayText, hourText, minuteText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!isLocalCalendarDate(`${yearText}-${monthText}-${dayText}`) || !isLocalClockTime(`${hourText}:${minuteText}`)) return undefined;
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  ) return undefined;
  return date.toISOString();
}
