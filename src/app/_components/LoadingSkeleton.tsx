'use client';

export function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-8">
        <div className="h-20 glass rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 glass rounded-xl" />
          ))}
        </div>
        <div className="h-40 glass rounded-xl" />
      </div>
    </div>
  );
}
