import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { penaltyActionSchema, firstError } from "@/lib/validation";
import { redeemPenalty } from "@/lib/penalties";
import { buildAchievementContext, evaluateAchievements } from "@/lib/gamification";
import { dateToKey } from "@/lib/dates";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  const penalties = await prisma.penalty.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { date: "desc" }],
  });

  const pending = penalties.filter((p) => p.status === "PENDING");
  const totalRepDebt = pending.reduce((sum, p) => sum + p.repDebt, 0);

  return Response.json({
    penalties: penalties.map((p) => ({ ...p, date: dateToKey(p.date) })),
    summary: {
      pending: pending.length,
      totalRepDebt,
      redeemed: penalties.filter((p) => p.status === "REDEEMED").length,
    },
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const user = auth.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const parsed = penaltyActionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: firstError(parsed.error) }, { status: 400 });
  }

  const { penaltyId, action } = parsed.data;

  let penalty;
  if (action === "redeem") {
    penalty = await redeemPenalty(penaltyId, user.id);
  } else {
    penalty = await prisma.penalty.updateMany({
      where: { id: penaltyId, userId: user.id },
      data: { status: "WAIVED" },
    });
  }

  if (!penalty) {
    return Response.json({ error: "Penitencia no encontrada" }, { status: 404 });
  }

  const context = await buildAchievementContext(user.id);
  const unlockedAchievements = await evaluateAchievements(context);

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { points: true, level: true },
  });

  return Response.json({ ok: true, penalty, unlockedAchievements, user: updatedUser });
}