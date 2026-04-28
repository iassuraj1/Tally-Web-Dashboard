import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: 2000000, label: 'Businesses Trust Tally', suffix: '+', prefix: '' },
  { value: 150,     label: 'Countries Worldwide',   suffix: '+', prefix: '' },
  { value: 40,      label: 'Years of Excellence',   suffix: '+', prefix: '' },
  { value: 10000,   label: 'Partner Network',        suffix: '+', prefix: '' },
];

function useCountUp(end, duration = 2000, started = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!started) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [end, duration, started]);
  return count;
}

function StatItem({ value, label, suffix, prefix }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const count = useCountUp(value, 2000, visible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const display = count >= 1000000
    ? `${(count / 1000000).toFixed(1)}M`
    : count >= 1000
    ? `${(count / 1000).toFixed(0)}K`
    : count;

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-extrabold text-white mb-2">
        {prefix}{display}{suffix}
      </div>
      <div className="text-blue-200 text-sm font-medium uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function Stats() {
  return (
    <section className="py-16 bg-gradient-to-r from-[#003087] to-[#0051cc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
