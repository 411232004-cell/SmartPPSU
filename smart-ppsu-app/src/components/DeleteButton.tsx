"use client";

// Trash bin animation (desain Delete-post-Button)
export default function DeleteButton({
  onClick,
  title = "Hapus",
}: {
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="bin-btn"
      onClick={onClick}
      aria-label={title}
      title={title}
    >
      <div className="bin">
        <div className="lid" />
        <div className="box">
          <div className="box-inner">
            <div className="lines" />
          </div>
        </div>
      </div>
    </button>
  );
}
