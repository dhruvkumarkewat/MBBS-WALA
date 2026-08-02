import Hero from '../components/Hero';
import Stats from '../components/Stats';
import PainPoints from '../components/PainPoints';
import Explainer from '../components/Explainer';
import Features from '../components/Features';
import PackagesGrid from '../components/PackagesGrid';
import Support from '../components/Support';
import AppPromo from '../components/AppPromo';
import Testimonials from '../components/Testimonials';
import FAQ from '../components/FAQ';
import MbbsWalaTools from '../components/MbbsWalaTools';
import ChoiceFinder from '../components/ChoiceFinder';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Full homepage section flow.
 * Theme-aware shell: dark = cinematic; light = bright surfaces + dark text.
 */
export default function Home() {
  const { theme } = useTheme();
  const light = theme === 'light';

  return (
    <div
      className={`landing-home ${light ? 'landing-home-light' : 'landing-home-dark'}`}
      data-home-theme={theme}
    >
      <Hero />

      <section
        className={`relative z-20 -mt-4 sm:-mt-10 px-3 xs:px-4 sm:px-6 pb-10 sm:pb-14 ${
          light
            ? 'bg-gradient-to-b from-white via-slate-50 to-slate-100'
            : 'bg-gradient-to-b from-[#0B0D12] via-[#0E1117] to-[#12151C]'
        }`}
      >
        <div className="max-w-3xl mx-auto w-full min-w-0">
          <ChoiceFinder embedded />
        </div>
      </section>

      <Stats />

      <MbbsWalaTools />

      <PainPoints />

      <Explainer />

      <Features />

      <section
        className={`py-16 sm:py-20 md:py-24 px-4 sm:px-6 ${
          light ? 'bg-slate-50' : 'bg-[#12151C]'
        }`}
      >
        <div className="text-center mb-10 sm:mb-12 max-w-2xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F97316] mb-3">
            Packages
          </p>
          <h2
            className={`font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 ${
              light ? 'text-slate-900' : 'text-white'
            }`}
          >
            Big on data.
            <br />
            <span className={light ? 'text-slate-700' : 'text-white/90'}>Light on your pocket.</span>
          </h2>
          <p className={`font-medium ${light ? 'text-slate-600' : 'text-white/55'}`}>
            Clear counselling plans for every exam — no hidden charges.
          </p>
        </div>
        <div className="max-w-5xl mx-auto">
          <PackagesGrid />
          <div className="text-center mt-10">
            <Link
              to="/packages"
              className={light ? 'zn-cta zn-cta-primary inline-flex' : 'zn-cta-ghost inline-flex'}
            >
              View all packages
            </Link>
          </div>
        </div>
      </section>

      <Support />

      <AppPromo />

      <Testimonials />

      <FAQ />
    </div>
  );
}
