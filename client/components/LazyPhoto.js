import { useState, useEffect, useRef } from 'react';

// Only requests the photo once it's close to the viewport. Each Google photo
// counts against the Places API quota, so off-screen cards shouldn't load one.
// (The browser's built-in loading="lazy" starts ~1,250px+ early, which would
// still fetch most of a 20-card grid.)
const ROOT_MARGIN = '200px';

export default function LazyPhoto({ src, alt, onError, className = '' }) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={ref} className={`lazy-photo ${className}`}>
      {inView && (
        <img
          src={src}
          alt={alt}
          decoding="async"
          className={loaded ? 'loaded' : ''}
          onLoad={() => setLoaded(true)}
          onError={onError}
        />
      )}
    </span>
  );
}
