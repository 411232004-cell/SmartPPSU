// Loading page premium — bars animation + teks
export default function LoadingScreen({
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
