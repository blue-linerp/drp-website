import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/session";
import { parseQuestions } from "@/lib/questions";
import { TypeEditor, type TypeForm } from "@/components/admin/type-editor";


export default async function TypeEditPage({ params }: { params: { id: string } }) {
  await requireStaffPage("types.manage");
  let initial: TypeForm;
  if (params.id === "new") {
    initial = {
      slug: "",
      title: "",
      category: "SPECIAL",
      department: "",
      description: "",
      icon: "file-text",
      isOpen: false,
      opensAt: "",
      closesAt: "",
      minAge: "",
      minDiscordAgeDays: 30,
      requiredRoleIds: "",
      requiresWhitelist: true,
      grantRoleId: "",
      grantsWhitelist: false,
      cooldownDays: 14,
      webhookUrl: "",
      questions: [{ id: "agree_rules", type: "agree_rules", label: "I have read and agree to the server rules.", required: true, section: "Final check" }],
    };
  } else {
    const t = await db.applicationType.findUnique({ where: { id: params.id } });
    if (!t) notFound();
    initial = {
      id: t.id,
      slug: t.slug,
      title: t.title,
      category: t.category,
      department: t.department ?? "",
      description: t.description,
      icon: t.icon,
      isOpen: t.isOpen,
      opensAt: t.opensAt?.toISOString() ?? "",
      closesAt: t.closesAt?.toISOString() ?? "",
      minAge: t.minAge?.toString() ?? "",
      minDiscordAgeDays: t.minDiscordAgeDays,
      requiredRoleIds: t.requiredRoleIds.join(", "),
      requiresWhitelist: t.requiresWhitelist,
      grantRoleId: t.grantRoleId ?? "",
      grantsWhitelist: t.grantsWhitelist,
      cooldownDays: t.cooldownDays,
      webhookUrl: t.webhookUrl ?? "",
      questions: parseQuestions(t.questions),
    };
  }
  return <TypeEditor initial={initial} />;
}
