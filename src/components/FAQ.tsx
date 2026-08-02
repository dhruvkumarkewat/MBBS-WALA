import { useEffect, useState } from 'react';
import { Phone, MessageCircle, Plus, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

interface Faq {
  id: number;
  question: string;
  answer: string;
}

const FALLBACK_FAQS: Faq[] = [
  {
    id: 1,
    question: 'How do I start with MBBS WAALA?',
    answer:
      'Call or WhatsApp +91 78880 19983, email info@mbbswala.in, or fill the contact form. Share your NEET details and preferred states — we will guide the next steps.',
  },
  {
    id: 2,
    question: 'What kind of help do you give?',
    answer:
      'We help with college shortlisting, choice filling, document preparation, and counselling strategy for NEET UG and NEET PG. Our team stays with you from rank to final allotment.',
  },
  {
    id: 3,
    question: 'Can I ask doubts about my rank and colleges?',
    answer:
      'Yes! You can call or WhatsApp us anytime during counselling season. We answer questions on cut-offs, seat availability, quota eligibility, and which colleges to prefer for your rank.',
  },
  {
    id: 4,
    question: 'Do you conduct mock tests for NEET?',
    answer:
      'We focus on counselling support, not test preparation. However, we can connect you with trusted coaching partners in Bhopal if you need NEET preparation guidance.',
  },
  {
    id: 5,
    question: 'Which states do you cover?',
    answer:
      'We cover all major states including Madhya Pradesh, Maharashtra, Rajasthan, UP, Delhi, Karnataka, Tamil Nadu, and 20+ more. We also support All India Quota (AIQ) and deemed university admissions.',
  },
  {
    id: 6,
    question: 'How can I contact MBBSWALA?',
    answer:
      'Call/WhatsApp: +91 78880 19983. Email: info@mbbswala.in. Office: Bhopal, Madhya Pradesh. We are available 7 days a week during counselling season.',
  },
];

export default function FAQ() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [open, setOpen] = useState<number | null>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/faqs')
      .then((r) => {
        if (!r.ok) throw new Error('API failed');
        return r.json();
      })
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setFaqs(d);
        } else {
          setFaqs(FALLBACK_FAQS);
        }
      })
      .catch(() => setFaqs(FALLBACK_FAQS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="premium-section bg-slate-50 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 right-0 w-96 h-96 bg-[#F97316]/10 blur-3xl rounded-full" />

      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.9fr_1.3fr] gap-12 lg:gap-16 items-start relative z-10">
        <div className="lg:sticky lg:top-28">
          <p className="eyebrow mb-4">FAQ</p>
          <h2 className="section-title text-4xl md:text-5xl mb-5 text-slate-900">
            Questions you might be wondering
          </h2>
          <p className="text-slate-600 font-medium mb-8 text-lg leading-relaxed">
            Simple answers from the MBBSWala team — easy words, clear steps.
          </p>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 text-slate-900 p-7 shadow-sm">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-orange-200/40 blur-3xl" />
            <p className="font-display text-2xl mb-2 relative z-10 text-slate-900">
              Still have questions?
            </p>
            <p className="text-sm font-medium text-slate-600 mb-6 relative z-10 leading-relaxed">
              We respond quickly on call, WhatsApp and email — 7 days a week from Bhopal.
            </p>
            <div className="flex flex-wrap gap-2 relative z-10">
              <a href="tel:+917880119983" className="btn-orange px-5 py-2.5 text-sm gap-2">
                <Phone className="w-4 h-4" /> Call us
              </a>
              <a
                href="https://wa.me/7880119983"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 transition-colors"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
              <Link to="/contact" className="zn-cta text-sm py-2.5 px-5">
                Contact form
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {loading &&
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-18 bg-white/5 border border-white/10 rounded-2xl animate-pulse" />
            ))}
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.id}
                className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
                  isOpen
                    ? 'border-[#F97316]/40 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-4 p-5 md:p-6 text-left"
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span className="font-bold text-slate-900 text-[15px] md:text-base pr-2">{f.question}</span>
                  <span
                    className={`shrink-0 w-9 h-9 rounded-full grid place-items-center transition-all duration-300 ${
                      isOpen
                        ? 'bg-secondary text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 md:px-6 pb-6 text-slate-600 font-medium leading-relaxed border-t border-slate-100">
                        <p className="pt-4">{f.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
