import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
const user={uid:'owner',email:'test@example.test',displayName:'Test',providerData:[{providerId:'password'},{providerId:'google.com'}]};
const auth={currentUser:user};let calls=[],hasReports=false,hasProfile=false,failure=null,changeSession=false;
const record=(name)=>(...args)=>{calls.push([name,...args]);if(failure===name)throw Object.assign(Error('private provider detail'),{code:'auth/invalid-credential'});if(name==='reauth' && changeSession)auth.currentUser={uid:'other'};return Promise.resolve();};
mock.module('../src/services/firebase.js',{namedExports:{auth,db:{}}});
mock.module('firebase/auth',{namedExports:{updateProfile:record('profile'),reload:record('reload'),sendEmailVerification:record('verify'),sendPasswordResetEmail:record('reset'),updatePassword:record('password'),reauthenticateWithCredential:record('reauth'),reauthenticateWithPopup:record('google'),EmailAuthProvider:{credential:(email,password)=>({email,password})},GoogleAuthProvider:class {},deleteUser:record('delete')}});
mock.module('firebase/firestore',{namedExports:{collection:(_db,...parts)=>parts,doc:(_db,...parts)=>parts,query:(path,...constraints)=>({path,constraints}),limit:n=>n,getDocsFromServer:async query=>{calls.push(['reports',query]);if(failure==='reports')throw Error('Offline');return {empty:!hasReports};},getDocFromServer:async path=>{calls.push(['profileRead',path]);return {exists:()=>hasProfile};}}});
const account=await import('../src/services/account.js');
function reset(){calls=[];hasReports=false;hasProfile=false;failure=null;changeSession=false;auth.currentUser=user;}
test('provider capabilities distinguish Google-only from password and linked accounts',()=>{
 assert.deepEqual(account.accountProviders({providerData:[{providerId:'google.com'}]}),{google:true,password:false});assert.deepEqual(account.accountProviders(user),{google:true,password:true});
});
test('profile validates owner/name and only updates approved profile fields',async()=>{
 reset();await account.saveAccountProfile(user,' Operator ',true);assert.deepEqual(calls[0],['profile',user,{displayName:'Operator',photoURL:null}]);await assert.rejects(account.saveAccountProfile(user,' '));auth.currentUser=null;await assert.rejects(account.saveAccountProfile(user,'Operator'));
});
test('password requires matching values and successful reauthentication before change',async()=>{
 reset();await assert.rejects(account.changeAccountPassword(user,'current','new-password','different'));assert.equal(calls.length,0);
 await account.changeAccountPassword(user,'current','new-password','new-password');assert.deepEqual(calls.map(item=>item[0]),['reauth','password']);
 reset();failure='reauth';await assert.rejects(account.changeAccountPassword(user,'wrong','new-password','new-password'));assert.ok(!calls.some(item=>item[0]==='password'));
});
test('Google-only password change is blocked and Google reauth uses popup',async()=>{
 reset();const google={...user,providerData:[{providerId:'google.com'}]};await assert.rejects(account.changeAccountPassword(google,'x','new-password','new-password'));await account.reauthenticateAccount(google,'google');assert.equal(calls[0][0],'google');
});
test('session switch during verification prevents subsequent mutations',async()=>{
 reset();changeSession=true;await assert.rejects(account.changeAccountPassword(user,'current','new-password','new-password'));assert.ok(!calls.some(item=>item[0]==='password'));
});
test('deletion requires explicit confirmation and blocks nonempty account without deleting data',async()=>{
 reset();await assert.rejects(account.deleteEmptyAccount(user,{confirmation:'',method:'password',password:'x'}));assert.equal(calls.length,0);
 hasReports=true;await assert.rejects(account.deleteEmptyAccount(user,{confirmation:'DELETE',method:'password',password:'x'}),/Saved investigations remain/);assert.ok(!calls.some(item=>item[0]==='delete'));
 reset();hasProfile=true;await assert.rejects(account.deleteEmptyAccount(user,{confirmation:'DELETE',method:'password',password:'x'}),/Workspace profile data remains/);assert.ok(!calls.some(item=>item[0]==='delete'));
});
test('offline server read blocks account deletion',async()=>{
 reset();failure='reports';await assert.rejects(account.deleteEmptyAccount(user,{confirmation:'DELETE',method:'password',password:'x'}));assert.ok(!calls.some(item=>item[0]==='delete'));
});
test('empty account deletion reads owner data from server after reauth then deletes auth only',async()=>{
 reset();await account.deleteEmptyAccount(user,{confirmation:'DELETE',method:'password',password:'x'});assert.deepEqual(calls.map(item=>item[0]),['reauth','reports','profileRead','delete']);assert.deepEqual(calls[1][1],{path:['users','owner','investigations'],constraints:[1]});assert.deepEqual(calls[2][1],['users','owner']);
});
test('verification and reset validate input and use supported APIs',async()=>{
 reset();await account.verifyEmail(user);await account.resetAccountPassword(' test@example.test ');assert.equal(calls[0][0],'verify');assert.deepEqual(calls[1],['reset',auth,'test@example.test']);await assert.rejects(account.verifyEmail({...user,emailVerified:true}));await assert.rejects(account.resetAccountPassword('invalid'));
});
test('user-facing error mapping never exposes raw provider details',()=>{assert.match(account.accountError({code:'auth/popup-closed-by-user'}),/cancelled/);assert.match(account.accountError({code:'auth/requires-recent-login'}),/verify your identity/);assert.ok(!account.accountError(Error('SECRET')).includes('SECRET'));});
