/**
 * Shared Pagination component.
 *
 * Props:
 *  page        – current page (1-indexed)
 *  totalPages  – total number of pages
 *  onPageChange – (newPage: number) => void
 *  variant     – 'admin' | 'user'  (styling context)
 */
const Pagination = ({ page, totalPages, onPageChange, variant = 'user' }) => {
  if (!totalPages || totalPages <= 1) return null;

  /* Build the visible page list with ellipsis */
  const buildPages = () => {
    const pages = [];
    const WINDOW = 2; // pages shown each side of current

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    const leftEdge  = Math.max(2, page - WINDOW);
    const rightEdge = Math.min(totalPages - 1, page + WINDOW);

    if (leftEdge > 2) pages.push('...');
    for (let i = leftEdge; i <= rightEdge; i++) pages.push(i);
    if (rightEdge < totalPages - 1) pages.push('...');

    pages.push(totalPages);
    return pages;
  };

  const pages = buildPages();

  /* ── Admin variant ─────────────────────────────────────────────── */
  if (variant === 'admin') {
    return (
      <div className="admin-pagination">
        <button
          className="admin-btn admin-btn-ghost"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          ‹ Prev
        </button>

        {pages.map((p, idx) =>
          p === '...'
            ? <span key={`e${idx}`} className="admin-pagination-ellipsis">…</span>
            : (
              <button
                key={p}
                className={`admin-btn admin-btn-ghost${page === p ? ' active' : ''}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
        )}

        <button
          className="admin-btn admin-btn-ghost"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next ›
        </button>
      </div>
    );
  }

  /* ── User / Menu variant ───────────────────────────────────────── */
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 6, padding: '20px 16px 8px', flexWrap: 'wrap',
    }}>
      {/* Prev */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        style={btnStyle(false, page === 1)}
      >
        ‹
      </button>

      {pages.map((p, idx) =>
        p === '...'
          ? <span key={`e${idx}`} style={{ fontSize: 13, color: '#aaa', padding: '0 2px' }}>…</span>
          : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={btnStyle(page === p, false)}
            >
              {p}
            </button>
          )
      )}

      {/* Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        style={btnStyle(false, page === totalPages)}
      >
        ›
      </button>
    </div>
  );
};

const btnStyle = (active, disabled) => ({
  minWidth: 36, height: 36,
  padding: '0 10px',
  borderRadius: 10,
  border: `1.5px solid ${active ? '#E53935' : '#EBEBEB'}`,
  background: active ? '#E53935' : disabled ? '#F5F5F5' : 'white',
  color: active ? 'white' : disabled ? '#ccc' : '#333',
  fontSize: 13, fontWeight: active ? 800 : 600,
  cursor: disabled || active ? 'default' : 'pointer',
  transition: 'all 0.15s',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  pointerEvents: active || disabled ? 'none' : 'auto',
});

export default Pagination;
