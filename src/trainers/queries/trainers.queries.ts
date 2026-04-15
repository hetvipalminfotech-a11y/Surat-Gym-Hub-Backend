export const TrainerQueries = {
  FIND_ALL: `
    SELECT t.*, u.name, u.email
    FROM trainers t
    JOIN users u ON t.user_id = u.id
    WHERE t.deleted_at IS NULL
    ORDER BY u.name ASC
  `,

  FIND_ONE: `
    SELECT t.*, u.name, u.email
    FROM trainers t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `,

  CHECK_EMAIL_EXISTS: `
    SELECT id FROM users 
    WHERE email = ? AND deleted_at IS NULL
  `,

  CREATE_USER: `
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?)
  `,

  CREATE_TRAINER: `
    INSERT INTO trainers 
    (user_id, specialization, session_rate, commission_rate, shift_start, shift_end, status)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
  `,

  GET_TRAINER_BY_ID: `
    SELECT t.*, u.name, u.email
    FROM trainers t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `,

  UPDATE_DYNAMIC: (setSQL: string) => `
    UPDATE trainers SET ${setSQL} WHERE id = ?
  `,

  DELETE_TRAINER: `
    UPDATE trainers SET deleted_at = NOW(), status = 'INACTIVE' WHERE id = ?
  `,

  DELETE_TRAINER_SLOTS: `
    UPDATE trainer_time_slots SET deleted_at = NOW() WHERE trainer_id = ? AND deleted_at IS NULL
  `,

  DELETE_TRAINER_SESSIONS: `
    UPDATE pt_sessions SET deleted_at = NOW() WHERE trainer_id = ? AND deleted_at IS NULL
  `,

  DELETE_ASSOCIATED_USER: `
    UPDATE users SET deleted_at = NOW(), status = 'INACTIVE'
    WHERE id = (SELECT user_id FROM trainers WHERE id = ?) 
    AND deleted_at IS NULL
  `,

  GET_SLOTS_BASE: `
    SELECT * FROM trainer_time_slots 
    WHERE trainer_id = ? AND deleted_at IS NULL
  `,

  GET_SLOTS_BY_DATE: `
    AND slot_date = ?
  `,

  GET_SLOTS_ORDER: `
    ORDER BY slot_date ASC, start_time ASC
  `,

  SLOT_OVERLAP_CHECK: `
    SELECT id FROM trainer_time_slots
    WHERE trainer_id = ?
    AND slot_date = ?
    AND deleted_at IS NULL
    AND start_time < ?
    AND end_time > ?
  `,

  INSERT_SLOT: `
    INSERT INTO trainer_time_slots 
    (trainer_id, slot_date, start_time, end_time, status)
    VALUES (?, ?, ?, ?, 'AVAILABLE')
  `,

  GET_SLOT_BY_ID: `
    SELECT * FROM trainer_time_slots WHERE id = ?
  `,

  BULK_SLOT_OVERLAP_CHECK: `
    SELECT id FROM trainer_time_slots
    WHERE trainer_id = ?
    AND slot_date = ?
    AND deleted_at IS NULL
    AND start_time < ?
    AND end_time > ?
  `,

  BULK_INSERT_SLOT: `
    INSERT INTO trainer_time_slots
    (trainer_id, slot_date, start_time, end_time, status)
    VALUES (?, ?, ?, ?, 'AVAILABLE')
  `,
};
