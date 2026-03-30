import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ComplianceWhitepaper } from "@/lib/export/compliance-whitepaper";

/**
 * GET /api/export/compliance-whitepaper
 *
 * Renders the compliance whitepaper PDF and returns it as a downloadable file.
 * This is a public marketing document — no auth required.
 */
export async function GET() {
  try {
    const doc = ComplianceWhitepaper();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(doc as any);

    const now = new Date();
    const timestamp = now.toISOString().slice(0, 7); // YYYY-MM
    const filename = `CVERiskPilot-Compliance-Whitepaper-${timestamp}.pdf`;

    return new Response(Buffer.from(buffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[Compliance Whitepaper] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate compliance whitepaper" },
      { status: 500 },
    );
  }
}
