import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import * as bcrypt from 'bcrypt';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'change-me-in-production'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export async function verifyLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  const permissions = user.userRoles.flatMap((ur) =>
    ur.role.rolePermissions.map((rp) => rp.permission.code)
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: Array.from(new Set(permissions)),
  };
}

export async function createToken(payload: { id: string; email: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { sub?: string; id: string; email: string };
  } catch {
    return null;
  }
}

export async function getSession(req: Request) {
  const auth = req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = user.userRoles.flatMap((ur) =>
    ur.role.rolePermissions.map((rp) => rp.permission.code)
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    permissions: Array.from(new Set(permissions)),
  };
}

export function requirePermission(session: { permissions: string[] } | null, permission: string) {
  if (!session) throw new Error('Unauthorized');
  if (!session.permissions.includes(permission)) throw new Error('Forbidden');
}

export function requireAnyPermission(session: { permissions: string[] } | null, permissions: string[]) {
  if (!session) throw new Error('Unauthorized');
  const has = permissions.some((p) => session.permissions.includes(p));
  if (!has) throw new Error('Forbidden');
}
