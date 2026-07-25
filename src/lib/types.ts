// Tipos de dominio — reflejan el esquema de la base de datos.

export type Role = "admin" | "member";
export type UserStatus = "active" | "inactive";

export type PostStatus = "draft" | "scheduled" | "active" | "finished";

export type AssignmentStatus =
  | "scheduled" // programada (antes de la hora)
  | "available" // disponible (llegó la hora)
  | "completed" // completada (ambas plataformas a tiempo)
  | "completed_late" // completada fuera de tiempo
  | "missed" // vencida
  | "justified" // ausencia justificada
  | "in_review"; // en revisión (uso manual del admin)

export type Platform = "instagram" | "tiktok";

export type CompletionStatus = "on_time" | "late";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  title: string;
  description: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  requested_actions: string[]; // acciones solicitadas (solo instrucciones)
  publication_datetime: string; // timestamptz (UTC)
  interval_minutes: number;
  completion_window_minutes: number;
  status: PostStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  post_id: string;
  user_id: string;
  assigned_datetime: string; // timestamptz (UTC)
  deadline_datetime: string; // timestamptz (UTC)
  rotation_position: number; // 0-based
  status: AssignmentStatus;
  justified: boolean;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  assignment_id: string;
  platform: Platform;
  link_opened_at: string | null;
  completed_at: string | null;
  completion_status: CompletionStatus | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface RotationState {
  id: number;
  last_starting_user_id: string | null;
  last_rotation_index: number;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}
