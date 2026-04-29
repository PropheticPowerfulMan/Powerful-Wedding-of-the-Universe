export interface Database {
  public: {
    Tables: {
      guests: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          post_name: string;
          invitation_status: 'pending' | 'sent' | 'confirmed';
          rsvp_status: 'pending' | 'attending' | 'not_attending' | 'maybe';
          rsvp_message: string;
          rsvp_contact_email: string;
          rsvp_contact_phone: string;
          meal_preference: string;
          number_of_guests: number;
          group_name: string;
          notes: string;
          created_at: string;
          updated_at: string;
          person_type: 'family' | 'friends' | 'work';
          phone: string;
          gender: 'male' | 'female';
          download_count: number;
          is_couple: boolean;
          partner_first_name: string;
          partner_last_name: string;
          partner_post_name: string;
          partner_phone: string;
          partner_gender: 'male' | 'female';
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          post_name?: string;
          invitation_status?: 'pending' | 'sent' | 'confirmed';
          rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'maybe';
          rsvp_message?: string;
          rsvp_contact_email?: string;
          rsvp_contact_phone?: string;
          meal_preference?: string;
          number_of_guests?: number;
          group_name?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
          person_type?: 'family' | 'friends' | 'work';
          phone?: string;
          gender?: 'male' | 'female';
          download_count?: number;
          is_couple?: boolean;
          partner_first_name?: string;
          partner_last_name?: string;
          partner_post_name?: string;
          partner_phone?: string;
          partner_gender?: 'male' | 'female';
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          post_name?: string;
          invitation_status?: 'pending' | 'sent' | 'confirmed';
          rsvp_status?: 'pending' | 'attending' | 'not_attending' | 'maybe';
          rsvp_message?: string;
          rsvp_contact_email?: string;
          rsvp_contact_phone?: string;
          meal_preference?: string;
          number_of_guests?: number;
          group_name?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
          person_type?: 'family' | 'friends' | 'work';
          phone?: string;
          gender?: 'male' | 'female';
          download_count?: number;
          is_couple?: boolean;
          partner_first_name?: string;
          partner_last_name?: string;
          partner_post_name?: string;
          partner_phone?: string;
          partner_gender?: 'male' | 'female';
        };
        Relationships: [];
      };
      message_dispatch_logs: {
        Row: {
          id: number;
          created_at: string;
          source_function: string;
          event_type: string;
          channel: 'email' | 'whatsapp' | 'sms';
          recipient_type: 'guest' | 'host' | 'admin' | 'unknown';
          guest_id: string | null;
          guest_name: string | null;
          target: string | null;
          status: 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped';
          dry_run: boolean;
          provider: string | null;
          error_message: string | null;
          provider_message_id: string | null;
          provider_status: string | null;
          provider_status_detail: string | null;
          provider_updated_at: string | null;
          delivered_at: string | null;
          provider_payload: Record<string, unknown> | null;
          metadata: Record<string, unknown>;
        };
        Insert: {
          id?: number;
          created_at?: string;
          source_function: string;
          event_type: string;
          channel: 'email' | 'whatsapp' | 'sms';
          recipient_type?: 'guest' | 'host' | 'admin' | 'unknown';
          guest_id?: string | null;
          guest_name?: string | null;
          target?: string | null;
          status: 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped';
          dry_run?: boolean;
          provider?: string | null;
          error_message?: string | null;
          provider_message_id?: string | null;
          provider_status?: string | null;
          provider_status_detail?: string | null;
          provider_updated_at?: string | null;
          delivered_at?: string | null;
          provider_payload?: Record<string, unknown> | null;
          metadata?: Record<string, unknown>;
        };
        Update: {
          id?: number;
          created_at?: string;
          source_function?: string;
          event_type?: string;
          channel?: 'email' | 'whatsapp' | 'sms';
          recipient_type?: 'guest' | 'host' | 'admin' | 'unknown';
          guest_id?: string | null;
          guest_name?: string | null;
          target?: string | null;
          status?: 'eligible' | 'sent' | 'delivered' | 'failed' | 'skipped';
          dry_run?: boolean;
          provider?: string | null;
          error_message?: string | null;
          provider_message_id?: string | null;
          provider_status?: string | null;
          provider_status_detail?: string | null;
          provider_updated_at?: string | null;
          delivered_at?: string | null;
          provider_payload?: Record<string, unknown> | null;
          metadata?: Record<string, unknown>;
        };
        Relationships: [
          {
            foreignKeyName: 'message_dispatch_logs_guest_id_fkey';
            columns: ['guest_id'];
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
