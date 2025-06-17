import { NextResponse } from "next/server";
import { generateSampleJournals } from "@/lib/utils/sample-journal-generator";

export const runtime = "nodejs"; // Ensure Node.js runtime (not edge)

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { count } = (await request.json().catch(() => ({}))) as {
    count?: number;
  };
  const num = count && Number(count) > 0 ? Number(count) : 1000;

  try {
    await generateSampleJournals(num);
    return NextResponse.json({ success: true, count: num });
  } catch (e: unknown) {
    console.error("generateSampleJournals API error", e);
    return new NextResponse(
      e instanceof Error ? e.message : "Internal Server Error",
      {
        status: 500,
      },
    );
  }
}
