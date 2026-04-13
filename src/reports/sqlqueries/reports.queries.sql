



-- name: getDailySummary
SELECT 
  a.total_checkins,
  ps.total_pt_sessions,
  mt.new_memberships,
  mt.renewals,
  mt.membership_revenue,
  ps.pt_revenue,

  (mt.membership_revenue + ps.pt_revenue) AS total_revenue,

  a.peak_hour

FROM

/* =========================
   ATTENDANCE SUMMARY
========================= */
(
  SELECT 
    COUNT(*) AS total_checkins,

    (
      SELECT HOUR(check_in_time)
      FROM attendance
      WHERE attendance_date = ?
        AND deleted_at IS NULL
      GROUP BY HOUR(check_in_time)
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ) AS peak_hour

  FROM attendance
  WHERE attendance_date = ?
    AND deleted_at IS NULL
) a


/* =========================
   PT SESSIONS SUMMARY
========================= */
CROSS JOIN (
  SELECT 
    COUNT(*) AS total_pt_sessions,

    IFNULL(
      SUM(
        CASE 
          WHEN session_source = 'PAID' THEN amount_charged 
          ELSE 0 
        END
      ), 0
    ) AS pt_revenue

  FROM pt_sessions
  WHERE session_date = ?
    AND status = 'COMPLETED'
    AND deleted_at IS NULL
) ps


/* =========================
   MEMBERSHIP SUMMARY
========================= */
CROSS JOIN (
  SELECT 
    COUNT(CASE WHEN transaction_type = 'NEW' THEN 1 END) AS new_memberships,
    COUNT(CASE WHEN transaction_type = 'RENEW' THEN 1 END) AS renewals,
    IFNULL(SUM(amount), 0) AS membership_revenue

  FROM membership_transactions
  WHERE DATE(created_at) = ?
    AND status = 'SUCCESS'
    AND deleted_at IS NULL
) mt;
    
    
-- name: getMembershipExpiryReport
SELECT 
  m.member_code,
  m.name,
  m.phone,
  mp.name AS plan_name,
  m.start_date,
  m.end_date,

  DATEDIFF(m.end_date, CURDATE()) AS days_remaining,

  m.remaining_pt_sessions,

  CASE 
    WHEN DATEDIFF(m.end_date, CURDATE()) < 0 THEN 'EXPIRED'
    WHEN DATEDIFF(m.end_date, CURDATE()) BETWEEN 0 AND 7 THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END AS expiry_status

FROM members m
JOIN membership_plans mp ON m.membership_plan_id = mp.id

ORDER BY m.end_date ASC;

-- name: getTrainerUtilisationReport
SELECT 
  t.id,
  u.name AS trainer_name,
  t.specialization,


  IFNULL(ps.completed_sessions, 0) AS total_sessions_this_month,


  IFNULL(tts.available_slots, 0) AS available_slots,
  IFNULL(tts.booked_slots, 0) AS booked_slots,

 
  ROUND(
    (IFNULL(tts.booked_slots, 0) / NULLIF(tts.total_slots, 0)) * 100,
    2
  ) AS utilisation_rate,


  IFNULL(ps.no_show_count, 0) AS no_show_count,


  IFNULL(ps.revenue, 0) AS revenue,


  ROUND(
    IFNULL(ps.revenue, 0) * t.commission_rate / 100,
    2
  ) AS commission_earned

FROM trainers t
JOIN users u ON t.user_id = u.id


LEFT JOIN (
  SELECT 
    trainer_id,
    COUNT(*) AS total_slots,
    SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_slots,
    SUM(CASE WHEN status = 'BOOKED' THEN 1 ELSE 0 END) AS booked_slots
  FROM trainer_time_slots
  GROUP BY trainer_id
) tts ON t.id = tts.trainer_id


LEFT JOIN (
  SELECT 
    trainer_id,

    
    SUM(CASE 
          WHEN status = 'COMPLETED'
           AND MONTH(session_date) = MONTH(CURDATE())
           AND YEAR(session_date) = YEAR(CURDATE())
          THEN 1 ELSE 0 
        END) AS completed_sessions,


    SUM(CASE 
          WHEN status = 'NO_SHOW'
          THEN 1 ELSE 0 
        END) AS no_show_count,


    SUM(CASE 
          WHEN session_source = 'PAID'
          THEN amount_charged 
          ELSE 0 
        END) AS revenue

  FROM pt_sessions
  GROUP BY trainer_id
) ps ON t.id = ps.trainer_id


ORDER BY utilisation_rate DESC;

-- name: getRevenueAnalysisReport
SELECT 
  mp.id,
  mp.name AS plan_name,

  
  COUNT(mt.id) AS total_sales,
  SUM(mt.amount) AS plan_revenue,


  MAX(totals.total_membership_revenue) AS total_membership_revenue,
  MAX(totals.total_pt_revenue) AS total_pt_revenue,


  CASE 
    WHEN COUNT(mt.id) = MAX(max_plan.max_bookings) THEN 'YES'
    ELSE 'NO'
  END AS is_most_popular_plan,

  MAX(mps.specialization) AS most_popular_specialization

FROM membership_plans mp

LEFT JOIN membership_transactions mt 
  ON mp.id = mt.plan_id 
  AND mt.status = 'SUCCESS'

CROSS JOIN (
  SELECT 
    SUM(amount) AS total_membership_revenue,
    (SELECT SUM(amount_charged) 
     FROM pt_sessions 
     WHERE session_source = 'PAID') AS total_pt_revenue
  FROM membership_transactions
  WHERE status = 'SUCCESS'
) totals


CROSS JOIN (
  SELECT MAX(plan_count) AS max_bookings
  FROM (
    SELECT COUNT(*) AS plan_count
    FROM membership_transactions
    WHERE status = 'SUCCESS'
    GROUP BY plan_id
  ) x
) max_plan


CROSS JOIN (
  SELECT t.specialization
  FROM pt_sessions ps
  JOIN trainers t ON ps.trainer_id = t.id
  GROUP BY t.specialization
  ORDER BY COUNT(*) DESC
  LIMIT 1
) mps

GROUP BY mp.id, mp.name

ORDER BY plan_revenue DESC;