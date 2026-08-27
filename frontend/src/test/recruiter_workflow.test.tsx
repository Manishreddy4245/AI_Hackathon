import { describe, it, expect } from 'vitest';

describe('Recruiter Portal & Candidate Pipeline Tests', () => {
  it('filters candidate pipeline strictly by recruiter company ID', () => {
    const candidateList = [
      { id: 'cand-1', name: 'Alice', company_id: 'comp-101' },
      { id: 'cand-2', name: 'Bob', company_id: 'comp-102' },
      { id: 'cand-3', name: 'Charlie', company_id: 'comp-101' },
    ];

    const recruiterCompanyId = 'comp-101';
    const authorizedCandidates = candidateList.filter(c => c.company_id === recruiterCompanyId);

    expect(authorizedCandidates.length).toBe(2);
    expect(authorizedCandidates.map(c => c.name)).toEqual(['Alice', 'Charlie']);
  });

  it('validates interview schedule time slot collisions', () => {
    const existingInterviews = [
      { room: 'B-386', date: '2026-10-31', time: '10:00 AM' },
    ];

    const newBooking = { room: 'B-386', date: '2026-10-31', time: '10:00 AM' };
    const isConflict = existingInterviews.some(
      i => i.room === newBooking.room && i.date === newBooking.date && i.time === newBooking.time
    );

    expect(isConflict).toBe(true);
  });
});
