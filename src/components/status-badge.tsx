import { Badge } from "@/components/ui/badge";

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

function variantFor(status: string) {
  if (["approved", "published", "present", "active"].includes(status)) {
    return "default" as const;
  }
  if (["rejected", "peer_rejected", "cancelled", "absent"].includes(status)) {
    return "destructive" as const;
  }
  if (["pending", "pending_peer", "pending_manager", "late", "draft"].includes(status)) {
    return "secondary" as const;
  }
  return "outline" as const;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={variantFor(status)}>{labels[status] ?? status}</Badge>;
}

export function statusText(status: string) {
  return labels[status] ?? status;
}
