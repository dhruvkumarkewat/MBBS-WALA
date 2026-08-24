import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  QrCode, Copy, Check, Upload, ArrowRight, ArrowLeft,
  Clock, CheckCircle2, AlertCircle, Loader2, Camera,
  Smartphone, Shield, X, FileImage, IndianRupee, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiJson } from '../../lib/api';

const UPI_ID = 'mbbswala060826@aubiz'; // AU Bank UPI ID from official QR code

const PLANS: Record<string, { name: string; price: number }> = {
  basic: { name: 'BASIC Plan', price: 99 },
  'neet-ug-pro': { name: 'NEET UG Counselling Pro', price: 4999 },
  ultimate: { name: 'Ultimate Medical Master Bundle', price: 9999 },
};

type Step = 'qr' | 'submit' | 'pending' | 'done';

export function UpiPaymentPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const planSlug = searchParams.get('plan') || 'basic';
  const plan = PLANS[planSlug] || PLANS['basic'];

  const [qrLoaded, setQrLoaded] = useState(false);
  const [qrError, setQrError] = useState(false);
  const qrImgRef = useRef<HTMLImageElement>(null);
  const [step, setStep] = useState<Step>('qr');
  const [copied, setCopied] = useState(false);
  const [upiCopied, setUpiCopied] = useState(false);
  const [utr, setUtr] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fix: if browser has /upi-qr.jpg cached, onLoad fires before React attaches the listener.
  // Check img.complete immediately after mount to handle that case.
  useEffect(() => {
    if (qrImgRef.current?.complete && !qrImgRef.current.naturalWidth) {
      setQrError(true);
    } else if (qrImgRef.current?.complete) {
      setQrLoaded(true);
    }
  }, []);

  // On mount: check if user already submitted a payment for this plan.
  // If so, restore the 'pending' step so reload doesn't show the form again.
  useEffect(() => {
    if (!user?.id) return;
    apiJson<any[]>('/api/upi-payment', { method: 'GET' }, true)
      .then((requests) => {
        if (!Array.isArray(requests)) return;
        const existing = requests.find(
          (r) => r.plan_slug === planSlug && (r.status === 'pending' || r.status === 'under_review')
        );
        if (existing) {
          setStep('pending');
          setUtr(existing.utr_number || '');
        }
      })
      .catch(() => {}); // silent fail — don't block the page
  }, [user?.id, planSlug]);

  const copyUpiId = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    setUpiCopied(true);
    setTimeout(() => { setCopied(false); setUpiCopied(false); }, 2500);
  };

  // UPI deep link — opens UPI app directly with pre-filled details
  const openUpiApp = () => {
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=MBBSWala&am=${plan.price}&cu=INR&tn=${encodeURIComponent(plan.name)}`;
    window.location.href = upiLink;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }
    setScreenshotFile(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadScreenshot = async (): Promise<string | null> => {
    if (!screenshotFile || !screenshotPreview) return null;
    try {
      const result = await apiJson<{ url: string }>('/api/upload', {
        method: 'POST',
        body: JSON.stringify({
          file_base64: screenshotPreview,
          file_name: screenshotFile.name,
          mime_type: screenshotFile.type,
        }),
      }, true);
      return result.url;
    } catch (err: any) {
      console.warn('Screenshot upload failed:', err.message);
      return null; // Non-blocking
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!utr.trim() || utr.trim().length < 6) {
      setError('Please enter a valid UTR / transaction reference number (minimum 6 characters)');
      return;
    }

    setSubmitting(true);
    try {
      setUploading(true);
      const screenshotUrl = await uploadScreenshot();
      setUploading(false);

      await apiJson('/api/upi-payment', {
        method: 'POST',
        body: JSON.stringify({
          action: 'submit',
          plan_slug: planSlug,
          plan_name: plan.name,
          amount: plan.price,
          utr_number: utr.trim(),
          screenshot_url: screenshotUrl,
        }),
      }, true);

      setStep('pending');
      success('Payment Submitted!', 'Admin will verify and activate your package within 5 minutes.');
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
      toastError('Submission Failed', err.message || 'Please try again.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (step === 'pending') {
    return (
      <div className="max-w-lg mx-auto pt-12 pb-20 px-4 flex flex-col items-center text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-foreground mb-2">Payment Under Review</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your payment details have been submitted successfully.<br />
            <strong className="text-foreground">Please wait up to 5 minutes</strong> — our admin is reviewing your UTR number and screenshot.
          </p>
        </div>
        <div className="w-full p-4 rounded-2xl bg-card border border-border/60 text-left space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm text-foreground font-medium">Payment submitted for <strong>{plan.name}</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm text-foreground font-medium">UTR: <code className="bg-muted px-1.5 py-0.5 rounded text-primary">{utr}</code></span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-sm text-muted-foreground">Waiting for admin verification...</span>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-sm text-primary font-medium w-full">
          🔔 You will receive a notification on this app once your package is activated!
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="w-full py-3 px-6 rounded-2xl bg-muted text-foreground font-bold hover:bg-muted/80 transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pt-6 pb-20 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step === 'submit' ? setStep('qr') : navigate(-1)}
          className="p-2 rounded-xl hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-foreground">
            {step === 'qr' ? 'Pay via UPI' : 'Confirm Payment'}
          </h1>
          <p className="text-xs text-muted-foreground">{plan.name} — ₹{plan.price.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {['Scan & Pay', 'Submit UTR', 'Verified'].map((label, i) => {
          const currentIdx = step === 'qr' ? 0 : step === 'submit' ? 1 : 2;
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs font-semibold hidden sm:block ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded transition-all ${done ? 'bg-emerald-500' : 'bg-muted'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: QR Code */}
      {step === 'qr' && (
        <div className="space-y-4">
          {/* Plan Summary */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-orange-500/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Amount to Pay</p>
                <p className="text-3xl font-black text-foreground flex items-center gap-1">
                  <IndianRupee className="w-6 h-6" />{plan.price.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{plan.name}</p>
              </div>
              <Shield className="w-12 h-12 text-primary/30" />
            </div>
          </div>

          {/* QR Code */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 flex flex-col items-center gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <QrCode className="w-4 h-4" />
              Scan with any UPI app to pay
            </div>

            <div className="relative">
              <div className="w-64 h-64 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-lg shadow-primary/10 bg-white flex items-center justify-center">
                {/* Real QR image — always in DOM; shown when loaded */}
                <img
                  ref={qrImgRef}
                  src="/upi-qr.jpg"
                  alt="UPI QR Code"
                  style={{ display: qrLoaded && !qrError ? 'block' : 'none' }}
                  className="w-full h-full object-contain"
                  onLoad={() => setQrLoaded(true)}
                  onError={() => setQrError(true)}
                />
                {/* Fallback — shown while loading or on error */}
                {(!qrLoaded || qrError) && (
                  <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <QrCode className="w-20 h-20 text-gray-300" />
                    <p className="text-xs text-gray-400 font-medium">
                      {qrError ? 'Could not load QR image' : 'Loading QR code...'}
                    </p>
                    {qrError && (
                      <p className="text-[10px] text-gray-400">Use the UPI ID below to pay manually</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* UPI Deep Link — opens UPI app directly */}
            <button
              onClick={openUpiApp}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500/25 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              Open UPI App Directly (PhonePe / GPay / Paytm)
            </button>

            {/* UPI ID */}
            <div className="w-full p-3 rounded-2xl bg-muted/50 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">UPI ID</p>
                <p className="text-sm font-black text-foreground font-mono">{UPI_ID}</p>
              </div>
              <button
                onClick={copyUpiId}
                className={`p-2 rounded-xl transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-background text-muted-foreground hover:text-foreground hover:bg-background/80'}`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* UPI Apps */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {['PhonePe', 'Google Pay', 'Paytm', 'BHIM'].map((app) => (
                <span key={app} className="px-3 py-1 rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground border border-border/40">
                  {app}
                </span>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 space-y-2">
            <p className="text-xs font-bold text-foreground">How to pay:</p>
            {[
              'Open PhonePe / Google Pay / Paytm',
              `Send ₹${plan.price.toLocaleString('en-IN')} to UPI ID: ${UPI_ID}`,
              'Note the UTR / transaction reference number',
              'Come back here and click "I have paid"',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-xs text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep('submit')}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-primary to-orange-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            I have paid — Next <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Submit UTR */}
      {step === 'submit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-card border border-border/60">
            <p className="text-xs font-bold text-muted-foreground mb-1">Paying for</p>
            <p className="text-base font-black text-foreground">{plan.name}</p>
            <p className="text-sm text-primary font-bold">₹{plan.price.toLocaleString('en-IN')}</p>
          </div>

          {/* UTR Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              UTR / Transaction Reference Number *
            </label>
            <input
              type="text"
              value={utr}
              onChange={(e) => { setUtr(e.target.value); setError(''); }}
              placeholder="e.g. 427612345678 or T2408221234567"
              className="w-full px-4 py-3 rounded-2xl border border-border/60 bg-background text-sm font-mono font-medium focus:ring-2 focus:ring-primary focus:outline-none"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Find the UTR in your UPI app under payment history / transaction details
            </p>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Payment Screenshot (Recommended)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {screenshotPreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-muted">
                <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-48 object-cover" />
                <button
                  onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="p-2 flex items-center gap-2">
                  <FileImage className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">{screenshotFile?.name}</span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-muted-foreground hover:text-primary"
              >
                <Camera className="w-8 h-8" />
                <span className="text-sm font-semibold">Tap to upload screenshot</span>
                <span className="text-xs">JPG, PNG up to 5MB</span>
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2">
            <Shield className="w-4 h-4 shrink-0 mt-0.5" />
            <p>Your payment details are verified by our admin team. Package activation happens within 5 minutes of approval.</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !utr.trim()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploading ? 'Uploading screenshot...' : 'Submitting...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Payment Details
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
