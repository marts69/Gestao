export const SCHEDULE_CONFIG = {
  START_HOUR: 9,
  END_HOUR: 21,
  HOUR_HEIGHT: 34,
  get MINUTE_HEIGHT() {
    return this.HOUR_HEIGHT / 60;
  },
} as const;
