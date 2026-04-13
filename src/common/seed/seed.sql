-- =====================================================
-- 1. USERS
-- =====================================================
INSERT INTO users (name, email, password_hash, role, status) VALUES
('Admin User', 'admin@suratgym.com', '$2b$10$examplehashpassword123', 'ADMIN', 'ACTIVE'),
('Priya Receptionist', 'priya@suratgym.com', '$2b$10$examplehashpassword123', 'RECEPTIONIST', 'ACTIVE'),
('Rahul Trainer', 'rahul@suratgym.com', '$2b$10$examplehashpassword123', 'TRAINER', 'ACTIVE'),
('Sneha Trainer', 'sneha@suratgym.com', '$2b$10$examplehashpassword123', 'TRAINER', 'ACTIVE'),
('Vikram Trainer', 'vikram@suratgym.com', '$2b$10$examplehashpassword123', 'TRAINER', 'ACTIVE'),
('Anjali Trainer', 'anjali@suratgym.com', '$2b$10$examplehashpassword123', 'TRAINER', 'ACTIVE'),
('Karan Trainer', 'karan@suratgym.com', '$2b$10$examplehashpassword123', 'TRAINER', 'ACTIVE');

-- =====================================================
-- 2. MEMBERSHIP PLANS
-- =====================================================
INSERT INTO membership_plans (name, duration_months, price, pt_sessions, access_hours, status) VALUES
('Basic Monthly', 1, 999.00, 0, 'PEAK', 'ACTIVE'),
('Standard Monthly', 1, 1499.00, 4, 'FULL', 'ACTIVE'),
('Premium Quarterly', 3, 3999.00, 12, 'FULL', 'ACTIVE'),
('Gold Half-Yearly', 6, 6999.00, 24, 'FULL', 'ACTIVE'),
('Platinum Annual', 12, 11999.00, 48, 'FULL', 'ACTIVE');

-- =====================================================
-- 3. TRAINERS
-- =====================================================
INSERT INTO trainers (user_id, specialization, session_rate, commission_rate, shift_start, shift_end, status) VALUES
(3,'WEIGHT_TRAINING',500,20,'06:00','14:00','ACTIVE'),
(4,'YOGA',400,18,'07:00','15:00','ACTIVE'),
(5,'CARDIO',450,20,'08:00','16:00','ACTIVE'),
(6,'CROSSFIT',550,22,'06:00','14:00','ACTIVE'),
(7,'GENERAL',350,15,'10:00','18:00','ACTIVE');

-- =====================================================
-- 4. MEMBERS (ALL 20)
-- =====================================================
INSERT INTO members
(member_code,name,phone,email,age,gender,health_conditions,emergency_contact_phone,membership_plan_id,start_date,end_date,status,remaining_pt_sessions,created_by)
VALUES
('MEM-2026-001','Amit Patel','9876543001','amit@gmail.com',25,'MALE',NULL,'9876000001',2,'2026-03-01','2026-04-01','ACTIVE',4,1),
('MEM-2026-002','Neha Shah','9876543002','neha@gmail.com',22,'FEMALE',NULL,'9876000002',3,'2026-03-05','2026-06-05','ACTIVE',12,1),
('MEM-2026-003','Raj Desai','9876543003','raj@gmail.com',30,'MALE','Knee pain','9876000003',4,'2026-02-01','2026-08-01','ACTIVE',24,1),
('MEM-2026-004','Pooja Mehta','9876543004','pooja@gmail.com',28,'FEMALE',NULL,'9876000004',5,'2026-01-15','2027-01-15','ACTIVE',48,1),
('MEM-2026-005','Kiran Joshi','9876543005','kiran@gmail.com',35,'MALE','Back pain','9876000005',2,'2026-03-10','2026-04-10','ACTIVE',4,1),
('MEM-2026-006','Riya Sharma','9876543006','riya@gmail.com',24,'FEMALE',NULL,'9876000006',1,'2026-04-01','2026-05-01','ACTIVE',0,1),
('MEM-2026-007','Deepak Verma','9876543007','deepak@gmail.com',32,'MALE',NULL,'9876000007',3,'2026-03-15','2026-06-15','ACTIVE',12,1),
('MEM-2026-008','Sonal Patel','9876543008','sonal@gmail.com',27,'FEMALE','Asthma','9876000008',4,'2026-02-20','2026-08-20','ACTIVE',24,1),
('MEM-2026-009','Harsh Modi','9876543009','harsh@gmail.com',29,'MALE',NULL,'9876000009',5,'2026-01-01','2027-01-01','ACTIVE',48,1),
('MEM-2026-010','Meera Gajjar','9876543010','meera@gmail.com',26,'FEMALE',NULL,'9876000010',2,'2026-03-20','2026-04-20','ACTIVE',4,1),
('MEM-2026-011','Suresh Patel','9876543011','suresh@gmail.com',40,'MALE','Diabetes','9876000011',3,'2026-03-01','2026-06-01','ACTIVE',12,1),
('MEM-2026-012','Disha Shah','9876543012','disha@gmail.com',21,'FEMALE',NULL,'9876000012',1,'2026-04-05','2026-05-05','ACTIVE',0,1),
('MEM-2026-013','Nikhil Jain','9876543013','nikhil@gmail.com',33,'MALE',NULL,'9876000013',4,'2026-02-10','2026-08-10','ACTIVE',24,1),
('MEM-2026-014','Kavita Desai','9876543014','kavita@gmail.com',31,'FEMALE','Thyroid','9876000014',5,'2026-01-20','2027-01-20','ACTIVE',48,1),
('MEM-2026-015','Jigar Patel','9876543015','jigar@gmail.com',28,'MALE',NULL,'9876000015',2,'2026-03-25','2026-04-25','ACTIVE',4,1),
('MEM-2026-016','Tanvi Mehta','9876543016','tanvi@gmail.com',23,'FEMALE',NULL,'9876000016',3,'2026-03-08','2026-06-08','ACTIVE',12,1),
('MEM-2026-017','Bhavesh Shah','9876543017','bhavesh@gmail.com',36,'MALE','Heart condition','9876000017',4,'2026-02-15','2026-08-15','ACTIVE',24,1),
('MEM-2026-018','Swati Joshi','9876543018','swati@gmail.com',25,'FEMALE',NULL,'9876000018',1,'2026-04-02','2026-05-02','ACTIVE',0,1),
('MEM-2026-019','Yash Patel','9876543019','yash@gmail.com',20,'MALE',NULL,'9876000019',5,'2026-01-10','2027-01-10','ACTIVE',48,1),
('MEM-2026-020','Nisha Trivedi','9876543020','nisha@gmail.com',29,'FEMALE',NULL,'9876000020',2,'2026-03-28','2026-04-28','ACTIVE',4,1);

-- =====================================================
-- 5. MEMBERSHIP TRANSACTIONS (ALL 20)
-- =====================================================
INSERT INTO membership_transactions
(member_id,plan_id,amount,payment_method,transaction_type,start_date,end_date,status,created_by)
VALUES
(1,2,1499,'CASH','NEW','2026-03-01','2026-04-01','SUCCESS',1),
(2,3,3999,'CASH','NEW','2026-03-05','2026-06-05','SUCCESS',1),
(3,4,6999,'CASH','NEW','2026-02-01','2026-08-01','SUCCESS',1),
(4,5,11999,'CASH','NEW','2026-01-15','2027-01-15','SUCCESS',1),
(5,2,1499,'CASH','NEW','2026-03-10','2026-04-10','SUCCESS',1),
(6,1,999,'CASH','NEW','2026-04-01','2026-05-01','SUCCESS',1),
(7,3,3999,'CASH','NEW','2026-03-15','2026-06-15','SUCCESS',1),
(8,4,6999,'CASH','NEW','2026-02-20','2026-08-20','SUCCESS',1),
(9,5,11999,'CASH','NEW','2026-01-01','2027-01-01','SUCCESS',1),
(10,2,1499,'CASH','NEW','2026-03-20','2026-04-20','SUCCESS',1),
(11,3,3999,'CASH','NEW','2026-03-01','2026-06-01','SUCCESS',1),
(12,1,999,'CASH','NEW','2026-04-05','2026-05-05','SUCCESS',1),
(13,4,6999,'CASH','NEW','2026-02-10','2026-08-10','SUCCESS',1),
(14,5,11999,'CASH','NEW','2026-01-20','2027-01-20','SUCCESS',1),
(15,2,1499,'CASH','NEW','2026-03-25','2026-04-25','SUCCESS',1),
(16,3,3999,'CASH','NEW','2026-03-08','2026-06-08','SUCCESS',1),
(17,4,6999,'CASH','NEW','2026-02-15','2026-08-15','SUCCESS',1),
(18,1,999,'CASH','NEW','2026-04-02','2026-05-02','SUCCESS',1),
(19,5,11999,'CASH','NEW','2026-01-10','2027-01-10','SUCCESS',1),
(20,2,1499,'CASH','NEW','2026-03-28','2026-04-28','SUCCESS',1);

-- =====================================================
-- 6. TRAINER TIME SLOTS (40 SLOTS)
-- =====================================================
INSERT INTO trainer_time_slots (trainer_id,slot_date,start_time,end_time,status) VALUES
(1,'2026-04-09','06:00','07:00','AVAILABLE'),
(1,'2026-04-09','07:00','08:00','AVAILABLE'),
(1,'2026-04-10','06:00','07:00','AVAILABLE'),
(1,'2026-04-10','07:00','08:00','AVAILABLE'),

(2,'2026-04-09','07:00','08:00','AVAILABLE'),
(2,'2026-04-09','08:00','09:00','AVAILABLE'),
(2,'2026-04-10','07:00','08:00','AVAILABLE'),
(2,'2026-04-10','08:00','09:00','AVAILABLE'),

(3,'2026-04-09','08:00','09:00','AVAILABLE'),
(3,'2026-04-09','09:00','10:00','AVAILABLE'),
(3,'2026-04-10','08:00','09:00','AVAILABLE'),
(3,'2026-04-10','09:00','10:00','AVAILABLE'),

(4,'2026-04-09','10:00','11:00','AVAILABLE'),
(4,'2026-04-09','11:00','12:00','AVAILABLE'),
(4,'2026-04-10','10:00','11:00','AVAILABLE'),
(4,'2026-04-10','11:00','12:00','AVAILABLE'),

(5,'2026-04-09','14:00','15:00','AVAILABLE'),
(5,'2026-04-09','15:00','16:00','AVAILABLE'),
(5,'2026-04-10','14:00','15:00','AVAILABLE'),
(5,'2026-04-10','15:00','16:00','AVAILABLE'),

(1,'2026-04-11','06:00','07:00','AVAILABLE'),
(2,'2026-04-11','07:00','08:00','AVAILABLE'),
(3,'2026-04-11','08:00','09:00','AVAILABLE'),
(4,'2026-04-11','10:00','11:00','AVAILABLE'),
(5,'2026-04-11','14:00','15:00','AVAILABLE'),
(1,'2026-04-12','06:00','07:00','AVAILABLE'),
(2,'2026-04-12','07:00','08:00','AVAILABLE'),
(3,'2026-04-12','08:00','09:00','AVAILABLE'),
(4,'2026-04-12','10:00','11:00','AVAILABLE'),
(5,'2026-04-12','14:00','15:00','AVAILABLE');

-- =====================================================
-- 7. PT SESSIONS (30 SESSIONS)
-- =====================================================
INSERT INTO pt_sessions
(session_code,member_id,trainer_id,slot_id,session_type,session_source,amount_charged,session_date,status)
VALUES
('PT-2026-001',1,1,1,'WEIGHT_TRAINING','PAID',500,'2026-04-09','COMPLETED'),
('PT-2026-002',2,2,5,'YOGA','PLAN',0,'2026-04-09','BOOKED'),
('PT-2026-003',3,3,9,'CARDIO','PLAN',0,'2026-04-09','COMPLETED'),
('PT-2026-004',4,4,13,'CROSSFIT','PAID',500,'2026-04-09','COMPLETED'),
('PT-2026-005',5,5,17,'GENERAL','PLAN',0,'2026-04-09','NO_SHOW'),

('PT-2026-006',6,1,2,'WEIGHT_TRAINING','PLAN',0,'2026-04-10','COMPLETED'),
('PT-2026-007',7,2,6,'YOGA','PAID',500,'2026-04-10','COMPLETED'),
('PT-2026-008',8,3,10,'CARDIO','PLAN',0,'2026-04-10','BOOKED'),
('PT-2026-009',9,4,14,'CROSSFIT','PLAN',0,'2026-04-10','COMPLETED'),
('PT-2026-010',10,5,18,'GENERAL','PAID',500,'2026-04-10','COMPLETED'),

('PT-2026-011',11,1,3,'WEIGHT_TRAINING','PLAN',0,'2026-04-11','COMPLETED'),
('PT-2026-012',12,2,7,'YOGA','PLAN',0,'2026-04-11','COMPLETED'),
('PT-2026-013',13,3,11,'CARDIO','PAID',500,'2026-04-11','NO_SHOW'),
('PT-2026-014',14,4,15,'CROSSFIT','PLAN',0,'2026-04-11','COMPLETED'),
('PT-2026-015',15,5,19,'GENERAL','PLAN',0,'2026-04-11','COMPLETED'),

('PT-2026-016',16,1,21,'WEIGHT_TRAINING','PAID',500,'2026-04-12','BOOKED'),
('PT-2026-017',17,2,22,'YOGA','PLAN',0,'2026-04-12','COMPLETED'),
('PT-2026-018',18,3,23,'CARDIO','PLAN',0,'2026-04-12','COMPLETED'),
('PT-2026-019',19,4,24,'CROSSFIT','PAID',500,'2026-04-12','COMPLETED'),
('PT-2026-020',20,5,25,'GENERAL','PLAN',0,'2026-04-12','NO_SHOW'),

('PT-2026-021',1,1,26,'WEIGHT_TRAINING','PLAN',0,'2026-04-09','COMPLETED'),
('PT-2026-022',2,2,27,'YOGA','PLAN',0,'2026-04-10','COMPLETED'),
('PT-2026-023',3,3,28,'CARDIO','PAID',500,'2026-04-11','COMPLETED'),
('PT-2026-024',4,4,29,'CROSSFIT','PLAN',0,'2026-04-12','BOOKED'),
('PT-2026-025',5,5,30,'GENERAL','PLAN',0,'2026-04-09','COMPLETED'),
('PT-2026-026',6,1,31,'WEIGHT_TRAINING','PLAN',0,'2026-04-10','COMPLETED'),
('PT-2026-027',7,2,32,'YOGA','PAID',500,'2026-04-11','COMPLETED'),
('PT-2026-028',8,3,33,'CARDIO','PLAN',0,'2026-04-12','NO_SHOW'),
('PT-2026-029',9,4,34,'CROSSFIT','PLAN',0,'2026-04-09','COMPLETED'),
('PT-2026-030',10,5,35,'GENERAL','PAID',500,'2026-04-10','COMPLETED');

-- =====================================================
-- 8. ATTENDANCE (FIXED VERSION)
-- =====================================================
INSERT INTO attendance (member_id,check_in_time,attendance_date) VALUES
(1,'2026-04-07 07:10:00','2026-04-07'),
(2,'2026-04-07 07:20:00','2026-04-07'),
(3,'2026-04-07 07:30:00','2026-04-07'),
(4,'2026-04-07 07:40:00','2026-04-07'),
(5,'2026-04-07 07:50:00','2026-04-07'),
(6,'2026-04-07 08:00:00','2026-04-07'),
(7,'2026-04-07 08:10:00','2026-04-07'),
(8,'2026-04-07 08:20:00','2026-04-07'),
(9,'2026-04-07 08:30:00','2026-04-07'),
(10,'2026-04-07 08:40:00','2026-04-07');