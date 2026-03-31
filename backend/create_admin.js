const bcrypt = require('bcryptjs');
const db = require('./config/db');

async function createAdmin() {
    try {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Remove old admin if exists
        await db.query('DELETE FROM users WHERE email = ?', ['admin@flexnest.com']);
        
        // Insert new admin
        await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
            ['Flexnest Admin', 'admin@flexnest.com', hashedPassword]
        );
        
        console.log('✅ Admin user created successfully!');
        console.log('Email: admin@flexnest.com');
        console.log('Password: admin123');
        process.exit(0);
    } catch (err) {
        console.error('Error creating admin:', err);
        process.exit(1);
    }
}

createAdmin();
