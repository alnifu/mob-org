import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these with your Supabase project credentials
const supabaseUrl = 'https://ojkpemczbgdmxjtdepch.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qa3BlbWN6YmdkbXhqdGRlcGNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUwNTA1ODAsImV4cCI6MjA2MDYyNjU4MH0.oeb9tmEnCoRAQbPrMmlHc6OD0QfmN7A85lbs02ZzDxU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
});   