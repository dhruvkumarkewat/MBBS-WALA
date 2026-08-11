import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';

interface Blog {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  published_at: string;
}

export default function BlogPost() {
  const { slug } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/blogs?slug=${encodeURIComponent(slug)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Not found');
        setBlog(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="h-64 bg-grey-bg-light animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Post not found</h1>
        <Link to="/blogs" className="zn-cta inline-flex">
          Back to blogs
        </Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-8 py-12 md:py-16">
      <Link
        to="/blogs"
        className="inline-flex items-center gap-2 font-semibold mb-8 hover:underline"
      >
        <ArrowLeft className="w-4 h-4" /> All posts
      </Link>
      <span className="text-xs font-bold uppercase tracking-wide bg-blue-bg px-2 py-1 rounded border border-black/10">
        {blog.category}
      </span>
      <h1 className="text-3xl md:text-5xl font-bold mt-4 mb-4 leading-tight">
        {blog.title}
      </h1>
      <p className="flex items-center gap-1.5 text-sm font-semibold text-text-grey mb-8">
        <Calendar className="w-4 h-4" />
        {new Date(blog.published_at).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <div className="prose prose-lg max-w-none font-medium leading-relaxed space-y-4">
        {blog.content.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}
