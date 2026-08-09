import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Turnstile response token is required.' }, { status: 400 });
    }

    const secret = process.env.TURNSTILE_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Turnstile secret is not configured.' }, { status: 500 });
    }

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    });

    if (!verifyRes.ok) {
      throw new Error(`Siteverify HTTP ${verifyRes.status}`);
    }

    const result = await verifyRes.json();

    if (!result.success) {
      return NextResponse.json(
        { error: 'Turnstile verification failed.', codes: result['error-codes'] },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification error' }, { status: 500 });
  }
}
