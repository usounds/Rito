import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'NodeOAuthSession' AND column_name = 'updatedAt'
        `);
        console.log('Columns found:', res.rows);
    } catch (e) {
        console.error('Error checking schema:', e);
    } finally {
        await pool.end();
    }
}

check();
