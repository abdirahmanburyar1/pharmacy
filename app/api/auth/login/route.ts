import { NextRequest, NextResponse } from 'next/server';
import { verifyLogin, createToken } from '@/lib/auth';
import { z } from 'zod';

const schema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);
    const user = await verifyLogin(email, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = await createToken({ id: user.id, email: user.email });
    return NextResponse.json({
      access_token: token,
      user: { id: user.id, email: user.email, name: user.name, permissions: user.permissions },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
