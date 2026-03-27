'use client';

/* ------------------------------------------------------------------ */
/* Inline Icons                                                       */
/* ------------------------------------------------------------------ */

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function SpinnerIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type PipelineStage = 'upload' | 'parse' | 'enrich' | 'complete';

interface StageConfig {
  key: PipelineStage;
  label: string;
}

const STAGES: StageConfig[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'parse', label: 'Parse' },
  { key: 'enrich', label: 'Enrich' },
  { key: 'complete', label: 'Complete' },
];

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

interface UploadProgressProps {
  currentStage: PipelineStage;
  stageProgress: number; // 0-100 for current stage
  statusText: string;
  stats?: {
    findingsParsed?: number;
    uniqueCves?: number;
    casesCreated?: number;
  };
}

export function UploadProgress({ currentStage, stageProgress, statusText, stats }: UploadProgressProps) {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="w-full space-y-6">
      {/* Stage circles with connecting lines */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={stage.key} className="flex flex-1 items-center">
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : isCurrent
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon />
                  ) : isCurrent ? (
                    <SpinnerIcon />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isCompleted
                      ? 'text-green-700'
                      : isCurrent
                        ? 'text-primary-700'
                        : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {/* Connecting line */}
              {idx < STAGES.length - 1 && (
                <div className="mx-2 h-0.5 flex-1">
                  <div
                    className={`h-full rounded ${
                      idx < currentIdx ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress details */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">{statusText}</span>
          <span className="text-gray-500">{Math.round(stageProgress)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${stageProgress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      {stats && (stats.findingsParsed != null || stats.uniqueCves != null || stats.casesCreated != null) && (
        <div className="flex gap-6 rounded-lg bg-gray-50 px-4 py-3">
          {stats.findingsParsed != null && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{stats.findingsParsed.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Findings Parsed</p>
            </div>
          )}
          {stats.uniqueCves != null && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{stats.uniqueCves.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Unique CVEs</p>
            </div>
          )}
          {stats.casesCreated != null && (
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">{stats.casesCreated.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Cases Created</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
