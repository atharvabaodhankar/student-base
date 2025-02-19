import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gasgauunnlfqjdrkccjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdhc2dhdXVubmxmcWpkcmtjY2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4NDQ1MTUsImV4cCI6MjA1NTQyMDUxNX0.Nib9FZA85VKyPQhg8SBfyxy69WY49T9z4elTmIY2zsM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Initializing Supabase client with URL:', supabaseUrl);

export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      }
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in with Google:', error.message);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error.message);
    return { error };
  }
};

export const subscribeToAuthChanges = (callback) => {
  try {
    const subscription = supabase.auth.onAuthStateChange((event, session) => {
      // event can be: 'SIGNED_IN', 'SIGNED_OUT', 'TOKEN_REFRESHED', etc.
      callback(event, session);
    });
    return subscription;
  } catch (error) {
    console.error('Error subscribing to auth changes:', error.message);
    return null;
  }
};

export { supabase };