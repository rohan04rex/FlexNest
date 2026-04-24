const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function run() {
    const connection = await mysql.createConnection({
        host: 'shortline.proxy.rlwy.net',
        port: 42165,
        user: 'root',
        password: 'joZZybNhsVYLaBTboVFevGrbbQJQDqxy',
        database: 'railway'
    });

    const email = 'admin@flexnest.com';
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        await connection.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
            ['Admin', email, hashedPassword]
        );
        console.log('Admin user created!');
        console.log('Email:', email);
        console.log('Password:', password);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            console.log('Admin user already exists');
        } else {
            console.error('Error:', err.message);
        }
    } finally {
        await connection.end();
    }
}

run();
