export const FcmTokenQueries = {
  UPSERT_TOKEN: `
    UPDATE tokens 
    SET fcm_token = ?, device_platform = ?, device_id = ?
    WHERE user_id = ? AND status = 'ACTIVE'
    ORDER BY (device_id = ?) DESC, (device_id IS NULL) DESC, created_at DESC
    LIMIT 1
  `,
  REMOVE_TOKEN: `
    UPDATE tokens SET fcm_token = NULL WHERE fcm_token = ?
  `,
  GET_TOKENS_FOR_ROLES: `
    SELECT DISTINCT t.fcm_token 
    FROM tokens t
    INNER JOIN users u ON t.user_id = u.id
    WHERE u.role IN ('RECEPTIONIST', 'TRAINER') AND u.status = 'ACTIVE' AND t.status = 'ACTIVE' AND t.fcm_token IS NOT NULL
  `
};
export type FcmTokenRow = {
  fcm_token: string;
};
