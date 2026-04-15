import * as mysql from 'mysql2/promise';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'surat_gym_hub',
    multipleStatements: true,
  });

  console.log('Connected to database. Seeding...');

  const passwordHash = await bcrypt.hash('password123', 10);

  await connection.execute(
    `INSERT INTO users (name, email, password_hash, role, status) VALUES
     ('Admin User', 'admin@suratgym.com', ?, 'ADMIN', 'ACTIVE'),
     ('Priya Receptionist', 'priya@suratgym.com', ?, 'RECEPTIONIST', 'ACTIVE'),
     ('Rahul Trainer', 'rahul@suratgym.com', ?, 'TRAINER', 'ACTIVE'),
     ('Sneha Trainer', 'sneha@suratgym.com', ?, 'TRAINER', 'ACTIVE'),
     ('Vikram Trainer', 'vikram@suratgym.com', ?, 'TRAINER', 'ACTIVE'),
     ('Anjali Trainer', 'anjali@suratgym.com', ?, 'TRAINER', 'ACTIVE'),
     ('Karan Trainer', 'karan@suratgym.com', ?, 'TRAINER', 'ACTIVE')`,
    [
      passwordHash,
      passwordHash,
      passwordHash,
      passwordHash,
      passwordHash,
      passwordHash,
      passwordHash,
    ],
  );
  console.log('Users seeded');

  await connection.execute(
    `INSERT INTO membership_plans (name, duration_months, price, pt_sessions, access_hours, status) VALUES
     ('Basic Monthly', 1, 999.00, 0, 'PEAK', 'ACTIVE'),
     ('Standard Monthly', 1, 1499.00, 4, 'FULL', 'ACTIVE'),
     ('Premium Quarterly', 3, 3999.00, 12, 'FULL', 'ACTIVE'),
     ('Gold Half-Yearly', 6, 6999.00, 24, 'FULL', 'ACTIVE'),
     ('Platinum Annual', 12, 11999.00, 48, 'FULL', 'ACTIVE')`,
  );
  console.log('Membership plans seeded');

  await connection.execute(
    `INSERT INTO trainers (user_id, specialization, session_rate, commission_rate, shift_start, shift_end, status) VALUES
     (3, 'WEIGHT_TRAINING', 500.00, 20.00, '06:00', '14:00', 'ACTIVE'),
     (4, 'YOGA', 400.00, 18.00, '07:00', '15:00', 'ACTIVE'),
     (5, 'CARDIO', 450.00, 20.00, '08:00', '16:00', 'ACTIVE'),
     (6, 'CROSSFIT', 550.00, 22.00, '06:00', '14:00', 'ACTIVE'),
     (7, 'GENERAL', 350.00, 15.00, '10:00', '18:00', 'ACTIVE')`,
  );
  console.log('Trainers seeded');

  const members = [
    [
      'MEM-2026-001',
      'Amit Patel',
      '9876543001',
      'amit@gmail.com',
      25,
      'MALE',
      null,
      '9876000001',
      2,
      '2026-03-01',
    ],
    [
      'MEM-2026-002',
      'Neha Shah',
      '9876543002',
      'neha@gmail.com',
      22,
      'FEMALE',
      null,
      '9876000002',
      3,
      '2026-03-05',
    ],
    [
      'MEM-2026-003',
      'Raj Desai',
      '9876543003',
      'raj@gmail.com',
      30,
      'MALE',
      'Knee pain',
      '9876000003',
      4,
      '2026-02-01',
    ],
    [
      'MEM-2026-004',
      'Pooja Mehta',
      '9876543004',
      'pooja@gmail.com',
      28,
      'FEMALE',
      null,
      '9876000004',
      5,
      '2026-01-15',
    ],
    [
      'MEM-2026-005',
      'Kiran Joshi',
      '9876543005',
      'kiran@gmail.com',
      35,
      'MALE',
      'Back pain',
      '9876000005',
      2,
      '2026-03-10',
    ],
    [
      'MEM-2026-006',
      'Riya Sharma',
      '9876543006',
      'riya@gmail.com',
      24,
      'FEMALE',
      null,
      '9876000006',
      1,
      '2026-04-01',
    ],
    [
      'MEM-2026-007',
      'Deepak Verma',
      '9876543007',
      'deepak@gmail.com',
      32,
      'MALE',
      null,
      '9876000007',
      3,
      '2026-03-15',
    ],
    [
      'MEM-2026-008',
      'Sonal Patel',
      '9876543008',
      'sonal@gmail.com',
      27,
      'FEMALE',
      'Asthma',
      '9876000008',
      4,
      '2026-02-20',
    ],
    [
      'MEM-2026-009',
      'Harsh Modi',
      '9876543009',
      'harsh@gmail.com',
      29,
      'MALE',
      null,
      '9876000009',
      5,
      '2026-01-01',
    ],
    [
      'MEM-2026-010',
      'Meera Gajjar',
      '9876543010',
      'meera@gmail.com',
      26,
      'FEMALE',
      null,
      '9876000010',
      2,
      '2026-03-20',
    ],
    [
      'MEM-2026-011',
      'Suresh Patel',
      '9876543011',
      'suresh@gmail.com',
      40,
      'MALE',
      'Diabetes',
      '9876000011',
      3,
      '2026-03-01',
    ],
    [
      'MEM-2026-012',
      'Disha Shah',
      '9876543012',
      'disha@gmail.com',
      21,
      'FEMALE',
      null,
      '9876000012',
      1,
      '2026-04-05',
    ],
    [
      'MEM-2026-013',
      'Nikhil Jain',
      '9876543013',
      'nikhil@gmail.com',
      33,
      'MALE',
      null,
      '9876000013',
      4,
      '2026-02-10',
    ],
    [
      'MEM-2026-014',
      'Kavita Desai',
      '9876543014',
      'kavita@gmail.com',
      31,
      'FEMALE',
      'Thyroid',
      '9876000014',
      5,
      '2026-01-20',
    ],
    [
      'MEM-2026-015',
      'Jigar Patel',
      '9876543015',
      'jigar@gmail.com',
      28,
      'MALE',
      null,
      '9876000015',
      2,
      '2026-03-25',
    ],
    [
      'MEM-2026-016',
      'Tanvi Mehta',
      '9876543016',
      'tanvi@gmail.com',
      23,
      'FEMALE',
      null,
      '9876000016',
      3,
      '2026-03-08',
    ],
    [
      'MEM-2026-017',
      'Bhavesh Shah',
      '9876543017',
      'bhavesh@gmail.com',
      36,
      'MALE',
      'Heart condition',
      '9876000017',
      4,
      '2026-02-15',
    ],
    [
      'MEM-2026-018',
      'Swati Joshi',
      '9876543018',
      'swati@gmail.com',
      25,
      'FEMALE',
      null,
      '9876000018',
      1,
      '2026-04-02',
    ],
    [
      'MEM-2026-019',
      'Yash Patel',
      '9876543019',
      'yash@gmail.com',
      20,
      'MALE',
      null,
      '9876000019',
      5,
      '2026-01-10',
    ],
    [
      'MEM-2026-020',
      'Nisha Trivedi',
      '9876543020',
      'nisha@gmail.com',
      29,
      'FEMALE',
      null,
      '9876000020',
      2,
      '2026-03-28',
    ],
  ];

  const planDurations: Record<number, number> = {
    1: 1,
    2: 1,
    3: 3,
    4: 6,
    5: 12,
  };

  const planPtSessions: Record<number, number> = {
    1: 0,
    2: 4,
    3: 12,
    4: 24,
    5: 48,
  };

  for (const m of members) {
    const planId = m[8] as number;
    const startDate = new Date(m[9] as string);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + planDurations[planId]);
    const endDateStr = endDate.toISOString().split('T')[0];

    const isExpired = endDate < new Date();
    const status = isExpired ? 'EXPIRED' : 'ACTIVE';

    await connection.execute(
      `INSERT INTO members (member_code, name, phone, email, age, gender, health_conditions,
       emergency_contact_phone, membership_plan_id, start_date, end_date, status,
       remaining_pt_sessions, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        m[0],
        m[1],
        m[2],
        m[3],
        m[4],
        m[5],
        m[6],
        m[7],
        planId,
        m[9],
        endDateStr,
        status,
        planPtSessions[planId],
      ],
    );
  }
  console.log('Members seeded (20)');

  for (const m of members) {
    const planId = m[8] as number;
    const startDate = m[9] as string;
    const endDate = new Date(new Date(startDate));
    endDate.setMonth(endDate.getMonth() + planDurations[planId]);

    const planPrices: Record<number, number> = {
      1: 999,
      2: 1499,
      3: 3999,
      4: 6999,
      5: 11999,
    };

    await connection.execute(
      `INSERT INTO membership_transactions (member_id, plan_id, amount, payment_method, transaction_type, start_date, end_date, status, created_by)
       VALUES ((SELECT id FROM members WHERE member_code = ?), ?, ?, 'CASH', 'NEW', ?, ?, 'SUCCESS', 1)`,
      [
        m[0],
        planId,
        planPrices[planId],
        startDate,
        endDate.toISOString().split('T')[0],
      ],
    );
  }
  console.log('Membership transactions seeded');

  const slotDates = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12'];
  const timeSlots = [
    ['06:00', '07:00'],
    ['07:00', '08:00'],
    ['08:00', '09:00'],
    ['09:00', '10:00'],
    ['10:00', '11:00'],
    ['11:00', '12:00'],
    ['14:00', '15:00'],
    ['15:00', '16:00'],
  ];

  let slotCount = 0;
  for (let trainerId = 1; trainerId <= 5; trainerId++) {
    for (const date of slotDates) {

      const trainerSlots = timeSlots.slice(
        (trainerId - 1) % 4,
        ((trainerId - 1) % 4) + 2,
      );
      for (const [start, end] of trainerSlots) {
        await connection.execute(
          `INSERT INTO trainer_time_slots (trainer_id, slot_date, start_time, end_time, status)
           VALUES (?, ?, ?, ?, 'AVAILABLE')`,
          [trainerId, date, start, end],
        );
        slotCount++;
      }
    }
  }
  console.log(`Trainer time slots seeded (${slotCount})`);

  const sessionData = [];
  let sessionNum = 1;

  const [slots] = await connection.execute(
    `SELECT id, trainer_id, slot_date, start_time FROM trainer_time_slots WHERE status = 'AVAILABLE' ORDER BY id LIMIT 30`,
  );

  const availableSlots = slots as {
    id: number;
    trainer_id: number;
    slot_date: string;
    start_time: string;
  }[];
  const trainerSpecs: Record<number, string> = {
    1: 'WEIGHT_TRAINING',
    2: 'YOGA',
    3: 'CARDIO',
    4: 'CROSSFIT',
    5: 'GENERAL',
  };

  const statuses = ['BOOKED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'NO_SHOW'];

  for (let i = 0; i < Math.min(30, availableSlots.length); i++) {
    const slot = availableSlots[i];
    const memberId = (i % 20) + 1;
    const sessionCode = `PT-2026-${String(sessionNum).padStart(3, '0')}`;
    const status = statuses[i % statuses.length];
    const source = i % 3 === 0 ? 'PAID' : 'PLAN';
    const amount = source === 'PAID' ? 500 : 0;

    await connection.execute(
      `INSERT INTO pt_sessions (session_code, member_id, trainer_id, slot_id, session_type, session_source, amount_charged, session_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionCode,
        memberId,
        slot.trainer_id,
        slot.id,
        trainerSpecs[slot.trainer_id],
        source,
        amount,
        slot.slot_date,
        status,
      ],
    );

    await connection.execute(
      `UPDATE trainer_time_slots SET status = 'BOOKED' WHERE id = ?`,
      [slot.id],
    );

    sessionNum++;
  }
  console.log('PT Sessions seeded (30)');

  const attendanceDates = ['2026-04-07', '2026-04-08', '2026-04-09'];
  for (const date of attendanceDates) {

    const numCheckIns = 8 + Math.floor(Math.random() * 5);
    for (let i = 1; i <= numCheckIns; i++) {
      const hour = 6 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);
      const checkIn = `${date} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

      try {
        await connection.execute(
          `INSERT INTO attendance (member_id, check_in_time, attendance_date)
           VALUES (?, ?, ?)`,
          [i, checkIn, date],
        );
      } catch {

      }
    }
  }
  console.log('Attendance seeded');

  console.log('\n=== SEED COMPLETE ===');
  console.log('Login credentials:');
  console.log('  Admin:        admin@suratgym.com / password123');
  console.log('  Receptionist: priya@suratgym.com / password123');
  console.log('  Trainer:      rahul@suratgym.com / password123');

  await connection.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
