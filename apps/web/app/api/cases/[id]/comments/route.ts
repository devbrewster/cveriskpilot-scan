import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@cveriskpilot/auth';

// ---------------------------------------------------------------------------
// GET /api/cases/[id]/comments — list comments for a case
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the case belongs to the user's organization
    const vuln = await prisma.vulnerabilityCase.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });

    if (!vuln || vuln.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const order = searchParams.get('order') === 'newest' ? 'desc' : 'asc';

    const comments = await prisma.comment.findMany({
      where: { vulnerabilityCaseId: id, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: order },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('[API] GET /api/cases/[id]/comments error:', error);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/cases/[id]/comments — create a comment with @mentions
// ---------------------------------------------------------------------------

const MENTION_REGEX = /@([\w.+\-]+@[\w\-.]+\.\w+|[\w\s]+?)(?=\s|$|@)/g;

function parseMentions(content: string): string[] {
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    matches.push(match[1].trim());
  }
  return [...new Set(matches)];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body as { content: string };
    const userId = session.userId;

    if (!content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 },
      );
    }

    // Verify the case exists and belongs to the user's organization
    const vuln = await prisma.vulnerabilityCase.findUnique({
      where: { id },
      select: { id: true, title: true, organizationId: true },
    });

    if (!vuln || vuln.organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }

    // Parse @mentions from the comment body
    const mentionTerms = parseMentions(content);

    // Resolve mentioned users by email or name within the same org
    let mentionedUsers: Array<{ id: string; email: string; name: string }> = [];
    if (mentionTerms.length > 0) {
      mentionedUsers = await prisma.user.findMany({
        where: {
          organizationId: vuln.organizationId,
          deletedAt: null,
          OR: [
            { email: { in: mentionTerms } },
            { name: { in: mentionTerms } },
          ],
        },
        select: { id: true, email: true, name: true },
      });
    }

    // Get the commenting user's name
    const commentAuthor = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Create the comment and notifications in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comment = await prisma.$transaction(async (tx: any) => {
      const created = await tx.comment.create({
        data: {
          vulnerabilityCaseId: id,
          userId,
          content,
          mentions: mentionedUsers.map((u: any) => u.email),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create in-app notifications for mentioned users
      if (mentionedUsers.length > 0) {
        await tx.notification.createMany({
          data: mentionedUsers
            .filter((u) => u.id !== userId) // don't notify the author
            .map((u: any) => ({
              userId: u.id,
              type: 'mention',
              title: `${commentAuthor?.name ?? 'Someone'} mentioned you`,
              message: content.length > 200 ? content.slice(0, 200) + '...' : content,
              relatedEntityType: 'VulnerabilityCase',
              relatedEntityId: id,
            })),
        });
      }

      return created;
    });

    // Fire-and-forget email notifications (non-blocking)
    if (mentionedUsers.length > 0) {
      Promise.resolve().then(async () => {
        try {
          const { sendEmail, commentMentionTemplate } = await import(
            '@cveriskpilot/notifications'
          );
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const caseUrl = `${baseUrl}/cases/${id}`;
          const preview = content.length > 300 ? content.slice(0, 300) + '...' : content;

          for (const u of mentionedUsers.filter((m) => m.id !== userId)) {
            const html = commentMentionTemplate(
              commentAuthor?.name ?? 'Someone',
              vuln.title,
              preview,
              caseUrl,
            );
            await sendEmail({ to: u.email, subject: `You were mentioned on ${vuln.title}`, html });
          }
        } catch (emailErr) {
          console.error('[comments] Email notification failed:', emailErr);
        }
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/cases/[id]/comments error:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
