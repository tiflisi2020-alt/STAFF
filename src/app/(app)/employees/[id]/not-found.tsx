import Link from "next/link";

export default function EmployeeNotFound() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">თანამშრომელი ვერ მოიძებნა</h1>
      <Link href="/employees" className="text-sm text-primary">
        სიაში დაბრუნება
      </Link>
    </div>
  );
}
