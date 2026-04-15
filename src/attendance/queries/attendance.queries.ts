export const AttendanceQueries = {
  CHECK_MEMBER: `
    SELECT id, status, name FROM members WHERE id = ? AND deleted_at IS NULL
  `,

  INSERT_ATTENDANCE: `
    INSERT INTO attendance (member_id, check_in_time, attendance_date)
    VALUES (?, ?, ?)
  `,

  GET_ATTENDANCE_BY_ID: `
    SELECT a.*, m.name as member_name
    FROM attendance a
    JOIN members m ON a.member_id = m.id
    WHERE a.id = ?
  `,

  CHECK_MEMBER_EXISTS: `
    SELECT id FROM members WHERE id = ?
  `,

  CHECK_OUT_UPDATE: `
    UPDATE attendance SET check_out_time = ?
    WHERE member_id = ? AND attendance_date = ? AND check_out_time IS NULL
  `,

  GET_BY_DATE: `
    SELECT a.*, m.name as member_name
    FROM attendance a
    JOIN members m ON a.member_id = m.id
    WHERE a.attendance_date = ? AND a.deleted_at IS NULL
    ORDER BY a.check_in_time DESC
  `,

  GET_BY_MEMBER: (whereSQL: string) => `
    SELECT * FROM attendance 
    WHERE ${whereSQL} 
    ORDER BY attendance_date DESC
  `,
};
