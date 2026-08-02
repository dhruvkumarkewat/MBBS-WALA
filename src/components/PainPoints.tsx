const pains = [
  'Counselling stress',
  'Which college for my rank?',
  'Hidden fees & bonds',
  'Confusing cut-offs',
  'Wrong choice filling',
  'State seat confusion',
  'Missed last dates',
  'Document hassle',
];

export default function PainPoints() {
  const doubled = [...pains, ...pains, ...pains];

  return (
    <section className="py-14 sm:py-16 md:py-24 overflow-hidden bg-slate-50 relative border-y border-slate-200">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.08),transparent_60%)]" />
      <div className="text-center mb-8 sm:mb-10 px-4 relative z-10">
        <p className="eyebrow justify-center mb-3 sm:mb-4">We get it</p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-slate-900 tracking-tight">
          Say goodbye to the noise
        </h2>
      </div>

      <div className="relative z-10 space-y-3 sm:space-y-4">
        <div className="flex gap-2.5 sm:gap-3 animate-marquee whitespace-nowrap w-max will-change-transform">
          {doubled.map((p, i) => (
            <span
              key={`a-${i}`}
              className={`inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full font-semibold text-[13px] sm:text-[15px] border border-slate-200 shadow-sm ${
                i % 3 === 0
                  ? 'bg-white text-slate-800'
                  : i % 3 === 1
                  ? 'bg-orange-50 text-orange-900 border-orange-100'
                  : 'bg-amber-50 text-amber-900 border-amber-100'
              }`}
            >
              {p}
            </span>
          ))}
        </div>
        <div
          className="hidden sm:flex gap-3 animate-marquee whitespace-nowrap w-max will-change-transform"
          style={{ animationDirection: 'reverse', animationDuration: '36s' }}
        >
          {[...doubled].reverse().map((p, i) => (
            <span
              key={`b-${i}`}
              className="inline-flex items-center px-6 py-3.5 rounded-full font-semibold text-[15px] border border-slate-200 bg-white text-slate-700 shadow-sm"
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
