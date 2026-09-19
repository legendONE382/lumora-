import Header from "@/components/Header";
import Hero from "@/components/Hero";

function SectionHeading({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <h2 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

const STEPS = [
  {
    title: "Give Lumora your idea",
    description:
      "Paste a URL, describe your product, or simply explain what you want the video to communicate.",
  },
  {
    title: "Lumora understands it",
    description:
      "Lumora analyzes the input, identifies the subject, audience, and creative direction.",
  },
  {
    title: "Lumora creates the video",
    description:
      "Lumora writes the script, plans scenes, generates visuals and narration, and renders a playable video.",
  },
];

const USE_CASES = [
  "Product Ads",
  "Explainer Videos",
  "Product Launches",
  "Social Videos",
  "Company Videos",
  "Educational Videos",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <Header />
      <Hero />

      <section className="py-24 sm:py-32">
        <SectionHeading
          label="Workflow"
          title="How it works"
          description="From idea to finished video in seconds."
        />
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-gray-300">
                {index + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 sm:py-32 border-t border-white/10">
        <SectionHeading
          label="Capabilities"
          title="Not just ads"
          description="Lumora is a general creative studio. It can create many kinds of videos."
        />
        <div className="mx-auto mt-16 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-center text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:text-white"
            >
              {useCase}
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          Lumora AI. Built for creators.
        </div>
      </footer>
    </main>
  );
}
