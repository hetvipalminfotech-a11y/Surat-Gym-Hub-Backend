export const MemberQueries = {
  FIND_ALL_COUNT: (whereSQL: string) => `
    SELECT COUNT(*) as total FROM members m WHERE ${whereSQL}
  `,

  FIND_ALL_DATA: (whereSQL: string, limit: number, offset: number) => `
  SELECT m.*, mp.name as plan_name
  FROM members m
  LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
  WHERE ${whereSQL}
  ORDER BY m.created_at DESC
  LIMIT ${limit} OFFSET ${offset}
`,

  FIND_ONE: `
    SELECT m.*, mp.name as plan_name
    FROM members m
    LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
    WHERE m.id = ? AND m.deleted_at IS NULL
  `,

  FIND_MEMBER_CODE: `
    SELECT member_code FROM members 
    WHERE member_code LIKE ? 
    ORDER BY id DESC LIMIT 1
  `,

  INSERT_MEMBER: `
    INSERT INTO members
    (member_code,name,phone,email,age,gender,health_conditions,
    emergency_contact_phone,membership_plan_id,start_date,end_date,
    status,remaining_pt_sessions,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `,

  INSERT_TRANSACTION_NEW: `
    INSERT INTO membership_transactions
    (member_id,plan_id,amount,payment_method,transaction_type,start_date,end_date,status,created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `,

  GET_MEMBER_WITH_PLAN: `
    SELECT m.*, mp.name as plan_name
    FROM members m
    LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
    WHERE m.id = ?
  `,

  UPDATE_MEMBER_DYNAMIC: (setSQL: string) => `
    UPDATE members SET ${setSQL} WHERE id=? AND deleted_at IS NULL
  `,

  CANCEL_MEMBER: `
    UPDATE members SET status = 'CANCELLED' WHERE id = ?
  `,

  INSERT_STATUS_HISTORY_CANCEL: `
    INSERT INTO member_status_history
    (member_id, old_status, new_status, created_by)
    VALUES (?, ?, ?, ?)
  `,

  DELETE_MEMBER: `
    UPDATE members SET deleted_at=NOW() WHERE id=?
  `,

  RENEW_GET_PLAN: `
    SELECT * FROM membership_plans WHERE id = ? AND deleted_at IS NULL
  `,

  RENEW_UPDATE_MEMBER: `
    UPDATE members
    SET membership_plan_id = ?, start_date = ?, end_date = ?,
        status = 'ACTIVE',
        remaining_pt_sessions = ?
    WHERE id = ?
  `,

  RENEW_TRANSACTION: `
    INSERT INTO membership_transactions
    (member_id, plan_id, amount, payment_method, transaction_type,
     start_date, end_date, status, created_by)
    VALUES (?, ?, ?, ?, 'RENEW', ?, ?, 'SUCCESS', ?)
  `,

  GET_PLAN_DETAIL: `
  SELECT * FROM membership_plans WHERE id = ? AND status = ?`,

  RETURN_MEMBER: `
  SELECT * FROM members WHERE id = ?
  `,

  RENEW_STATUS_HISTORY: `
    INSERT INTO member_status_history
    (member_id, old_status, new_status, created_by)
    VALUES (?, ?, ?, ?)
  `,

  RETURN_UPDATE_MEMBER: `SELECT m.*, mp.name as plan_name
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE m.id = ?`,

  UPDATE_MEMBER_STATUS: `
    UPDATE members SET status = 'FROZEN' WHERE id = ?`,

  FREEZE_HISTORY_INSERT: `
    INSERT INTO member_freeze_history
    (member_id, freeze_start_date, created_by)
    VALUES (?, ?, ?)
  `,

  FREEZE_STATUS_HISTORY: `
    INSERT INTO member_status_history
    (member_id, old_status, new_status, created_by)
    VALUES (?, ?, ?, ?)
  `,

  UNFREEZE_GET_LATEST: `
    SELECT * FROM member_freeze_history
    WHERE member_id = ? AND freeze_end_date IS NULL
    ORDER BY id DESC LIMIT 1
  `,

  UNFREEZE_UPDATE_MEMBER: `
    UPDATE members 
    SET status = 'ACTIVE', end_date = ?
    WHERE id = ?
  `,

  UNFREEZE_UPDATE_FREEZE: `
    UPDATE member_freeze_history
    SET freeze_end_date = ?, total_days = ?
    WHERE id = ?
  `,

  UNFREEZE_STATUS_HISTORY: `
    INSERT INTO member_status_history
    (member_id, old_status, new_status, created_by)
    VALUES (?, ?, ?, ?)
  `,

  CHANGE_PLAN_GET_PLAN: `
    SELECT * FROM membership_plans WHERE id = ? AND deleted_at IS NULL
  `,

  CHANGE_PLAN_UPDATE_MEMBER: `
    UPDATE members 
    SET membership_plan_id = ?, 
        start_date = ?, 
        end_date = ?, 
        remaining_pt_sessions = ?
    WHERE id = ?
  `,

  CHANGE_PLAN_TRANSACTION: `
    INSERT INTO membership_transactions
    (member_id, plan_id, amount, payment_method, transaction_type, start_date, end_date, status, created_by)
    VALUES (?, ?, ?, ?, 'UPGRADE', ?, ?, 'SUCCESS', ?)
  `,

  CHANGE_PLAN_STATUS_HISTORY: `
    INSERT INTO member_status_history
    (member_id, old_status, new_status, old_plan_id, new_plan_id, note, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,

  CHANGE_PLAN_AFTER_UPDATE_MEMBER: `
  SELECT m.*, mp.name as plan_name
       FROM members m
       LEFT JOIN membership_plans mp ON m.membership_plan_id = mp.id
       WHERE m.id = ?`
};
