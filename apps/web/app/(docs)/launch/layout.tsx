/**
 * Launch page layout — breaks out of the parent (docs) max-w-4xl + px
 * container so sections can render full-bleed with their own max-w-6xl.
 *
 * Also hides the parent container padding so sections control their own spacing.
 */
export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-screen -ml-[50vw] left-1/2">
      {children}
    </div>
  );
}
