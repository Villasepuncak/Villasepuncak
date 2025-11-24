// Replace with your Supabase project credentials
const SUPABASE_URL = 'https://icwwtbkxfxiejgbzvtzo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imljd3d0Ymt4ZnhpZWpnYnp2dHpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MTg3MjIsImV4cCI6MjA3OTM5NDcyMn0.UbxHq4yPiXVbQpKHKsKsubibOMYpLJixZ7cPK3iPN-E';

// Global Supabase client
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
