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

// Record recovery as soon as Supabase parses the one-time callback.
// Expo Router screens can mount AFTER PASSWORD_RECOVERY has been emitted.
const initialRecoveryHash = Platform.OS==='web' && typeof window!=='undefined' &&
  new URLSearchParams((window.location.hash||'').replace(/^#/, '')).get('type')==='recovery'
  ? window.location.hash : '';
let passwordRecoveryObserved=false;
export const getInitialRecoveryHash=()=>initialRecoveryHash;
export const isPasswordRecoveryRedirect=()=>passwordRecoveryObserved;
export const clearPasswordRecoveryFlag=()=>{passwordRecoveryObserved=false;};
if(Platform.OS==='web'){
  supabase.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY')passwordRecoveryObserved=true;
  });
}
