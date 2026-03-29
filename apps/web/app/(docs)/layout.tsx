import { NavBar } from "@/components/landing/nav-bar";
import { Footer } from "@/components/landing/footer";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark">
      <NavBar />
      <main className="min-h-screen bg-slate-950 pt-24 pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
