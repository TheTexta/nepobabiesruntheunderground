export default function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

if (typeof module !== 'undefined') module.exports = formatDate;
