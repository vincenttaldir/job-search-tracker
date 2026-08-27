import { Badge } from 'evergreen-ui';

/**
 * SINGLE SOURCE OF TRUTH for application statuses.
 * Each status has a STABLE numeric `code` (the rename-safe key used by the kanban / filters /
 * matching) and a display `label`. Renaming a label here never breaks the logic, because the
 * kanban and the API match on `code` (see `app.status_code`), not on the label text.
 */
export const STATUSES = [
  { code: 1, label: 'À postuler', badge: 'blue', color: '#5B8DEE' },
  { code: 2, label: 'Postulé', badge: 'purple', color: '#9F7AEA' },
  { code: 3, label: 'Entretien', badge: 'orange', color: '#FB923C' },
  { code: 4, label: 'Offre', badge: 'green', color: '#34D399' },
  { code: 5, label: 'Refus', badge: 'red', color: '#EF4444' },
  { code: 6, label: 'Archivé', badge: 'neutral', color: '#94A3B8' },
  { code: 0, label: 'Inconnu', badge: 'neutral', color: '#6B7280' },
];

const BY_CODE = Object.fromEntries(STATUSES.map((s) => [s.code, s]));
const BY_LABEL = Object.fromEntries(STATUSES.map((s) => [s.label, s]));
// Legacy/accent-less alias → canonical label.
const ALIASES = { 'A postuler': 'À postuler', 'En attente': 'Postulé', Brouillon: 'À postuler' };

/** Resolve any status reference (code, label, accent-less variant, or an app object) to a STATUSES entry. */
export function resolveStatus(ref) {
  if (ref == null) return BY_CODE[0];
  if (typeof ref === 'object') {
    if (ref.status_code != null && BY_CODE[ref.status_code]) return BY_CODE[ref.status_code];
    ref = ref.status;
  }
  if (typeof ref === 'number') return BY_CODE[ref] || BY_CODE[0];
  const label = ALIASES[ref] || ref;
  return BY_LABEL[label] || BY_CODE[0];
}

export function statusCode(ref) {
  return resolveStatus(ref).code;
}

export function StatusPill({ status }) {
  const s = resolveStatus(status);
  return <Badge color={s.badge}>{s.label}</Badge>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getStatusColor(status) {
  return resolveStatus(status).color;
}

/** Labels for dropdown/filter selects (canonical order). */
// eslint-disable-next-line react-refresh/only-export-components
export function getAllStatuses() {
  return STATUSES.map((s) => s.label);
}

// eslint-disable-next-line react-refresh/only-export-components
export function getStatusLabel(status) {
  return resolveStatus(status).label;
}
