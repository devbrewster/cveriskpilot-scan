export function VeteranOwned() {
  return (
    <section className="border-t border-gray-200 bg-gray-50 py-16 sm:py-20 dark:border-gray-800 dark:bg-gray-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          {/* Star icon */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/40">
            <svg className="h-7 w-7 text-primary-700 dark:text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              100% Veteran Owned Business
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              CVERiskPilot LLC is a Texas-registered, 100% Veteran Owned small business.
              For federal and defense buyers, this means eligibility for SDVOSB set-aside contracts
              and small business procurement programs. We built this platform because we lived the compliance
              problem — and we built it to the standards we were trained to uphold.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
