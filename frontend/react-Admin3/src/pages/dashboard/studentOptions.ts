import studentService, { StudentListItem } from "../../services/studentService";
import type { AsyncOption } from "@/components/admin/ui/async-combobox";

/**
 * Fetcher for AsyncCombobox that searches students by ref/name/email/phone.
 * The combobox value is `student_ref` (numeric, stable identifier).
 */
export const fetchStudentOptions = async (
  query: string,
): Promise<AsyncOption[]> => {
  const params: { page_size: number; search?: string } = { page_size: 20 };
  if (query) params.search = query;
  const res = await studentService.list(params);
  return res.results.map((s: StudentListItem) => ({
    value: String(s.student_ref),
    label: `${s.student_ref} — ${s.first_name} ${s.last_name}`,
  }));
};
