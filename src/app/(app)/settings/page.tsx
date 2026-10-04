import { SettingsManager } from "@/components/settings/settings-manager";
import { requireAdmin } from "@/lib/auth/context";
import { listDepartments, listPositions } from "@/lib/data/directory";

export const metadata = {
  title: "პარამეტრები",
};

export default async function SettingsPage() {
  const context = await requireAdmin();
  const [departmentsResult, positionsResult] = await Promise.all([listDepartments(), listPositions()]);

  return (
    <SettingsManager
      restaurantName={context.restaurantName}
      departments={departmentsResult.departments}
      positions={positionsResult.positions}
      error={departmentsResult.error || positionsResult.error}
    />
  );
}
