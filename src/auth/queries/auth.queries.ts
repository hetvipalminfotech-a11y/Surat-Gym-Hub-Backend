export const AuthQueries = {

  FIND_USER_BY_EMAIL: 'SELECT * FROM users WHERE email = ?',

  CHECK_EMAIL_EXISTS: 'SELECT id FROM users WHERE email = ?',

  INSERT_USER: `
    INSERT INTO users (name, email, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?)
  `,

  RESET_LOGIN_ATTEMPTS: `
    UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?
  `,

  UPDATE_FAILED_ATTEMPTS: `
    UPDATE users SET failed_attempts = ? WHERE id = ?
  `,

  LOCK_USER: `
    UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?
  `,

  GET_USER_BY_ID: 'SELECT * FROM users WHERE id = ?',

  GET_TRAINER_ID_BY_USER_ID: `SELECT id AS trainer_id FROM trainers WHERE user_id = ? AND status = 'ACTIVE' LIMIT 1`,

  INSERT_TOKEN: `
    INSERT INTO tokens (access_token_hash, refresh_token_hash, expired_at, status, user_id)
    VALUES (?, ?, ?, ?, ?)
  `,

  FIND_ACTIVE_TOKENS: `
    SELECT * FROM tokens 
    WHERE user_id = ? AND status = ? AND expired_at > NOW()
  `,

  REVOKE_ALL_TOKENS: `
    UPDATE tokens SET status = ? WHERE user_id = ? AND status = ?
  `,
};
