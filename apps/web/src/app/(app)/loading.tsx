export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="skeleton mb-2 h-8 w-48" />
      <div className="skeleton mb-7 h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-56 w-full" />
        ))}
      </div>
    </div>
  );
}
