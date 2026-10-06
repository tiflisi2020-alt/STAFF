import { cn } from "cn";

const labels: Record<string, string> = {
  pending: "მოლოდინში",
  approved: "დამტკიცებული",
  rejected: "უარყოფილი",
  pending_peer: "მოლოდინში",
  peer_rejected: "უარყოფილი",
  pending_manager: "მენეჯერთან",
  draft: "დრაფტი",
  published: "გამოქვეყნებული",
  cancelled: "გაუქმებული",
  present: "დასწრებული",
  late: "დაგვიანებული",
  absent: "არ გამოცხადდა",
  day_off: "დასვენება",
  vacation: "შვებულება",
  active: "აქტიური",
  inactive: "არააქტიური",
};

function toneFor(status: string) {
  if (["approved", "published", "present", "active"].includes(status)) {
    return "bg-primary/10 text-primary";
  }
  if (["rejected", "peer_rejected", "cancelled", "absent"].includes(status)) {
    return "bg-destructive/10 text-destructive";
  }
  if (["pending", "pending_peer", "pending_manager", "late", "draft"].includes(status)) {
    return "bg-warning text-warning-foreground";
  }
  return "bg-muted text-muted-foreground";
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-lg px-2 text-xs font-medium whitespace-nowrap", toneFor(status))}>
      {labels[status] ?? status}
    </span>
  );
}

export function statusText(status: string) {
  return labels[status] ?? status;
}
