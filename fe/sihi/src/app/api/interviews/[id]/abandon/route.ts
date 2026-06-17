import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const interview = await prisma.interview.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true, status: true },
  });

  if (!interview)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (interview.userId !== session.user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Only abandon if not already finished
  const finalStatuses = ["COMPLETED", "CANCELLED", "ABANDONED"];
  if (finalStatuses.includes(interview.status)) {
    return NextResponse.json({ message: "Already finished", status: interview.status });
  }

  const updated = await prisma.interview.update({
    where: { id: params.id },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: "ABANDONED" as any,
      endedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  return NextResponse.json(updated);
}
