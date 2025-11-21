import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.adminUser.findUnique({
        where: { username: "admin" },
    });
    console.log("Admin keys:", admin ? Object.keys(admin) : "null");
    if (admin) {
        const valid = await bcrypt.compare("password", admin.passwordHash);
        console.log("Password 'password' valid:", valid);
    } else {
        console.log("Admin user not found");
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
