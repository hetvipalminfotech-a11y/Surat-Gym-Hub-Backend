import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as mysql from 'mysql2/promise';
import { createPool, Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
/** Allowed types for SQL parameters */
type SqlParam = string | number | boolean | null | Date;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  // private connection!: mysql.Connection;
  pool!: mysql.Pool;

  async onModuleInit() {
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

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  /** Run a query with parameters - returns rows */
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

  // /** Run an INSERT/UPDATE/DELETE and return result metadata */
  // async execute(sql: string, params?: SqlParam[]): Promise<mysql.ResultSetHeader> {
  //   const [result] = await this.pool.execute(sql, params as SqlParam[]);
  //   return result as mysql.ResultSetHeader;
  // }

   /** Get the raw connection */
  getConnection(): mysql.Connection {
    return this.pool;
  }

// ✅ STRICT GENERIC (NO any)
  async execute<T extends RowDataPacket[] | ResultSetHeader>(
    query: string,
    params: SqlParam[] = [],
  ): Promise<T> {
    const [result] = await this.pool.execute(query, params);
    return result as T;
  }

  // ✅ TRANSACTION SUPPORT
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

