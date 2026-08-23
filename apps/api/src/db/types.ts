export type SqlClient = {
  query<T extends Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string, params?: unknown[]): Promise<void>;
  transaction<T>(fn: (sql: SqlClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
};
