// @cveriskpilot/streaming — Full streaming pipeline with SSE

export type {
  PipelinePhase,
  StreamEventType,
  StreamEvent,
  ProgressData,
  PhaseChangeData,
  FindingData,
  ErrorData,
  SSEConnection,
  ProgressUpdate,
  PipelineOptions,
} from './types';

export { SSEEmitter } from './sse-emitter';

export { ProgressTracker, InMemoryRedis } from './progress-tracker';
export type { RedisLike } from './progress-tracker';

export { StreamingPipeline } from './pipeline';
export type {
  RawFinding,
  EnrichedFinding,
  DeduplicatedFinding,
  PipelineStages,
  PipelineResult,
} from './pipeline';
