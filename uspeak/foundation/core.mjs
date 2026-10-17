import {DatabaseSync} from 'node:sqlite';
import {randomUUID,createHash} from 'node:crypto';
export class Foundation {
 constructor(path=':memory:') {
  this.db=new DatabaseSync(path);
  this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
  CREATE TABLE IF NOT EXISTS posts(id TEXT PRIMARY KEY,body TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,approved_revision INTEGER,status TEXT NOT NULL DEFAULT 'draft');
  CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,post_id TEXT NOT NULL REFERENCES posts(id),revision INTEGER NOT NULL,channel TEXT NOT NULL,due INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'queued',UNIQUE(post_id,revision,channel));
  CREATE TABLE IF NOT EXISTS receipts(job_id TEXT PRIMARY KEY REFERENCES jobs(id),provider TEXT NOT NULL,external_id TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT NOT NULL,actor TEXT NOT NULL,event TEXT NOT NULL,entity TEXT NOT NULL);`);
 }
 log(actor,event,entity){if(!actor)throw Error('actor required');this.db.prepare('INSERT INTO audit(at,actor,event,entity) VALUES(?,?,?,?)').run(new Date().toISOString(),actor,event,entity)}
 tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r}catch(e){this.db.exec('ROLLBACK');throw e}}
 get(id){const p=this.db.prepare('SELECT * FROM posts WHERE id=?').get(id);if(!p)throw Error('post not found');return p}
 create(body,actor){if(typeof body!=='string'||!body.trim()||body.length>50000)throw Error('invalid body');return this.tx(()=>{const id=randomUUID();this.db.prepare('INSERT INTO posts(id,body) VALUES(?,?)').run(id,body);this.log(actor,'draft.created',id);return this.get(id)})}
 revise(id,body,actor){if(typeof body!=='string'||!body.trim()||body.length>50000)throw Error('invalid body');return this.tx(()=>{this.get(id);this.db.prepare("UPDATE posts SET body=?,revision=revision+1,approved_revision=NULL,status='draft' WHERE id=?").run(body,id);this.db.prepare("UPDATE jobs SET state='canceled' WHERE post_id=? AND state='queued'").run(id);this.log(actor,'approval.invalidated',id);return this.get(id)})}
 approve(id,revision,actor){return this.tx(()=>{const p=this.get(id);if(p.revision!==revision)throw Error('stale approval');this.db.prepare("UPDATE posts SET approved_revision=revision,status='approved' WHERE id=?").run(id);this.log(actor,'post.approved',id);return this.get(id)})}
 schedule(id,channel,iso,actor){if(typeof iso!=='string'||!/(Z|[+-]\d\d:\d\d)$/.test(iso))throw Error('explicit timezone required');const due=Date.parse(iso);if(!Number.isFinite(due)||due<=Date.now())throw Error('future date required');if(!['facebook','instagram','youtube','tiktok'].includes(channel))throw Error('unsupported channel');return this.tx(()=>{const p=this.get(id);if(p.approved_revision!==p.revision)throw Error('approval required');const old=this.db.prepare('SELECT * FROM jobs WHERE post_id=? AND revision=? AND channel=?').get(id,p.revision,channel);if(old&&old.state!=='queued')throw Error('job already processed or canceled');const jobId=old?.id||randomUUID();if(old)this.db.prepare('UPDATE jobs SET due=? WHERE id=?').run(due,jobId);else this.db.prepare('INSERT INTO jobs(id,post_id,revision,channel,due) VALUES(?,?,?,?,?)').run(jobId,id,p.revision,channel,due);this.log(actor,'mock.scheduled',jobId);return {id:jobId,mode:'MOCK',due:new Date(due).toISOString()}})}
 cancel(jobId,actor){return this.tx(()=>{const r=this.db.prepare("UPDATE jobs SET state='canceled' WHERE id=? AND state='queued'").run(jobId);if(!r.changes)throw Error('queued job required');this.log(actor,'job.canceled',jobId)})}
 runMock(now=Date.now()){return this.tx(()=>{const jobs=this.db.prepare("SELECT j.* FROM jobs j JOIN posts p ON p.id=j.post_id WHERE j.state='queued' AND j.due<=? AND j.revision=p.revision AND p.approved_revision=p.revision").all(now);for(const j of jobs){const external='mock_'+createHash('sha256').update(j.id).digest('hex').slice(0,20);this.db.prepare('INSERT INTO receipts(job_id,provider,external_id) VALUES(?,?,?)').run(j.id,'MOCK',external);this.db.prepare("UPDATE jobs SET state='mock_completed' WHERE id=?").run(j.id);this.log('mock-worker','mock.completed',j.id)}return jobs.length})}
 close(){this.db.close()}
}
