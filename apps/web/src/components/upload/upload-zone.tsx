'use client';

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { UploadProgress, type PipelineStage } from './upload-progress';
import { MAX_UPLOAD_SIZE_BYTES, MAX_UPLOAD_SIZE_LABEL, ACCEPTED_FILE_TYPES } from '@/lib/constants';
import { formatFileSize } from '@/lib/format';
import { useClientContext } from '@/lib/client-context';

/* ------------------------------------------------------------------ */
/* Inline Icons                                                       */
/* ------------------------------------------------------------------ */

function CloudUploadIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function ExclamationCircleIcon({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Upload state machine                                               */
/* ------------------------------------------------------------------ */

type UploadState =
  | { kind: 'idle' }
  | { kind: 'dragover' }
  | { kind: 'uploading'; filename: string; progress: number }
  | { kind: 'processing'; filename: string; stage: PipelineStage; stageProgress: number; statusText: string; stats: { findingsParsed?: number; uniqueCves?: number; casesCreated?: number } }
  | { kind: 'complete'; filename: string; stats: { findingsParsed: number; uniqueCves: number; casesCreated: number } }
  | { kind: 'error'; filename: string; message: string };

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

const ACCEPTED_EXTENSIONS = ACCEPTED_FILE_TYPES.join(',');

function getFileExtension(name: string): string {
  // Handle compound extensions like .cdx.json
  if (name.endsWith('.cdx.json')) return '.cdx.json';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot) : '';
}

function isAcceptedFile(name: string): boolean {
  const ext = getFileExtension(name).toLowerCase();
  return (ACCEPTED_FILE_TYPES as readonly string[]).includes(ext);
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export function UploadZone() {
  const [state, setState] = useState<UploadState>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);
  const { activeClientId } = useClientContext();

  const reset = useCallback(() => {
    abortRef.current = true;
    setState({ kind: 'idle' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  /* Detect parser format from file extension */
  const detectParserFormat = useCallback((name: string): string => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.nessus')) return 'NESSUS';
    if (lower.endsWith('.sarif')) return 'SARIF';
    if (lower.endsWith('.cdx.json')) return 'CYCLONEDX';
    if (lower.endsWith('.csv')) return 'CSV';
    if (lower.endsWith('.xlsx')) return 'XLSX';
    if (lower.endsWith('.xml')) return 'NESSUS'; // default XML to Nessus
    if (lower.endsWith('.json')) return 'JSON_FORMAT';
    return 'JSON_FORMAT';
  }, []);

  /* Upload file to /api/upload via XHR for progress tracking */
  const uploadFile = useCallback((file: File) => {
    abortRef.current = false;

    // Require a client to be selected before uploading
    if (!activeClientId) {
      setState({ kind: 'error', filename: file.name, message: 'Please select a client from the sidebar before uploading. Uploads must be associated with a client.' });
      return;
    }

    // Validate extension
    if (!isAcceptedFile(file.name)) {
      setState({ kind: 'error', filename: file.name, message: `Unsupported file type. Accepted: ${ACCEPTED_FILE_TYPES.join(', ')}` });
      return;
    }

    // Validate size
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setState({ kind: 'error', filename: file.name, message: `File is too large (${formatFileSize(file.size)}). Maximum allowed size is ${MAX_UPLOAD_SIZE_LABEL}.` });
      return;
    }

    const filename = file.name;
    setState({ kind: 'uploading', filename, progress: 0 });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', activeClientId);
    formData.append('parserFormat', detectParserFormat(file.name));

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (abortRef.current) { xhr.abort(); return; }
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setState({ kind: 'uploading', filename, progress });
      }
    });

    xhr.addEventListener('load', () => {
      if (abortRef.current) return;

      if (xhr.status >= 200 && xhr.status < 300) {
        let response: { jobId?: string; artifactId?: string };
        try {
          response = JSON.parse(xhr.responseText);
        } catch {
          setState({ kind: 'error', filename, message: 'Invalid response from server.' });
          return;
        }

        // Move to processing state — the backend processes asynchronously
        setState({
          kind: 'processing', filename,
          stage: 'parse', stageProgress: 0,
          statusText: 'Upload complete. Processing queued...',
          stats: {},
        });

        // Poll job status if we have a jobId
        if (response.jobId) {
          pollJobStatus(response.jobId, filename);
        } else {
          // No job ID, just show completion
          setState({
            kind: 'complete', filename,
            stats: { findingsParsed: 0, uniqueCves: 0, casesCreated: 0 },
          });
        }
      } else {
        let errorMsg = 'Upload failed.';
        try {
          const body = JSON.parse(xhr.responseText);
          if (body.error) errorMsg = body.error;
        } catch {
          // Use default error message
        }
        setState({ kind: 'error', filename, message: errorMsg });
      }
    });

    xhr.addEventListener('error', () => {
      if (abortRef.current) return;
      setState({ kind: 'error', filename, message: 'Network error. Please check your connection and try again.' });
    });

    xhr.addEventListener('abort', () => {
      if (!abortRef.current) {
        setState({ kind: 'error', filename, message: 'Upload was cancelled.' });
      }
    });

    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  }, [detectParserFormat, activeClientId]);

  /* Poll /api/upload/[jobId] for processing progress */
  const pollJobStatus = useCallback((jobId: string, filename: string) => {
    let attempts = 0;
    const maxAttempts = 120; // 2 minutes at 1s interval

    const poll = () => {
      if (abortRef.current || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) {
          setState({ kind: 'error', filename, message: 'Processing timed out. The job may still be running in the background.' });
        }
        return;
      }
      attempts++;

      fetch(`/api/upload/${encodeURIComponent(jobId)}`)
        .then((res) => res.json())
        .then((data: {
          status: string;
          progress?: {
            totalFindings?: number;
            parsedFindings?: number;
            uniqueCvesEnriched?: number;
            findingsCreated?: number;
            casesCreated?: number;
          };
          error?: string;
        }) => {
          if (abortRef.current) return;

          const p = data.progress ?? {};
          const stats = {
            findingsParsed: p.parsedFindings,
            uniqueCves: p.uniqueCvesEnriched,
            casesCreated: p.casesCreated,
          };

          switch (data.status) {
            case 'QUEUED':
              setState({
                kind: 'processing', filename,
                stage: 'parse', stageProgress: 0,
                statusText: 'Waiting in queue...',
                stats,
              });
              setTimeout(poll, 1000);
              break;
            case 'PARSING':
              setState({
                kind: 'processing', filename,
                stage: 'parse',
                stageProgress: p.totalFindings ? Math.round(((p.parsedFindings ?? 0) / p.totalFindings) * 100) : 50,
                statusText: `Parsing findings... ${p.parsedFindings ?? 0} found`,
                stats,
              });
              setTimeout(poll, 1000);
              break;
            case 'ENRICHING':
              setState({
                kind: 'processing', filename,
                stage: 'enrich',
                stageProgress: p.parsedFindings ? Math.round(((p.uniqueCvesEnriched ?? 0) / p.parsedFindings) * 100) : 50,
                statusText: `Enriching with CVE data... ${p.uniqueCvesEnriched ?? 0} enriched`,
                stats,
              });
              setTimeout(poll, 1000);
              break;
            case 'BUILDING_CASES':
              setState({
                kind: 'processing', filename,
                stage: 'complete', stageProgress: 50,
                statusText: `Building cases... ${p.casesCreated ?? 0} created`,
                stats,
              });
              setTimeout(poll, 1000);
              break;
            case 'COMPLETED':
              setState({
                kind: 'complete', filename,
                stats: {
                  findingsParsed: p.parsedFindings ?? 0,
                  uniqueCves: p.uniqueCvesEnriched ?? 0,
                  casesCreated: p.casesCreated ?? 0,
                },
              });
              break;
            case 'FAILED':
              setState({
                kind: 'error', filename,
                message: data.error ?? 'Processing failed. Please try again.',
              });
              break;
            default:
              setTimeout(poll, 1000);
              break;
          }
        })
        .catch(() => {
          if (abortRef.current) return;
          // Retry on network error
          setTimeout(poll, 2000);
        });
    };

    setTimeout(poll, 1000);
  }, []);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      uploadFile(file);
    },
    [uploadFile],
  );

  /* ---- Event handlers ---- */

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.kind === 'idle') setState({ kind: 'dragover' });
  }, [state.kind]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.kind === 'dragover') setState({ kind: 'idle' });
  }, [state.kind]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      handleFile(file);
    },
    [handleFile],
  );

  const openFilePicker = useCallback(() => {
    if (state.kind === 'idle' || state.kind === 'dragover') {
      fileInputRef.current?.click();
    }
  }, [state.kind]);

  /* ---- Render ---- */

  // Idle / Dragover state
  if (state.kind === 'idle' || state.kind === 'dragover') {
    const isDragover = state.kind === 'dragover';
    return (
      <div
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={openFilePicker}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
          isDragover
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 bg-white dark:bg-gray-900 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <CloudUploadIcon
          className={`h-14 w-14 ${isDragover ? 'text-primary-500' : 'text-gray-400'}`}
        />
        <p className={`mt-4 text-base font-medium ${isDragover ? 'text-primary-700' : 'text-gray-700'}`}>
          {isDragover ? 'Drop to upload' : 'Drag and drop your scan file, or click to browse'}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Supports {ACCEPTED_FILE_TYPES.join(', ')} &middot; Max {MAX_UPLOAD_SIZE_LABEL}
        </p>
        {!activeClientId && (
          <p className="mt-3 text-sm font-medium text-amber-600 dark:text-amber-400">
            Select a client from the sidebar before uploading
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS}
          onChange={onFileChange}
        />
      </div>
    );
  }

  // Uploading state
  if (state.kind === 'uploading') {
    return (
      <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-6 py-12">
        <p className="mb-4 text-sm font-medium text-gray-700">
          Uploading <span className="font-semibold">{state.filename}</span>
        </p>
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Uploading...</span>
            <span>{Math.round(state.progress)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-primary-500 transition-all duration-100 ease-linear"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Processing state
  if (state.kind === 'processing') {
    return (
      <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white dark:bg-gray-900 px-6 py-12">
        <p className="mb-6 text-sm font-medium text-gray-700">
          Processing <span className="font-semibold">{state.filename}</span>
        </p>
        <div className="w-full max-w-lg">
          <UploadProgress
            currentStage={state.stage}
            stageProgress={state.stageProgress}
            statusText={state.statusText}
            stats={state.stats}
          />
        </div>
      </div>
    );
  }

  // Complete state
  if (state.kind === 'complete') {
    return (
      <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 px-6 py-12">
        <CheckCircleIcon className="h-14 w-14 text-green-500" />
        <h3 className="mt-4 text-lg font-semibold text-green-800">Upload Complete!</h3>
        <p className="mt-2 text-sm text-green-700">
          {state.stats.findingsParsed} findings parsed, {state.stats.uniqueCves} unique CVEs, {state.stats.casesCreated} cases created
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/findings"
            className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            View Findings
          </Link>
          <button
            onClick={reset}
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Upload Another
          </button>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-12">
      <ExclamationCircleIcon className="h-14 w-14 text-red-500" />
      <h3 className="mt-4 text-lg font-semibold text-red-800">Upload Failed</h3>
      <p className="mt-2 max-w-md text-center text-sm text-red-700">{state.message}</p>
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
