import bcrypt from "bcryptjs";
import prisma from "../lib/prisma";
import { signToken, JwtPayload } from "../lib/jwt";

export async function login(email: string, password: string): Promise<{ token: string; user: JwtPayload }> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
        throw new Error("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        throw new Error("Invalid email or password");
    }

    const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
    };

    return { token: signToken(payload), user: payload };
}

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, 10);
}
