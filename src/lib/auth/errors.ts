import type { AuthError } from "@supabase/supabase-js";

export function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "ელფოსტა ან პაროლი არასწორია.";
    case "email_not_confirmed":
      return "ელფოსტა ჯერ არ არის დადასტურებული.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "ძალიან ბევრი მცდელობაა. სცადეთ მოგვიანებით.";
    case "weak_password":
      return "პაროლი ძალიან სუსტია. გამოიყენეთ მინიმუმ 8 სიმბოლო.";
    case "same_password":
      return "ახალი პაროლი უნდა განსხვავდებოდეს ძველისგან.";
    default:
      return "მოქმედება ვერ შესრულდა. სცადეთ ხელახლა.";
  }
}

export const supabaseNotConfiguredMessage =
  "სისტემა ჯერ არ არის დაკავშირებული. შეავსეთ Supabase-ის გარემოს ცვლადები.";
