require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.log('Usage: node reset-password.cjs EMAIL PASSWORD');
        return;
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.user.update({
        where: { email },
        data: { password: hashed }
    });

    console.log(`Password reset successfully for ${email}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
