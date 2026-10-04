type DbError = {
  code?: string;
  message?: string;
};

export function userFacingError(error: unknown) {
  const dbError = error as DbError;
  console.error(dbError?.code ?? "app_error", dbError?.message ?? error);

  switch (dbError?.code) {
    case "23505":
      return "ეს ჩანაწერი უკვე არსებობს.";
    case "23503":
      return "ჩანაწერი სხვა მონაცემებს უკავშირდება და წაშლა ვერ მოხერხდა.";
    case "23514":
      return "მონაცემები არასწორია. შეამოწმეთ ველები.";
    default:
      return "მოქმედება ვერ შესრულდა. სცადეთ ხელახლა.";
  }
}
