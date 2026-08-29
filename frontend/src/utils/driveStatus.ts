/**
 * Authoritative single source of truth for Placement Drive statuses across frontend.
 * Guarantees 100% case-insensitive alignment with FastAPI backend routes.
 */

export const isDrivePendingApproval = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toUpperCase();
  return (
    s === 'PENDING_ANNOUNCEMENT' ||
    s === 'PENDING_APPROVAL' ||
    s === 'PENDING' ||
    s === 'CHANGES_PENDING_REVIEW' ||
    s === 'SUBMITTED_TO_OFFICER'
  );
};

export const isDriveActiveOrAnnounced = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === 'ANNOUNCED' || s === 'ACTIVE' || s === 'OPEN' || s === 'SHORTLISTING' || s === 'INTERVIEW' || s === 'APPROVED';
};


export const isDriveChangesRequested = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === 'CHANGES_REQUESTED' || s === 'REVISION_NEEDED';
};

export const isDriveRejected = (status?: string): boolean => {
  if (!status) return false;
  const s = status.toUpperCase();
  return s === 'REJECTED';
};
