import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for our database tables
export interface Analyst {
  analyst_id: number;
  first_initial: string;
  last_name: string;
  first_initial_last_name: string;
  full_name: string;
  Linkedin: string;
}

export interface LinkedInInfo {
  analyst_id: number;
  full_name: string;
  city: string;
  country_code: string;
  about: string;
  current_company_name: string;
  experience: string;
  Linkedin: string;
  educations_details: string;
  languages: string;
  certifications: string;
  recommendations: string;
  followers: number;
  connections: number;
  activity: string;
  honors_and_awards: string;
  default_avatar: string;
}

export interface Prediction {
  prediction_id: number;
  analyst_id: number;
  company_id: number;
  ticker: string;
  cname: string;
  cusip: string;
  anndats: string;
  anntims: string;
  estimid: string;
  horizon: string;
  value: number;
  curr: string;
  alysnam: string;
}

export interface EarningsQuestion {
  question_id: number;
  analyst_id: number;
  company_id: number;
  ticker: string;
  mostimportantdateutc: string;
  full_name: string;
  componenttextpreview: string;
  word_count: number;
}

export interface SecurityPrice {
  price_id: number;
  cusip: string;
  permno: number;
  date: string;
  ticker: string;
  conm: string;
  prc: number;
}
