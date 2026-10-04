export type Department = {
  id: string;
  name: string;
  color_token: string;
  sort_order: number;
};

export type Position = {
  id: string;
  department_id: string;
  name: string;
  sort_order: number;
};

export type Employee = {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  department_id: string | null;
  position_id: string | null;
  is_active: boolean;
  notes: string | null;
  department: Pick<Department, "id" | "name" | "color_token"> | null;
  position: Pick<Position, "id" | "name"> | null;
};

export type ShiftStatus = "draft" | "published" | "cancelled";
export type RequestStatus = "pending" | "approved" | "rejected";
export type SwapStatus =
  | "pending_peer"
  | "peer_rejected"
  | "pending_manager"
  | "approved"
  | "rejected";
export type AttendanceStatus = "present" | "late" | "absent" | "day_off" | "vacation";

export type ShiftRow = {
  id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: ShiftStatus;
  employee: { id: string; first_name: string; last_name: string } | null;
  position: { name: string } | null;
  department: { name: string; color_token: string } | null;
};

export type AvailabilityRow = {
  id: string;
  employee_id: string;
  day_of_week: number;
  is_unavailable: boolean;
  start_time: string | null;
  end_time: string | null;
};

export type TimeOffRow = {
  id: string;
  employee_id: string;
  request_date: string;
  reason: string | null;
  status: RequestStatus;
  created_at: string;
  employee?: { first_name: string; last_name: string } | null;
};

export type VacationRow = {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  status: RequestStatus;
  created_at: string;
  employee?: { first_name: string; last_name: string } | null;
};

export type SwapRow = {
  id: string;
  status: SwapStatus;
  created_at: string;
  requester: { first_name: string; last_name: string } | null;
  target: { first_name: string; last_name: string } | null;
};
