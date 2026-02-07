import { DateTime } from 'luxon';

export const WIB_ZONE = 'Asia/Jakarta';

export function nowWib() {
  return DateTime.now().setZone(WIB_ZONE);
}

export function startOfDayWib(dateTime = nowWib()) {
  return dateTime.startOf('day');
}

export function endOfDayWib(dateTime = nowWib()) {
  return dateTime.endOf('day');
}

export function isoToWib(iso) {
  return DateTime.fromISO(iso, { zone: 'utc' }).setZone(WIB_ZONE);
}

export function inRangeWib(iso, startIso, endIso) {
  const t = isoToWib(iso);
  const s = DateTime.fromISO(startIso, { zone: WIB_ZONE }).startOf('day');
  const e = DateTime.fromISO(endIso, { zone: WIB_ZONE }).endOf('day');
  return t >= s && t <= e;
}

export function todayRangeWib() {
  const s = startOfDayWib();
  const e = endOfDayWib();
  return { start: s, end: e };
}

export function formatWib(dt) {
  return dt.setZone(WIB_ZONE).toFormat('dd LLL yyyy HH:mm');
}

export function hourKeyWib(iso) {
  const dt = isoToWib(iso);
  return dt.toFormat('HH');
}

export function dateKeyWib(iso) {
  const dt = isoToWib(iso);
  return dt.toFormat('yyyy-LL-dd');
}
