/**
 * Override the (public) group's card-centered layout for the pricing page.
 *
 * The parent (public)/layout.tsx wraps children in a narrow card suitable for
 * auth forms. The pricing page is a full-width marketing page, so this layout
 * breaks out of those constraints. The parent's outer div still renders, but
 * we override its visual constraints with utility classes on the wrapper.
 *
 * NOTE: If the (public) layout is ever refactored to be a pass-through, this
 * override can be removed.
 */
export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-white dark:bg-gray-950">
      {children}
    </div>
  );
}
