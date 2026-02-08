import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './auth';

export type Session = Awaited<ReturnType<typeof getSession>>;

export function apiResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function withAuth(
  req: NextRequest,
  permission: string | string[],
  handler: (req: NextRequest, session: NonNullable<Session>) => Promise<NextResponse>
) {
  const session = await getSession(req);
  if (!session) return apiError('Unauthorized', 401);
  const perms = Array.isArray(permission) ? permission : [permission];
  const has = perms.some((p) => session.permissions.includes(p));
  if (!has) return apiError('Forbidden', 403);
  return handler(req, session);
}
