export interface Batch {
  id: string;
  name: string;
  code: string;
  departmentId?: string | null;
  departmentCode?: string;
  departmentName?: string;
  professorId?: string | null;
  professorName?: string;
  allowCrossDepartment: boolean;
  allowMultipleYears: boolean;
  allowedYears: number[];
  description?: string;
  memberCount?: number;
  createdAt?: string;
}

export interface CreateBatchDto {
  name: string;
  code: string;
  departmentId?: string;
  professorId?: string;
  allowCrossDepartment?: boolean;
  allowMultipleYears?: boolean;
  allowedYears?: number[];
  description?: string;
}

export interface BatchMember {
  batchId: string;
  studentId: string;
  studentName: string;
  email: string;
  enrollmentId?: string;
  departmentCode?: string;
  yearOfStudy?: number;
  enrolledAt: string;
}
