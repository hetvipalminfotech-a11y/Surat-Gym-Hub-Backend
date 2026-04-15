export const CronQueries = {
  CHECK_EXPIRING_MEMBERSHIPS: `
    SELECT
      m.id, m.member_code, m.name, m.phone, m.end_date,
      DATEDIFF(m.end_date, CURDATE()) as days_remaining
    FROM members m
    WHERE m.status = 'ACTIVE'
      AND m.deleted_at IS NULL
      AND DATEDIFF(m.end_date, CURDATE()) BETWEEN 0 AND 7
    ORDER BY m.end_date ASC
  `,

  AUTO_EXPIRE_MEMBERSHIPS: `
    UPDATE members 
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE' 
      AND end_date < CURDATE() 
      AND deleted_at IS NULL
  `,

  DAILY_TOTAL_CHECKINS: `
    SELECT COUNT(*) as total 
    FROM attendance
    WHERE attendance_date = ? 
      AND deleted_at IS NULL
  `,

  DAILY_COMPLETED_SESSIONS: `
    SELECT COUNT(*) as total 
    FROM pt_sessions
    WHERE session_date = ? 
      AND status = 'COMPLETED'
      AND deleted_at IS NULL
  `,

  DAILY_PT_REVENUE: `
    SELECT COALESCE(SUM(amount_charged), 0) as total 
    FROM pt_sessions
    WHERE session_date = ? 
      AND status = 'COMPLETED'
      AND deleted_at IS NULL
  `,

  DAILY_MEMBERSHIP_REVENUE: `
    SELECT COALESCE(SUM(amount), 0) as total 
    FROM membership_transactions
    WHERE DATE(created_at) = ? 
      AND status = 'SUCCESS'
      AND deleted_at IS NULL
  `,
};
