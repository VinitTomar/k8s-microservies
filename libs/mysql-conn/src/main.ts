import mysql from 'mysql2/promise';

if (!process.env.MYSQL_HOST) {
  throw Error("No MYSQL_HOST found in environment");
}
const host = process.env.MYSQL_HOST;

if (!process.env.MYSQL_PORT) {
  throw Error("No MYSQL_PORT found in environment");
}
const port = Number(process.env.MYSQL_PORT);

if (!process.env.MYSQL_DATABASE) {
  throw Error("No MYSQL_DATABASE found in environment");
}
const database = process.env.MYSQL_DATABASE;

if (!process.env.MYSQL_USER) {
  throw Error("No MYSQL_USER found in environment");
}
const user = process.env.MYSQL_USER;

if (!process.env.MYSQL_PASSWORD) {
  throw Error("No MYSQL_PASSWORD found in environment");
}
const password = process.env.MYSQL_PASSWORD;

const pool = mysql.createPool({
  host,
  port,
  database,
  user,
  password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export { pool };