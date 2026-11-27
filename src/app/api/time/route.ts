import { NextResponse } from "next/server";

// Time mark dari server — klien membandingkan dengan jam HP untuk anti-manipulasi
export function GET() {
  return NextResponse.json({ now: Date.now() });
}
