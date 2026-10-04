import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export function UpcomingModule({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <EmptyState title="ეს განყოფილება ჯერ მზად არ არის" description={description} />
    </div>
  );
}
