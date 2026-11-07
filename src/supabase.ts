import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
// Public, publishable browser credentials only. Authorization is enforced by Supabase RLS.
// Never add a service_role, Stripe secret, or Resend secret to frontend code.
const URL=process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kcvvixcjuwglfvdpypzs.supabase.co';
const KEY=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wpRp2JuWNW_WcjZdWXwIRQ_HfCPlxrj';
export const supabase=createClient(URL,KEY,{auth:{
  storage: Platform.OS==='web' ? undefined : AsyncStorage,
  autoRefreshToken:true,
  persistSession:true,
  detectSessionInUrl:Platform.OS==='web'
}});
