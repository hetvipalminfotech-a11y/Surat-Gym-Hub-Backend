// membership-plans.queries.ts

export const MembershipPlanQueries = {
  FIND_ALL: `
    SELECT * FROM membership_plans 
    WHERE deleted_at IS NULL
  `,

  FIND_ONE: `
    SELECT * FROM membership_plans 
    WHERE id = ? AND deleted_at IS NULL
  `,

  FIND_BY_NAME: `
    SELECT id FROM membership_plans 
    WHERE name = ? AND deleted_at IS NULL
  `,

  FIND_BY_NAME_EXCLUDE_ID: `
    SELECT id FROM membership_plans 
    WHERE name = ? AND id != ? AND deleted_at IS NULL
  `,

  INSERT: `
    INSERT INTO membership_plans 
    (name, duration_months, price, pt_sessions, access_hours, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `,

  UPDATE_BASE: `
    UPDATE membership_plans 
    SET %FIELDS%, updated_at = NOW()
    WHERE id = ? AND deleted_at IS NULL
  `,

  SOFT_DELETE: `
    UPDATE membership_plANS 
    SET deleted_at = NOW(), status = 'INACTIVE'
    WHERE id = ? 
  `,

  CHECK_USED: `
    SELECT id FROM members 
    WHERE membership_plan_id = ? AND deleted_at IS NULL AND status IN ('ACTIVE', 'FROZEN') LIMIT 1
  `,

  FIND_WITH_DELETED: `
    SELECT * FROM membership_plans WHERE id = ?
  `,

  RESTORE: `
    UPDATE membership_plans 
    SET deleted_at = NULL, status = 'ACTIVE'
    WHERE id = ?
  `,
};