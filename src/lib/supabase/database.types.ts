// docs/02_데이터설계.md 2장 · supabase/sql/001_tables.sql 기준으로 손으로 작성한 타입입니다.
// 테이블/컬럼을 바꾸면 SQL과 이 파일을 같이 고쳐주세요.
// (Supabase CLI가 프로젝트에 연결되면 `supabase gen types typescript`로 자동 생성본으로 바꿀 수 있습니다.)

export type CenterCategory =
  | "animal"
  | "environment"
  | "child"
  | "senior"
  | "disability"
  | "etc";

export type CenterStatus = "pending" | "approved" | "rejected" | "suspended";
export type CenterAgeCondition = "any" | "age14" | "age19" | "guardian";
export type CenterTag = "outdoor" | "animal" | "heavy" | "training";

export type CenterMemberRole = "owner" | "staff";
export type JoinRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ScheduleStatus = "active" | "paused" | "archived";
export type SessionStatus = "open" | "closed" | "cancelled" | "done";
export type ApplicationStatus = "confirmed" | "cancelled" | "attended" | "unconfirmed";
export type CancelledBy = "volunteer" | "center";
export type ReviewStatus = "visible" | "hidden";
export type ReviewReportResult = "pending" | "kept" | "hidden";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          nickname: string;
          avatar_url: string | null;
          is_admin: boolean;
          attended_count: number;
          unconfirmed_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          nickname: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          attended_count?: number;
          unconfirmed_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      centers: {
        Row: {
          id: string;
          name: string;
          category: CenterCategory;
          description: string | null;
          guide: string | null;
          region_sido: string | null;
          region_sigungu: string | null;
          address: string | null;
          contact_phone: string;
          image_url: string | null;
          cond_age: CenterAgeCondition;
          cond_tags: CenterTag[];
          cond_bring: string | null;
          cond_parking: boolean;
          has_insurance: boolean;
          status: CenterStatus;
          reject_reason: string | null;
          approved_at: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: CenterCategory;
          description?: string | null;
          guide?: string | null;
          region_sido?: string | null;
          region_sigungu?: string | null;
          address?: string | null;
          contact_phone: string;
          image_url?: string | null;
          cond_age?: CenterAgeCondition;
          cond_tags?: CenterTag[];
          cond_bring?: string | null;
          cond_parking?: boolean;
          has_insurance?: boolean;
          status?: CenterStatus;
          reject_reason?: string | null;
          approved_at?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["centers"]["Insert"]>;
        Relationships: [];
      };
      center_members: {
        Row: {
          id: string;
          center_id: string;
          profile_id: string;
          role: CenterMemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          profile_id: string;
          role: CenterMemberRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["center_members"]["Insert"]>;
        Relationships: [];
      };
      center_join_requests: {
        Row: {
          id: string;
          center_id: string;
          requester_id: string;
          message: string | null;
          status: JoinRequestStatus;
          handled_by: string | null;
          handled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          requester_id: string;
          message?: string | null;
          status?: JoinRequestStatus;
          handled_by?: string | null;
          handled_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["center_join_requests"]["Insert"]
        >;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          center_id: string;
          title: string;
          repeat_start_date: string;
          repeat_end_date: string;
          repeat_weekdays: number[];
          start_time: string;
          end_time: string;
          capacity: number;
          location_text: string | null;
          open_days_before: number;
          status: ScheduleStatus;
          created_by: string | null;
          updated_by: string | null;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          title: string;
          repeat_start_date: string;
          repeat_end_date: string;
          repeat_weekdays: number[];
          start_time: string;
          end_time: string;
          capacity: number;
          location_text?: string | null;
          open_days_before?: number;
          status?: ScheduleStatus;
          created_by?: string | null;
          updated_by?: string | null;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedules"]["Insert"]>;
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          schedule_id: string;
          center_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          capacity: number;
          location_text: string | null;
          open_days_before: number;
          confirmed_count: number;
          status: SessionStatus;
          cancel_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          schedule_id: string;
          center_id: string;
          session_date: string;
          start_time: string;
          end_time: string;
          capacity: number;
          location_text?: string | null;
          open_days_before?: number;
          confirmed_count?: number;
          status?: SessionStatus;
          cancel_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sessions"]["Insert"]>;
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          session_id: string;
          volunteer_id: string | null;
          status: ApplicationStatus;
          cancelled_by: CancelledBy | null;
          cancelled_by_member_id: string | null;
          attended_at: string | null;
          agreed_at: string | null;
          note: string | null;
          manual_name: string | null;
          manual_memo: string | null;
          created_by: string | null;
          applied_at: string;
          cancelled_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          volunteer_id?: string | null;
          status: ApplicationStatus;
          cancelled_by?: CancelledBy | null;
          cancelled_by_member_id?: string | null;
          attended_at?: string | null;
          agreed_at?: string | null;
          note?: string | null;
          manual_name?: string | null;
          manual_memo?: string | null;
          created_by?: string | null;
          applied_at?: string;
          cancelled_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          center_id: string;
          application_id: string;
          volunteer_id: string;
          title: string;
          content: string;
          images: string[];
          status: ReviewStatus;
          edited_at: string | null;
          deleted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          application_id: string;
          volunteer_id: string;
          title: string;
          content: string;
          images?: string[];
          status?: ReviewStatus;
          edited_at?: string | null;
          deleted_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
        Relationships: [];
      };
      review_reports: {
        Row: {
          id: string;
          review_id: string;
          reporter_id: string;
          reason: string;
          result: ReviewReportResult;
          handled_by: string | null;
          handled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          review_id: string;
          reporter_id: string;
          reason: string;
          result?: ReviewReportResult;
          handled_by?: string | null;
          handled_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["review_reports"]["Insert"]>;
        Relationships: [];
      };
      favorites: {
        Row: {
          id: string;
          center_id: string;
          volunteer_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          center_id: string;
          volunteer_id: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["favorites"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_nickname_taken: {
        Args: { p_nickname: string };
        Returns: boolean;
      };
      apply_to_session: {
        Args: { p_session_id: string };
        Returns: Database["public"]["Tables"]["applications"]["Row"];
      };
      cancel_application: {
        Args: { p_session_id: string };
        Returns: Database["public"]["Tables"]["applications"]["Row"];
      };
    };
  };
}
