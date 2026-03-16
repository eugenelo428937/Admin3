// ExamSession entity type definitions
// Fields match Django REST Framework API response (snake_case)
// Note: start_date/end_date are DateTimeField in Django, returned as ISO strings

export interface ExamSession {
  id: number;
  session_code: string;
  start_date: string;
  end_date: string;
}

export interface ExamSessionInput {
  session_code: string;
  start_date: string;
  end_date: string;
}
