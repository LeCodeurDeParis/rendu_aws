export interface Team {
  id: number;
  name: string;
  cognito_sub: string;
  created_at: Date;
}

export interface TeamMember {
  id: number;
  team_id: number;
  cognito_sub: string;
  role: string;
  joined_at: Date;
}

export interface TeamInvitation {
  id: number;
  team_id: number;
  email: string;
  status: "pending" | "accepted" | "refused";
  invited_by_sub: string;
  created_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  team_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Task {
  id: number;
  name: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  project_id: number;
  assignee_sub: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskFile {
  id: number;
  task_id: number;
  file_name: string;
  s3_key: string;
  content_type: string;
  uploaded_by_sub: string;
  created_at: Date;
}

export interface Backup {
  id: number;
  file_name: string;
  s3_key: string;
  size: number;
  created_at: Date;
}

export interface CognitoUser {
  sub: string;
  email: string;
  name: string;
  role: string;
}
