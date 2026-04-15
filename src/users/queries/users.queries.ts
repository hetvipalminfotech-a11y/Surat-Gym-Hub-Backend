export const UserQueries = {
  FIND_ALL_COUNT: (whereSQL: string) => `
    SELECT COUNT(*) as total FROM users WHERE ${whereSQL}
  `,

  FIND_ALL: (whereSQL: string, limit: number, offset: number) => `
    SELECT id, name, email, role, status, created_at, updated_at, deleted_at
    FROM users
    WHERE ${whereSQL}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `,

  FIND_ONE: `
    SELECT id, name, email, role, status, created_at, updated_at, deleted_at
    FROM users
    WHERE id = ? AND deleted_at IS NULL
  `,

  FIND_BY_ID_INTERNAL: `
    SELECT * FROM users WHERE id = ? AND deleted_at IS NULL
  `,

  UPDATE_DYNAMIC: (setSQL: string) => `
    UPDATE users SET ${setSQL} WHERE id = ?
  `,

  SOFT_DELETE: `
    UPDATE users SET deleted_at = NOW(), status = 'INACTIVE' WHERE id = ?
  `,

  UPDATE_PASSWORD: `
    UPDATE users SET password_hash = ? WHERE id = ?
  `,

  CHECK_EMAIL_EXISTS: `
    SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL
  `,
};
