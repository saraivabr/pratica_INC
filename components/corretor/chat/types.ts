export interface Message {
  id: number;
  message_id: string;
  phone_number: string;
  message_text: string;
  message_type: string;
  media_url?: string;
  caption?: string;
  mimetype?: string;
  is_from_me: boolean;
  timestamp: string;
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  contact_name?: string;
  raw_data?: any;
}

export interface Conversation {
  phone_number: string;
  contact_name: string;
  profile_picture_url?: string;
  last_message: string;
  last_message_type?: string;
  last_message_time: string;
  is_from_me: boolean;
  unread_count: number;
  lead_id?: number;
  is_lead?: boolean;
  ai_summary?: string | null;
  ai_sentiment?: string | null;
  ai_temperature?: string | null;
}

export interface SearchResult {
  phone_number: string;
  contact_name: string;
  last_message?: string;
  last_message_time?: string;
  is_from_me?: boolean;
}
