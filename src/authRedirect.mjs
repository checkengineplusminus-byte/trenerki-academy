// Callback fragments are untrusted. Keep only an authored error category for UI;
// a recovery hint never authorizes changing a password without a valid session.
export function authRedirectState(hash=''){
 const params=new URLSearchParams(String(hash).replace(/^#/,''));
 const recovery=params.get('type')==='recovery';
 if(params.has('error')||params.has('error_code')||params.has('error_description')){
  return {callback:true,recovery,error:params.get('error_code')==='otp_expired'||params.get('error')==='otp_expired'?'otp_expired':'invalid_link'};
 }
 return {callback:recovery||!!params.get('access_token'),recovery,error:null};
}
