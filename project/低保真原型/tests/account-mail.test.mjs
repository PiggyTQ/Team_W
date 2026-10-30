import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createAccountMail,mailTransportFromEnvironment} from '../server/account-mail.mjs';
function fixture(){const db=new DatabaseSync(':memory:');db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,password_hash TEXT);CREATE TABLE sessions(token_hash TEXT,user_id TEXT REFERENCES users(id) ON DELETE CASCADE);INSERT INTO users VALUES('a','a@example.invalid','scrypt$old');INSERT INTO sessions VALUES('session','a');");return db;}
test('mail defaults closed; encrypted durable delivery; tokens are one-time, expire and bind to current credentials',async()=>{
 const db=fixture();let now=0;const sent=[],mail=createAccountMail({db,origin:'https://career.test',send:async x=>sent.push(x),key:'ab'.repeat(32),now:()=>now});
 try{
 assert.equal(mailTransportFromEnvironment({}),null);assert.throws(()=>createAccountMail({db,origin:'https://career.test',send:()=>{}}),/KEY_REQUIRED/);
 assert.deepEqual(mail.request('nobody@example.invalid','reset'),mail.request('a@example.invalid','reset'));
 await mail.deliver();assert.equal(sent.length,1);const token=sent[0].url.split('=')[1];assert.equal(mail.peek(token,'reset').user_id,'a');
 mail.consume(token,'reset',{passwordHash:'scrypt$new'});assert.equal(db.prepare('SELECT count(*) n FROM sessions').get().n,0);assert.throws(()=>mail.peek(token,'reset'));
 mail.request('a@example.invalid','verify');await mail.deliver();const verification=sent.at(-1).url.split('=')[1];mail.consume(verification,'verify');assert.equal(mail.verified('a'),true);assert.throws(()=>mail.consume(verification,'verify'));
 mail.request('a@example.invalid','reset');await mail.deliver();const expired=sent.at(-1).url.split('=')[1];now=15*60000;assert.throws(()=>mail.peek(expired,'reset'));mail.cleanup();assert.equal(db.prepare('SELECT count(*) n FROM account_mail_tokens').get().n,0);
 }finally{mail.stop();db.close();}
});
test('a superseded queued link is discarded without delivery or a provider-failure alarm',async()=>{
 const db=fixture(),sent=[],mail=createAccountMail({db,origin:'https://career.test',key:'ab'.repeat(32),send:async m=>sent.push(m)});
 try{mail.request('a@example.invalid','reset');mail.request('a@example.invalid','reset');await mail.deliver();assert.equal(sent.length,1);assert.equal(mail.status().queued,0);assert.equal(mail.status().failed,0);}
 finally{mail.stop();db.close();}
});
test('delivery retries are bounded; token bodies and URLs are encrypted at rest; account deletion cascades',async()=>{
 const db=fixture();let now=0;const mail=createAccountMail({db,origin:'https://career.test',key:'cd'.repeat(32),send:async()=>{throw Error('provider secret');},now:()=>now});
 try{mail.request('a@example.invalid','reset');let row=db.prepare('SELECT * FROM account_mail_outbox').get();assert.doesNotMatch(row.ciphertext,/example|auth|reset|https/);
 for(let i=0;i<4;i++){await mail.deliver();now+=180000;}assert.equal(mail.status().failed,1);assert.equal(db.prepare('SELECT attempts FROM account_mail_outbox').get().attempts,3);
 db.prepare("DELETE FROM users WHERE id='a'").run();assert.equal(db.prepare('SELECT count(*) n FROM account_mail_tokens').get().n,0);assert.equal(mail.status().queued,0);
 }finally{mail.stop();db.close();}
});
