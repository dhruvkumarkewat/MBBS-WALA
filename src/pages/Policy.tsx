import { Link, useLocation } from 'react-router-dom';

const policies: Record<
  string,
  { title: string; sections: { h: string; p: string }[] }
> = {
  'privacy-policy': {
    title: 'Privacy Policy',
    sections: [
      {
        h: 'What we collect',
        p: 'We collect the details you share with us — like name, phone, email and counselling preferences — so we can help you better.',
      },
      {
        h: 'How we use it',
        p: 'We use this information for counselling support, updates and to improve our service. We do not sell your personal data.',
      },
      {
        h: 'Contact',
        p: 'For privacy questions email info@mbbswala.in or call +91 78801 19983.',
      },
    ],
  },
  'package-policy': {
    title: 'Package Policy',
    sections: [
      {
        h: 'How long access lasts',
        p: 'Paid packages cover the counselling period mentioned at the time of purchase.',
      },
      {
        h: 'Refunds',
        p: 'Refunds depend on how much you have used the service and when you ask. Contact support within the stated window.',
      },
    ],
  },
  'fair-use-policy': {
    title: 'Fair Use Policy',
    sections: [
      {
        h: 'How to use our tools',
        p: 'MBBSWala tools are for your personal counselling use. Copying data in bulk, reselling it, or sharing one account is not allowed.',
      },
    ],
  },
  'terms-and-conditions': {
    title: 'Terms & Conditions',
    sections: [
      {
        h: 'Our service',
        p: 'MBBSWala gives counselling data and guidance. Final admission decisions are made by official counselling authorities.',
      },
      {
        h: 'About estimates',
        p: 'We try to keep data correct, but rank and college estimates are only a guide. Official results can differ.',
      },
    ],
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    sections: [
      {
        h: 'Cookies we use',
        p: 'We use basic cookies to keep you logged in and simple analytics cookies to understand how the site is used.',
      },
    ],
  },
  'influencer-program': {
    title: 'Partner Program',
    sections: [
      {
        h: 'Work with us',
        p: 'Teachers and creators can partner with MBBSWala to help more students find the right counselling support.',
      },
      {
        h: 'How to apply',
        p: 'Email info@mbbswala.in with your audience details and social links.',
      },
    ],
  },
};

export default function Policy() {
  const location = useLocation();
  const path = location.pathname.replace(/^\//, '');
  const doc = policies[path];

  if (!doc) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Page not found</h1>
        <Link to="/" className="zn-cta inline-flex">Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-12 md:py-16">
      <h1 className="font-display text-4xl font-bold text-primary-dark mb-8">{doc.title}</h1>
      <div className="space-y-8">
        {doc.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-extrabold text-primary-dark mb-2">{s.h}</h2>
            <p className="text-text-grey font-medium leading-relaxed">{s.p}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
