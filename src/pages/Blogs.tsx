import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  published_at: string;
}

export default function Blogs() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blogs')
      .then((r) => r.json())
      .then((d) => setBlogs(Array.isArray(d) ? d : []))
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 sm:px-8 py-12 md:py-16 max-w-5xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-3">Blogs & News</h1>
        <p className="text-text-grey font-medium">
          Counselling guides, seat matrix updates, and expert tips.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-grey-bg-light animate-pulse rounded-xl" />
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <p className="text-center text-text-grey">No posts yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {blogs.map((b) => (
            <Link
              key={b.id}
              to={`/blogs/${b.slug}`}
              className="zn-card p-6 flex flex-col gap-3"
            >
              <span className="text-xs font-bold uppercase tracking-wide bg-blue-bg px-2 py-1 rounded w-fit border border-black/10">
                {b.category}
              </span>
              <h2 className="text-xl font-extrabold leading-snug">{b.title}</h2>
              <p className="text-sm text-text-grey font-medium flex-1">{b.excerpt}</p>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-text-grey">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(b.published_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
