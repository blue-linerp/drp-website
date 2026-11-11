import { requireStaffPage } from "@/lib/session";
import { can } from "@/lib/permissions";
import { getSetting } from "@/lib/settings";
import { SettingsForms } from "@/components/admin/settings-forms";

export default async function SettingsPage() {
  const user = await requireStaffPage("content.manage");
  const [announcement, maintenance, home, rulesMeta, creatorsMeta] = await Promise.all([
    getSetting("announcement"),
    getSetting("maintenance"),
    getSetting("home"),
    getSetting("rulesMeta"),
    getSetting("creatorsMeta"),
  ]);
  return (
    <div>
      <h1 className="text-5xl">Site settings.</h1>
      <SettingsForms
        canSite={can(user.access, "settings.manage")}
        initial={{ announcement, maintenance, home, rulesMeta, creatorsMeta }}
      />
    </div>
  );
}
