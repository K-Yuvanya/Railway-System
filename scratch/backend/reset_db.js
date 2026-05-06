const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function resetDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        multipleStatements: true
    });

    try {
        console.log("Stopping foreign key checks...");
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log(`Recreating database: ${process.env.DB_NAME}...`);
        await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
        await connection.query(`CREATE DATABASE ${process.env.DB_NAME}`);
        await connection.query(`USE ${process.env.DB_NAME}`);

        const sqlFile = path.join(__dirname, '..', 'railway_system.sql');
        const sqlContent = fs.readFileSync(sqlFile, 'utf8');

        console.log("Executing railway_system.sql...");
        // Execute the entire file content
        await connection.query(sqlContent);

        console.log("Restoring foreign key checks...");
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log("✅ Database has been reset to a fresh state!");
    } catch (error) {
        console.error("❌ Error resetting database:", error);
    } finally {
        await connection.end();
    }
}

resetDatabase();
