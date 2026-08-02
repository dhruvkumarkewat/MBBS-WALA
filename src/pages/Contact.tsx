import { useState } from 'react';
import { Mail, Phone, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../contexts/ToastContext';
import { staggerContainer, staggerItem } from '../lib/motion';

export default function Contact() {
  const { success, error: toastError } = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      toastError('Missing details', 'Name and phone are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setOk('Thanks! Your inquiry was saved. Our counselling team will reach out soon.');
      success('Inquiry sent', 'We will call you back shortly.');
      setForm({ name: '', email: '', phone: '', address: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toastError('Could not send', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-secondary mb-2">Contact</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Contact Us</h1>
        <p className="text-text-grey font-medium">Have questions? We&apos;re here to help you 7 days a week.</p>
      </div>

      <motion.div
        className="grid lg:grid-cols-2 gap-8"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.div className="space-y-4" variants={staggerItem}>
          <a href="tel:+917880119983" className="zn-card p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-blue-bg border-2 border-black grid place-items-center">
              <Phone className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-text-grey">Call / WhatsApp</p>
              <p className="font-extrabold text-lg">+91 78801 19983</p>
            </div>
          </a>
          <a href="https://wa.me/7880119983" target="_blank" rel="noreferrer" className="zn-card p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-green-bg border-2 border-black grid place-items-center">
              <MessageCircle className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-text-grey">Chat on WhatsApp</p>
              <p className="font-extrabold text-lg">7880119983</p>
            </div>
          </a>
          <a href="mailto:info@mbbswala.in" className="zn-card p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-yellow-bg border-2 border-black grid place-items-center">
              <Mail className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-text-grey">Email</p>
              <p className="font-extrabold">info@mbbswala.in</p>
              <p className="text-sm font-medium text-text-grey">mbbswala023@gmail.com</p>
            </div>
          </a>
          <div className="zn-card p-5 flex items-center gap-4">
            <span className="w-12 h-12 rounded-full bg-orange-bg border-2 border-black grid place-items-center">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-text-grey">Location</p>
              <p className="font-extrabold">Bhopal, Madhya Pradesh 462026</p>
            </div>
          </div>
        </motion.div>

        <motion.form variants={staggerItem} onSubmit={submit} className="zn-card p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-extrabold mb-2">Looking for medical admission?</h2>
          {(['name', 'email', 'phone', 'address'] as const).map((field) => (
            <label key={field} className="block">
              <span className="text-xs font-bold uppercase text-text-grey">
                {field === 'name' || field === 'phone' ? `${field} *` : field}
              </span>
              <input
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="mt-1 w-full border-2 border-black rounded px-3 py-2.5 font-medium"
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                required={field === 'name' || field === 'phone'}
              />
            </label>
          ))}
          <label className="block">
            <span className="text-xs font-bold uppercase text-text-grey">Message</span>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
              className="mt-1 w-full border-2 border-black rounded px-3 py-2.5 font-medium resize-y"
              placeholder="NEET rank, preferred states, category…"
            />
          </label>
          {error && <p className="text-sm font-semibold text-red-600 bg-red-bg/40 px-3 py-2 rounded">{error}</p>}
          {ok && <p className="text-sm font-semibold bg-green-bg px-3 py-2 rounded border border-black/10">{ok}</p>}
          <button type="submit" disabled={loading} className="zn-cta zn-cta-primary w-full justify-center disabled:opacity-60">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : 'Send Message'}
          </button>
        </motion.form>
      </motion.div>
    </div>
  );
}
