export type Guest = {
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
  // Couple
  is_couple: boolean;
  partner_first_name: string;
  partner_last_name: string;
  partner_post_name: string;
  partner_phone: string;
  partner_gender: 'male' | 'female';
};

export type CountdownTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};
