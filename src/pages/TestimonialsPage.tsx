import Testimonials from '../components/Testimonials';

export default function TestimonialsPage() {
  return (
    <div className="px-4 sm:px-8 py-12 md:py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary-dark mb-3">Testimonial wall</h1>
        <p className="text-text-grey font-medium text-lg">
          Don&apos;t take our word for it — hear from students and families guided by MBBSWala.
        </p>
      </div>
      <div className="max-w-6xl mx-auto">
        <Testimonials full />
      </div>
    </div>
  );
}
