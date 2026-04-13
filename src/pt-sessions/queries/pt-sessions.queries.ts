export const PtSessionQueries = {
  FIND_ALL_COUNT: (whereSQL: string) => `
    SELECT COUNT(*) as total 
    FROM pt_sessions ps 
    WHERE ${whereSQL}
  `,

  FIND_ALL: (whereSQL: string, limit: number, offset: number) => `
    SELECT 
      ps.*, 
      m.name as member_name, 
      u.name as trainer_name
    FROM pt_sessions ps
    JOIN members m ON ps.member_id = m.id
    JOIN trainers t ON ps.trainer_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE ${whereSQL}
    ORDER BY ps.session_date DESC, ps.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `,

  FIND_ONE: `
    SELECT ps.*, m.name as member_name, u.name as trainer_name
    FROM pt_sessions ps
    JOIN members m ON ps.member_id = m.id
    JOIN trainers t ON ps.trainer_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE ps.id = ? AND ps.deleted_at IS NULL
  `,

  LOCK_MEMBER: `
    SELECT * FROM members 
    WHERE id = ? AND deleted_at IS NULL 
    FOR UPDATE
  `,

  LOCK_SLOT: `
    SELECT * FROM trainer_time_slots 
    WHERE id = ? AND deleted_at IS NULL 
    FOR UPDATE
  `,

  LOCK_TRAINER: `
    SELECT * FROM trainers 
    WHERE id = ? AND status = 'ACTIVE' 
    FOR UPDATE
  `,

  DECREMENT_MEMBER_SESSION: `
    UPDATE members 
    SET remaining_pt_sessions = remaining_pt_sessions - 1
    WHERE id = ? AND remaining_pt_sessions > 0
  `,

  CHECK_SLOT_BOOKED: `
    UPDATE trainer_time_slots 
    SET status = ? 
    WHERE id = ? AND status = ?
  `,

  GENERATE_SESSION_CODE:
    `SELECT session_code 
       FROM pt_sessions 
       WHERE session_code LIKE ? 
       ORDER BY id DESC 
       LIMIT 1`,
       
  INSERT_SESSION: `
    INSERT INTO pt_sessions
    (session_code, member_id, trainer_id, slot_id,
     session_type, session_source, amount_charged,
     session_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  GET_SESSION_BY_ID: `
    SELECT * FROM pt_sessions WHERE id = ?
  `,

  CANCEL_SESSION: `
    UPDATE pt_sessions 
    SET status = ? 
    WHERE id = ?
  `,
    LOCK_CANCEL_STATUS:
   `SELECT * FROM pt_sessions 
       WHERE id = ? AND deleted_at IS NULL 
       FOR UPDATE`,

  FREE_SLOT: `
    UPDATE trainer_time_slots 
    SET status = ? 
    WHERE id = ?
  `,

  RESTORE_MEMBER_SESSION: `
    UPDATE members 
    SET remaining_pt_sessions = remaining_pt_sessions + 1 
    WHERE id = ?
  `,

  COMPLETE_SESSION: `
    UPDATE pt_sessions 
    SET status = ? 
    WHERE id = ?
  `,

  GET_SLOT_BY_ID: `
    SELECT * FROM trainer_time_slots 
    WHERE id = ? AND status = ?
  `,

  UPDATE_SESSION_SLOT: `
    UPDATE pt_sessions 
    SET slot_id = ?, session_date = ?
    WHERE id = ?
  `,
  UPDATE_PT_SESSION_STATUS:`
  UPDATE pt_sessions 
       SET status = ? 
       WHERE id = ?`,

  UPDATE_SESSION_NO_SHOW:`
   UPDATE pt_sessions 
       SET status = ? 
       WHERE id = ?`,
  UPDATE_TRAINER_TIME_SLOT:`
   UPDATE trainer_time_slots 
       SET status = ? 
       WHERE id = ? AND status = ?`,

  GET_MEMBER_SESSIONS: `
    SELECT ps.*, m.name as member_name, u.name as trainer_name
    FROM pt_sessions ps
    JOIN members m ON ps.member_id = m.id
    JOIN trainers t ON ps.trainer_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE ps.member_id = ? AND ps.deleted_at IS NULL
    ORDER BY ps.session_date DESC
  `,
};