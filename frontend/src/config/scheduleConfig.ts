export const SCHEDULE_CONFIG = {
  START_HOUR: 9,
  END_HOUR: 21,
  HOUR_HEIGHT: 34,
  CURRENT_TIME_LINE: {
    CONTAINER_CLASS: 'absolute inset-x-0 z-30 pointer-events-none flex items-center min-w-max',
    DOT_CLASS: 'w-2 h-2 rounded-full bg-error -translate-x-1/2 shrink-0',
    BAR_CLASS: 'h-[2px] w-full bg-error/70',
  },
  get MINUTE_HEIGHT() {
    return this.HOUR_HEIGHT / 60;
  },
} as const;
