import { NextResponse } from "next/server";

// Verifikasi token reCAPTCHA ke Google — secret key hanya di server.
export async function POST(req: Request) {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  let token = "";
  try {
    const body = await req.json();
    token = body?.token || "";
  } catch {
    /* body kosong */
  }
  if (!secret || !token) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  });
  const data = await res.json();
  return NextResponse.json({ success: data.success === true });
}
