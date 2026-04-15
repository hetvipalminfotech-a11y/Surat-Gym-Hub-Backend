create database surat_gym_hub;
use surat_gym_hub;

create table users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN','RECEPTIONIST','TRAINER') NOT NULL,
  status ENUM('ACTIVE','INACTIVE','BLOCKED') DEFAULT 'ACTIVE',
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL

);

create table tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expired_at TIMESTAMP NOT NULL,
  status ENUM('ACTIVE','REVOKED') DEFAULT 'ACTIVE',
  user_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- INDEX idx_user (user_id)
);
create table membership_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  duration_months INT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  pt_sessions INT DEFAULT 0,
  access_hours ENUM('FULL','PEAK'),
  status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL
);

create table members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_code VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(150),
  age INT,
  gender ENUM('MALE','FEMALE','OTHER'),
  health_conditions TEXT,
  emergency_contact_phone VARCHAR(20),
  membership_plan_id INT,
  start_date DATE,
  end_date DATE,
  status ENUM('ACTIVE','EXPIRED','FROZEN','CANCELLED') DEFAULT 'ACTIVE',
  remaining_pt_sessions INT DEFAULT 0 CHECK (remaining_pt_sessions >= 0),
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (membership_plan_id) REFERENCES membership_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_members_end_date (end_date),
  INDEX idx_members_plan_id (membership_plan_id)
);

CREATE TABLE member_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  note VARCHAR(255) NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
ALTER TABLE member_status_history
ADD COLUMN old_plan_id INT NULL,
ADD COLUMN new_plan_id INT NULL;

CREATE TABLE member_freeze_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  freeze_start_date DATE NOT NULL,
  freeze_end_date DATE NULL,
  total_days INT DEFAULT 0,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE trainers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  specialization ENUM('WEIGHT_TRAINING','YOGA','CARDIO','CROSSFIT','GENERAL'),
  session_rate DECIMAL(5,2) NOT NULL,
  commission_rate DECIMAL(5,2) CHECK (commission_rate >= 0 AND commission_rate <= 100) NOT NULL, -- %
  shift_start TIME,
  shift_end TIME,
  status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
  user_id INT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_trainers_user_id (user_id)
);

CREATE TABLE trainer_time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trainer_id INT NOT NULL,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('AVAILABLE','BOOKED','BLOCKED') DEFAULT 'AVAILABLE',
  FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE,
  CHECK (end_time > start_time),
  UNIQUE unique_slot (trainer_id, slot_date, start_time, end_time),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_tts_trainer_status (trainer_id, status)
);

CREATE TABLE pt_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_code VARCHAR(50) NOT NULL UNIQUE,
  member_id INT NOT NULL,
  trainer_id INT NOT NULL,
  slot_id INT NOT NULL ,
  session_type ENUM('WEIGHT_TRAINING','YOGA','CARDIO','CROSSFIT','GENERAL'),
  session_source ENUM('PLAN','PAID'),
  amount_charged DECIMAL(10,2) ,
  session_date DATE NOT NULL,
  status ENUM('BOOKED','COMPLETED','CANCELLED','NO_SHOW') NOT NULL,
  FOREIGN KEY (slot_id) REFERENCES trainer_time_slots(id),
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (trainer_id) REFERENCES trainers(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
   INDEX idx_pt_session_date_status (session_date, status, deleted_at),
    INDEX idx_pt_trainer_status (trainer_id, status),
    INDEX idx_pt_source_trainer (session_source, trainer_id)
);
 
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  check_in_time DATETIME NOT NULL,
  check_out_time DATETIME NULL,
  attendance_date DATE NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE (member_id, attendance_date),
  INDEX idx_attendance_date_deleted_time (attendance_date, deleted_at, check_in_time)
);

CREATE TABLE membership_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  plan_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method ENUM('CASH','UPI','CARD','ONLINE'),
  transaction_type ENUM('NEW','RENEW','UPGRADE'),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ENUM('SUCCESS','FAILED','PENDING') DEFAULT 'SUCCESS',
  created_by INT,
  FOREIGN KEY (member_id) REFERENCES members(id),
  FOREIGN KEY (plan_id) REFERENCES membership_plans(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_mt_plan_status (plan_id, status),
  INDEX idx_mt_status_date (status, deleted_at, created_at)
);
