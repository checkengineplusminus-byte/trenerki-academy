import {createClient} from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {authRedirectState} from './authRedirect.mjs';
// Public, publishable browser credentials only. Authorization is enforced by Supabase RLS.
// Never add a service_role, Stripe secret, or Resend secret to frontend code.
const URL=process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://kcvvixcjuwglfvdpypzs.supabase.co';
const KEY=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_wpRp2JuWNW_WcjZdWXwIRQ_HfCPlxrj';
// Record recovery as soon as Supabase parses the one-time callback.
// Expo Router screens can mount AFTER PASSWORD_RECOVERY has been emitted.
const initialHash=Platform.OS==='web'&&typeof window!=='undefined'?window.location.hash||'':'';
const initialRedirect=authRedirectState(initialHash);
// The root page forwards callbacks to /konto. Let that destination consume the
// token once, rather than starting Auth here and replaying it after navigation.
const forwardCallback=initialRedirect.callback&&typeof window!=='undefined'&&window.location.pathname==='/';
let redirectError=initialRedirect.error?{code:initialRedirect.error,recovery:initialRedirect.recovery}:null;

export const supabase=createClient(URL,KEY,{auth:{
  storage: Platform.OS==='web' ? undefined : AsyncStorage,
  autoRefreshToken:true,
  persistSession:true,
  detectSessionInUrl:Platform.OS==='web'&&!forwardCallback
}});

let passwordRecoveryObserved=false;
const recoveryStorageKey='trenerki-password-recovery-user';
function recoveryUser(){
 try{return typeof window!=='undefined'?window.sessionStorage.getItem(recoveryStorageKey):null;}catch{return null;}
}
function rememberRecovery(userId:string|null){
 try{if(typeof window!=='undefined'){
  if(userId)window.sessionStorage.setItem(recoveryStorageKey,userId);
  else window.sessionStorage.removeItem(recoveryStorageKey);
 }}catch{/* Storage may be disabled; the in-memory flow still works. */}
}
export const getInitialAuthCallbackHash=()=>initialRedirect.callback?initialHash:'';
export const hasPasswordRecoveryCallback=()=>initialRedirect.recovery&&!initialRedirect.error;
export const getAuthRedirectError=()=>redirectError;
export const clearAuthRedirectError=()=>{redirectError=null;};
export const isPasswordRecoveryRedirect=()=>passwordRecoveryObserved;
export const clearPasswordRecoveryFlag=()=>{passwordRecoveryObserved=false;rememberRecovery(null);};
if(Platform.OS==='web'){
  supabase.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){
      passwordRecoveryObserved=true;rememberRecovery(session?.user?.id||null);
    }else if(event==='SIGNED_OUT')clearPasswordRecoveryFlag();
    else if((event==='SIGNED_IN'||event==='INITIAL_SESSION')&&session?.user){
      // A refresh may happen after Auth has removed the callback hash. Restore
      // only UI context for the same authenticated user, never authorization.
      passwordRecoveryObserved=recoveryUser()===session.user.id;
    }
  });
}
