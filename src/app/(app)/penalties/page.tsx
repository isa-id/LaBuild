import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateToKey } from "@/lib/dates";
import PenaltiesClient from "./PenaltiesClient";

export const dynamic = "force-dynamic";

export default async function PenaltiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const penalties = await prisma.penalty.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { date: "desc" }],
  });

  const pending = penalties.filter((p) => p.status === "PENDING");
  const totalRepDebt = pending.reduce((s, p) => s + p.repDebt, 0);

  return (
    <PenaltiesClient
      penalties={penalties.map((p) => ({
        id: p.id,
        date: dateToKey(p.date),
        status: p.status,
        title: p.title,
        detail: p.detail,
        repDebt: p.repDebt,
        pointsPenalty: p.pointsPenalty,
      }))}
      summary={{
        pending: pending.length,
        totalRepDebt,
        redeemed: penalties.filter((p) => p.status === "REDEEMED").length,
      }}
    />
  );
}