import type { Seconds } from "./domain.js";

export function formatSecondsAsTime(totalSeconds: number): string {
  const secondsInDay = 24 * 60 * 60;
  const normalized = ((totalSeconds % secondsInDay) + secondsInDay) % secondsInDay;
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

export function parseTimeToSeconds(time: string): Seconds {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new Error("Time must be in HH:MM:SS format");
  }

  const [, hoursText, minutesText, secondsText] = match;
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  const seconds = Number(secondsText);

  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new Error("Time must be a valid HH:MM:SS value");
  }

  return toSeconds(hours * 3600 + minutes * 60 + seconds);
}

export function toSeconds(value: number): Seconds {
  return value as Seconds;
}
