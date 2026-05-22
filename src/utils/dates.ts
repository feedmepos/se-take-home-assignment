import moment from "moment";
import config from '../config/config';

export const currentTimestamp = (date?: moment.MomentInput): Date => {
  return moment(date).toDate();
}

export const setTimezoneDate = (date?: moment.MomentInput): string => {
  return moment(date).utcOffset(config.dates.utc).format(config.dates.format);
}

export const getStartOfDay = (date: moment.MomentInput): string => {
  return moment(date).startOf('day').format();
}

export const getEndOfDay = (date: moment.MomentInput): string => {
  return moment(date).endOf('day').format();
}

export const addDays = (date: moment.MomentInput, days: number): string => {
  return moment(date).add(days, 'days').format();
}

export const subtractDays = (date: moment.MomentInput, days: number): string => {
  return moment(date).subtract(days, 'days').format();
}
