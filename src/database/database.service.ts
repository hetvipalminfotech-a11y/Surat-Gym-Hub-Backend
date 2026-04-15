import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

type SqlParam = string | number | boolean | null | Date;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {

  pool!: mysql.Pool;

  async onModuleInit(): Promise<void> {
   this.pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings:true,
});
    
    console.log('Database connected successfully');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async query<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = [],
): Promise<T[]> {
  const safeParams = params.map(p =>
    p instanceof Date
      ? p.toISOString().slice(0, 19).replace('T', ' ')
      : p
  );

  const [rows] = await this.pool.execute(sql, safeParams);
  return rows as T[];
}

  getConnection(): mysql.Connection {
    return this.pool;
  }

  async execute<T extends RowDataPacket[] | ResultSetHeader>(
    query: string,
    params: SqlParam[] = [],
  ): Promise<T> {
    const safeParams = params.map(p =>
      p instanceof Date
        ? p.toISOString().slice(0, 19).replace('T', ' ')
        : p
    );
    const [result] = await this.pool.execute(query, safeParams);
    return result as T;
  }

  async transaction<T>(
    callback: (conn: PoolConnection) => Promise<T>,
  ): Promise<T> {
    const conn = await this.pool.getConnection();

    try {
      await conn.beginTransaction();
      const result = await callback(conn);
      await conn.commit();
      return result;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
}
