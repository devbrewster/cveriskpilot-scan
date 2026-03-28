import { NavBar } from "@/components/landing/nav-bar";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { Features } from "@/components/landing/features";
import { PipelineSection } from "@/components/landing/pipeline-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Pricing } from "@/components/landing/pricing";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="dark">
      <NavBar />
      <main>
        <Hero />
        <SocialProof />
        <Features />
        <PipelineSection />
        <HowItWorks />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
