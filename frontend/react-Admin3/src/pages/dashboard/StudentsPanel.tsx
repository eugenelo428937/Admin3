import { useEffect, useState } from "react";
import studentService, {
  StudentListItem,
} from "../../services/studentService";
import { DashboardPanel } from "./DashboardPanel";
import { AsyncCombobox } from "@/components/admin/ui/async-combobox";
import { fetchStudentOptions } from "./studentOptions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin/ui/table";

interface StudentsPanelProps {
  className?: string;
  pageSize?: number;
}

export function StudentsPanel({ className, pageSize = 5 }: StudentsPanelProps) {
  const [studentRef, setStudentRef] = useState<string>("");
  const [studentLabel, setStudentLabel] = useState<string>("");
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    studentService
      .list({
        ref: studentRef || undefined,
        page: 1,
        page_size: pageSize,
        ordering: "-modified_date",
      })
      .then((res) => setStudents(res.results))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [studentRef, pageSize]);

  return (
    <DashboardPanel
      title="Students"
      viewAllHref="/admin/students"
      className={className}
      search={
        <div className="tw:w-72">
          <AsyncCombobox
            value={studentRef}
            selectedLabel={studentLabel || undefined}
            onValueChange={(val, opt) => {
              setStudentRef(val);
              setStudentLabel(opt?.label ?? "");
            }}
            fetchOptions={fetchStudentOptions}
            placeholder="All students"
            searchPlaceholder="Ref, name, or email..."
            emptyMessage="No students found."
          />
        </div>
      }
    >
      {loading ? (
        <div className="tw:px-[18px] tw:py-3 tw:text-xs tw:text-muted-foreground">
          Loading...
        </div>
      ) : students.length === 0 ? (
        <div className="tw:px-[18px] tw:py-3 tw:text-xs tw:text-muted-foreground">
          No students found.
        </div>
      ) : (
        <div className="tw:px-[18px] tw:pb-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="tw:h-8">Ref</TableHead>
                <TableHead className="tw:h-8">Name</TableHead>
                <TableHead className="tw:h-8">Email</TableHead>
                <TableHead className="tw:h-8">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.student_ref}>
                  <TableCell className="tw:py-2 tw:text-xs tw:font-mono">
                    {s.student_ref}
                  </TableCell>
                  <TableCell className="tw:py-2 tw:text-xs">
                    {s.first_name} {s.last_name}
                  </TableCell>
                  <TableCell className="tw:py-2 tw:text-xs tw:truncate tw:max-w-[200px]">
                    {s.email}
                  </TableCell>
                  <TableCell className="tw:py-2 tw:text-xs">
                    {s.student_type}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DashboardPanel>
  );
}
