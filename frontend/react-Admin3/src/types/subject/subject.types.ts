// Subject entity type definitions
// Fields match Django REST Framework API response (snake_case)

export interface Subject {
  id: number;
  code: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubjectInput {
  code: string;
  description: string;
  active: boolean;
}

export interface BulkImportResponse {
  imported: number;
  errors: string[];
}
