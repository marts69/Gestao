import React from 'react';

interface ScheduleRulerGridProps {
  startHour: number;
  endHour: number;
  hourHeight: number;
  hourColumnClassName: string;
  labelClassName: string;
}

export function ScheduleRulerGrid({
  startHour,
  endHour,
  hourHeight,
  hourColumnClassName,
  labelClassName,
}: ScheduleRulerGridProps) {
  const timelineHours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);

  return (
    <>
      <div className={hourColumnClassName}>
        {timelineHours.map((hour) => (
          <div key={hour} className="relative w-full" style={{ height: hourHeight }}>
            <span className={labelClassName}>
              {hour.toString().padStart(2, '0')}:00
            </span>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col pointer-events-none z-0 min-w-max">
        {timelineHours.map((hour) => (
          <div key={`bg-line-${hour}`} className="w-full border-b border-outline-variant/10" style={{ height: hourHeight }}></div>
        ))}
      </div>
    </>
  );
}