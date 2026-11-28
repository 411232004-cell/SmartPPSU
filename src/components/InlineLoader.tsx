// Loading inline — bars animation + teks, dipakai di dalam halaman
export default function InlineLoader({
  label = "Loading",
}: {
  label?: string;
}) {
  return (
    <div className="premium-loader" role="status" aria-label={label}>
      <div>
        <ul>
          <li />
          <li />
          <li />
          <li />
          <li />
          <li />
        </ul>
      </div>
      <span>{label}</span>
    </div>
  );
}
