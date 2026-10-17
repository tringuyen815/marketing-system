// Explicit local-only scanner. Never follows symlinks, writes to source, or executes skills.
import {readdir,lstat,readFile,realpath} from 'node:fs/promises';
import {resolve,relative,isAbsolute,basename,extname,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
export async function inventory(root,{limit=10000,depth=15}={}) {
 const base=await realpath(root),files=[],skills=[];
 async function walk(dir,level){if(level>depth)throw Error('depth limit exceeded');
 for(const ent of await readdir(dir,{withFileTypes:true})) {
 if(ent.name.startsWith('.')&&ent.name!=='.claude')continue;
 const p=join(dir,ent.name),st=await lstat(p);if(st.isSymbolicLink())continue;
 const rp=await realpath(p),rel=relative(base,rp);if(rel.startsWith('..')||isAbsolute(rel))continue;
 if(st.isDirectory()){await walk(p,level+1);continue}if(!st.isFile())continue;
 if(files.length>=limit)throw Error('file limit exceeded');
 files.push({path:rel.replaceAll('\\','/'),size:st.size,modified:st.mtime.toISOString(),extension:extname(p),rights:'unverified'});
 if(basename(p)==='SKILL.md'&&st.size<256000){const source=await readFile(p,'utf8');skills.push({path:rel,sha256:createHash('sha256').update(source).digest('hex'),source,execution:'disabled',verified:'file_read_only'})}
 }}await walk(base,0);return {mode:'LOCAL_READ_ONLY',files,skills};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(!process.argv[2]){console.error('Usage: node connector.mjs <explicit-approved-folder>');process.exitCode=1}
 else console.log(JSON.stringify(await inventory(process.argv[2]),null,2));
}
