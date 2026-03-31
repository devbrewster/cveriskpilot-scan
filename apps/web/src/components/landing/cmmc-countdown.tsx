"use client";

import { useEffect, useState } from "react";

interface CmmcCountdownProps {
  targetDate: string;
  label: string;
}

function calcTimeLeft(target: Date) {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes, expired: false };
}

export function CmmcCountdown({ targetDate, label }: CmmcCountdownProps) {
  const target = new Date(targetDate);
  const [timeLeft, setTimeLeft] = useState(calcTimeLeft(target));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft(target));
    }, 60_000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const urgent = timeLeft.days < 180;

  return (
    <div className="text-center">
      <p
        className={`text-sm font-semibold uppercase tracking-wider ${
          urgent ? "text-amber-400" : "text-primary-400"
        }`}
      >
        {label}
      </p>

      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-6">
        {/* Days */}
        <div className="flex flex-col items-center">
          <span
            className={`text-5xl font-extrabold tabular-nums sm:text-6xl lg:text-7xl ${
              urgent ? "text-amber-400" : "text-white"
            }`}
          >
            {timeLeft.days}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400">
            Days
          </span>
        </div>

        <span className="text-3xl font-light text-gray-600 sm:text-4xl">:</span>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <span
            className={`text-5xl font-extrabold tabular-nums sm:text-6xl lg:text-7xl ${
              urgent ? "text-amber-300" : "text-white"
            }`}
          >
            {String(timeLeft.hours).padStart(2, "0")}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400">
            Hours
          </span>
        </div>

        <span className="text-3xl font-light text-gray-600 sm:text-4xl">:</span>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <span
            className={`text-5xl font-extrabold tabular-nums sm:text-6xl lg:text-7xl ${
              urgent ? "text-amber-300" : "text-white"
            }`}
          >
            {String(timeLeft.minutes).padStart(2, "0")}
          </span>
          <span className="mt-1 text-xs font-medium uppercase tracking-wider text-gray-400">
            Minutes
          </span>
        </div>
      </div>

      {timeLeft.expired && (
        <p className="mt-4 text-lg font-semibold text-red-400">
          The deadline has passed.
        </p>
      )}
    </div>
  );
}
