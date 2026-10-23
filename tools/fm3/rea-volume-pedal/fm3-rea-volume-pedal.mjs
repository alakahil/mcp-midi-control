#!/usr/bin/env node
// Static FM3-Edit collection only. Never launches FM3-Edit or accesses MIDI.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const EXPECTED_SHA256 = '62d53aef2b4cc02ffbbcc91be8b04b17411deb51bce729c0a0c6e1ca76efbb1a';
export const VERSION = '1.1.0';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const digest = b => crypto.createHash('sha256').update(b).digest('hex');
const save = (name, value) => fs.writeFileSync(name, JSON.stringify(value, null, 2) + '\n');
const exists = name => { try { return fs.statSync(name).isFile(); } catch { return false; } };
const load = name => JSON.parse(fs.readFileSync(name, 'utf8'));
const address = value => typeof value === 'string' && /^0x[0-9a-f]+$/i.test(value);

export function arm64Slice(bytes) {
  if (bytes.length < 8) throw new Error('Liiga lühike Mach-O fail.');
  const magic = bytes.readUInt32BE(0);
  if (magic === 0xcffaedfe && bytes.readUInt32LE(4) === 0x100000c) return bytes;
  if (![0xcafebabe, 0xcafebabf, 0xbebafeca, 0xbfbafeca].includes(magic))
    throw new Error('Ei ole arm64 Mach-O ega universaalne Mach-O.');
  const little = [0xbebafeca, 0xbfbafeca].includes(magic);
  const wide = [0xcafebabf, 0xbfbafeca].includes(magic);
  const u32 = off => little ? bytes.readUInt32LE(off) : bytes.readUInt32BE(off);
  const u64 = off => Number(little ? bytes.readBigUInt64LE(off) : bytes.readBigUInt64BE(off));
  const count = u32(4), stride = wide ? 32 : 20;
  if (count > 64 || 8 + count * stride > bytes.length) throw new Error('Vigane Mach-O arhitektuuritabel.');
  for (let i = 0; i < count; i++) {
    const start = 8 + i * stride;
    if (u32(start) !== 0x100000c) continue;
    const offset = wide ? u64(start + 8) : u32(start + 8);
    const size = wide ? u64(start + 16) : u32(start + 12);
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) ||
        offset < 8 + count * stride || size < 8 || offset + size > bytes.length)
      throw new Error('Vigased arm64 failipiirid.');
    const slice = bytes.subarray(offset, offset + size);
    if (slice.readUInt32BE(0) !== 0xcffaedfe || slice.readUInt32LE(4) !== 0x100000c)
      throw new Error('arm64 tabelikirje sisu ei vasta arhitektuurile.');
    return slice;
  }
  throw new Error('Universaalses failis puudub arm64.');
}

export function unpackResult(result) {
  if (result.structuredContent) return result.structuredContent;
  for (const block of result.content || []) {
    if (block.type === 'text') { try { return JSON.parse(block.text); } catch {} }
  }
  return null;
}

export function classifyResult(result) {
  const data = unpackResult(result);
  if (result.isError || data?.error) return {status:'error', error:data?.error ?? 'MCP tool error'};
  if (data === null) return {status:'error', error:'Missing structured JSON result'};
  const value = data.normalized_result ?? data.result ?? data;
  const limitations = [...(data.limitations || []), ...(value?.limitations || [])];
  return {status: value?.truncated === true || value?.next_offset != null ? 'limited' : 'ok',
    evidence_id:data.evidence_id ?? null, limitations,
    truncated:value?.truncated ?? null, next_offset:value?.next_offset ?? null};
}

export async function connectREA(launcher, env, logPath) {
  const require = createRequire(launcher);
  const {Client} = await import(pathToFileURL(require.resolve('@modelcontextprotocol/client')));
  const {StdioClientTransport} = await import(pathToFileURL(require.resolve('@modelcontextprotocol/client/stdio')));
  const transport = new StdioClientTransport({command:process.execPath,args:[launcher,'--mcp'],
    env,stderr:'pipe',maxBufferSize:64 * 1024 * 1024});
  transport.stderr?.on('data', data => fs.appendFileSync(logPath, data));
  const client = new Client({name:'fm3-volume-pedal-static-batch',version:VERSION});
  try { await client.connect(transport,{timeout:60000}); }
  catch (error) { await client.close().catch(()=>{}); throw error; }
  return client;
}

export async function collect(client, target, out, plan, options = {}) {
  const log = options.log ?? console.log;
  const checkpoint = options.checkpoint ?? (() => {});
  const rows = [], results = new Map();
  let stop = false;
  const signalHandler = () => { stop = true; log('Peatumine pärast käimasolevat päringut; tulemused pakitakse.'); };
  process.once('SIGINT',signalHandler);
  fs.mkdirSync(path.join(out,'queries'),{recursive:true});
  const required = ['open_binary','close_binary','analyze_function','trace_native_values','xrefs',
    'resolve_containing_procedure','export_evidence_bundle','binary_session'];
  const catalog = await client.listTools(undefined,{timeout:60000});
  save(path.join(out,'tool-schemas.json'),catalog.tools.filter(x=>required.includes(x.name)));
  const names = new Set(catalog.tools.map(x=>x.name));
  for (const name of required) if (!names.has(name)) throw new Error(`REA tööriist puudub: ${name}`);
  let next = 0, active = false, consecutiveFailures = 0;
  async function query(id, name, args, {critical = false, cleanup = false} = {}) {
    if (stop && !cleanup) throw new Error('Kasutaja peatas kogumise.');
    const key = JSON.stringify([name,args]);
    if (results.has(key)) return results.get(key);
    const started = Date.now();
    const number = String(++next).padStart(3,'0');
    const file = `queries/${number}-${id}.json`;
    log(`[${number}] ${id}`);
    const beat = setInterval(()=>log(`  ${id}: töötab (${Math.round((Date.now()-started)/1000)} s)…`),30000);
    let raw, assessment;
    try {
      raw = await client.callTool({name,arguments:args},{timeout: options.timeoutMs ?? (cleanup ? 120000 : 1200000)});
      assessment = classifyResult(raw);
    } catch (error) {
      raw = {isError:true,exception:{name:error.name,message:error.message,code:error.code ?? null}};
      assessment = {status:'error',error:raw.exception};
    } finally { clearInterval(beat); }
    save(path.join(out,file),{tool:name,arguments:args,started_at:new Date(started).toISOString(),
      duration_ms:Date.now()-started,assessment,response:raw});
    rows.push({id,tool:name,arguments:args,file,...assessment});
    save(path.join(out,'query-index.json'),rows);
    checkpoint(rows);
    const data = unpackResult(raw);
    const value = data?.normalized_result ?? data?.result ?? data;
    const answer = {assessment,data,value};
    results.set(key,answer);
    if (critical && assessment.status === 'error') throw new Error(`${id} ebaõnnestus; vaata ${file}`);
    if (!cleanup) {
      consecutiveFailures = assessment.status === 'error' ? consecutiveFailures + 1 : 0;
      if (consecutiveFailures >= 3) throw new Error('Kolm järjestikust päringuviga; ülejäänud päringud peatati.');
    }
    return answer;
  }
  let collectionError = null;
  try {
    const opened = await query('open-target','open_binary',{path:target,provider_id:'ghidra'},{critical:true});
    active = true;
    if (opened.value?.sha256 !== EXPECTED_SHA256) throw new Error('REA avatud binaari räsi ei vasta sihtfailile.');
    await query('session-open','binary_session',{});
    // Fail early if the provider cannot perform the first real analysis.
    const first = plan.functions[0];
    await query(first.id,'analyze_function',{procedure:first.address},{critical:true});
    for (const entry of plan.functions.slice(1))
      await query(entry.id,'analyze_function',{procedure:entry.address});

    const sites = new Set(), siteGroups = [];
    for (const entry of plan.xrefs) {
      const result = await query(entry.id,'xrefs',{address:entry.address});
      if (result.assessment.status !== 'error' && Array.isArray(result.value)) {
        const group = [...new Set(result.value.filter(address).map(x=>x.toLowerCase()))]
          .sort((a,b)=>Number(BigInt(a)-BigInt(b)));
        siteGroups.push({source:entry.address,sites:group});
        for (const item of group) sites.add(item);
      }
    }
    const allSites = [...sites].sort((a,b)=>Number(BigInt(a)-BigInt(b)));
    // Bound caller discovery, giving each creation/assignment seed a share of the budget.
    const selected = [], selectedSet = new Set();
    const longest = Math.max(0,...siteGroups.map(x=>x.sites.length));
    for (let i=0;i<longest && selected.length<plan.max_reference_sites;i++) {
      for (const group of siteGroups) {
        const site = group.sites[i];
        if (site && !selectedSet.has(site)) {selected.push(site);selectedSet.add(site);}
        if (selected.length>=plan.max_reference_sites) break;
      }
    }
    const discovered = new Set();
    for (const site of selected) {
      const found = await query(`owner-${site}`,'resolve_containing_procedure',{address:site});
      if (found.value?.found && address(found.value.procedure?.address))
        discovered.add(found.value.procedure.address.toLowerCase());
    }
    const known = new Set([...plan.functions.map(x=>x.address.toLowerCase()), ...(plan.reuse_previous_functions || []).map(x=>x.toLowerCase())]);
    const candidates = [...discovered].filter(x=>!known.has(x));
    const chosen = candidates.slice(0,plan.max_extra_functions);
    save(path.join(out,'reference-followup.json'),{all_sites:allSites,source_groups:siteGroups,selected_sites:selected,
      discovered_procedures:[...discovered],selected_extra_procedures:chosen,
      unvisited_sites:allSites.filter(x=>!selectedSet.has(x)),unvisited_procedures:candidates.slice(chosen.length),
      limited:allSites.length>selected.length || candidates.length>chosen.length});
    for (const procedure of chosen) await query(`xref-function-${procedure}`,'analyze_function',{procedure});
    for (const entry of plan.traces)
      await query(entry.id,'trace_native_values',{procedure:entry.address,...plan.trace_budget});
  } catch (error) {
    collectionError = error.message;
  } finally {
    if (active) {
      await query('evidence-export','export_evidence_bundle',
        {path:path.join(out,'rea-evidence.json'),overwrite:false},{cleanup:true});
      await query('close-target','close_binary',{}, {cleanup:true});
    }
    process.removeListener('SIGINT',signalHandler);
  }
  return {rows,error:collectionError,interrupted:stop};
}

function command(file,args,env) {
  const r = spawnSync(file,args,{encoding:'utf8',env,timeout:120000,maxBuffer:16*1024*1024});
  return {command:file,args,status:r.status,signal:r.signal,stdout:r.stdout || '',stderr:r.stderr || '',
    error:r.error?.message ?? null};
}

function selectTarget(temp, observations) {
  const explicit = process.env.FM3_REA_TARGET;
  const candidates = explicit ? [path.resolve(explicit)] :
    [path.join(os.homedir(),'FM3_REA_NATIVE/FM3-Edit-arm64')];
  if (!explicit) {
    for (const app of ['/Applications/FM3-Edit.app',path.join(os.homedir(),'Applications/FM3-Edit.app')]) {
      const dir = path.join(app,'Contents/MacOS');
      if (fs.existsSync(dir)) for (const name of fs.readdirSync(dir).sort()) candidates.push(path.join(dir,name));
    }
  }
  for (const candidate of candidates) {
    if (!exists(candidate)) { observations.push({path:candidate,status:'missing'}); continue; }
    try {
      const full = fs.readFileSync(candidate), thin = arm64Slice(full), hash = digest(thin);
      observations.push({path:candidate,status:hash===EXPECTED_SHA256?'match':'hash_mismatch',
        file_sha256:digest(full),arm64_sha256:hash,arm64_bytes:thin.length});
      if (hash !== EXPECTED_SHA256) continue;
      if (thin === full) return candidate;
      const extracted = path.join(temp,'FM3-Edit-arm64');
      fs.writeFileSync(extracted,thin,{flag:'wx',mode:0o600});
      return extracted;
    } catch (error) { observations.push({path:candidate,status:'invalid',error:error.message}); }
  }
  throw new Error('Täpselt kontrollitud FM3-Edit arm64 faili ei leitud. Teise versiooni aadresse ei kasutatud.');
}


// A healthy explicit Ghidra scope is sufficient. Unrelated IDA/Hopper/client
// registrations remain informational. Require the actual arm64 decompiler/JDK checks.
export function ghidraReady(raw) {
  const d = raw?.result ?? raw;
  const required = ['node','ghidra','ghidra-platform','ghidra-architecture',
    'ghidra-installation','ghidra-version','ghidra-headless','ghidra-native_decompiler','ghidra-java'];
  return d?.healthy === true && required.every(name=>
    d.scope_checks?.some(c=>c.name===name && c.ok===true));
}

export function validatePlanTarget(plan,bytes) {
  if (digest(bytes)!==EXPECTED_SHA256 || plan.required_target_sha256!==EXPECTED_SHA256 ||
      plan.required_application_version!=='1.07.17' || plan.required_architecture!=='arm64')
    throw new Error('Plaani binaari identiteet ei vasta kontrollitud FM3-Edit 1.07.17 arm64 failile.');
  if (!Array.isArray(plan.functions) || !plan.functions.length) throw new Error('Tühi analüüsiplaan.');
  return plan.functions.map(entry=>{
    const at=Number(BigInt(entry.address)-0x100000000n), size=entry.lc_function_starts_size;
    if (!Number.isSafeInteger(at) || at<0 || !Number.isSafeInteger(size) || size<4 || at+size>bytes.length ||
        digest(bytes.subarray(at,at+size))!==entry.body_sha256)
      throw new Error('Funktsiooni kontrollpunkt ei vasta: '+entry.id);
    return {id:entry.id,address:entry.address,bytes:size,sha256:entry.body_sha256,verified:true};
  });
}

export async function main() {
  if (process.argv.length > 2) throw new Error('Käivita ilma lisaargumentideta. Valikulised failiteed on README-s.');
  const parent = process.env.FM3_REA_OUTPUT_PARENT ? path.resolve(process.env.FM3_REA_OUTPUT_PARENT) : path.join(os.homedir(),'Desktop');
  fs.mkdirSync(parent,{recursive:true});
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+Z$/,'Z');
  const out = fs.mkdtempSync(path.join(parent,`FM3_REA_VOLUME_PEDAL_${stamp}_`));
  fs.chmodSync(out,0o700);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(),'fm3-rea-input-'));
  const summary = {script_version:VERSION,started_at:new Date().toISOString(),status:'running',
    platform:process.platform,architecture:process.arch,node:process.version,
    expected_binary_sha256:EXPECTED_SHA256,new_hardware_exports:0,
    generator_write_support:false,full_range_encoding_proven:false,
    research_question:'Ext1 -> Volume/Pan 1 Gain: create request, assigned modifier ID and target/channel metadata',
    production_plugin_version:'0.3.16',new_REA_analysis:false,
    target_candidates:[],errors:[],queries:[],analysis_performed:false};
  let client;
  const log = text => { console.log(text); fs.appendFileSync(path.join(out,'progress.log'),text+'\n'); };
  try {
    log('FM3 Volume’i pedaaliseos: üks staatiline REA/Ghidra koondanalüüs.');
    log(`Tulemused: ${out}`);
    if (process.platform !== 'darwin' || process.arch !== 'arm64')
      throw new Error('See pakett on ette valmistatud sinu Apple Silicon Maci jaoks.');
    const [major,minor] = process.versions.node.split('.').map(Number);
    if (!((major===22 && minor>=19) || (major===24 && minor>=11) || major>=26))
      throw new Error('REA 6.4.0 nõuab Node 22.19+, 24.11+ või 26+. Midagi ei paigaldatud.');
    const launcher = process.env.FM3_REA_LAUNCHER ? path.resolve(process.env.FM3_REA_LAUNCHER) :
      path.join(os.homedir(),'FM3_REA_TOOLS/node_modules/rea-agents/scripts/rea.mjs');
    if (!exists(launcher)) throw new Error(`REA käivitaja puudub: ${launcher}`);
    const pkg = load(path.resolve(path.dirname(launcher),'../package.json'));
    summary.rea = {launcher,version:pkg.version};
    if (pkg.version !== '6.4.0') throw new Error(`Leitud REA ${pkg.version}; see pakett on kontrollitud REA 6.4.0 liidestega. Paigaldust ei muudeta.`);
    const ghidra = process.env.GHIDRA_INSTALL_DIR || path.join(os.homedir(),'ghidra_12.1.4_PUBLIC');
    if (!exists(path.join(ghidra,'support/analyzeHeadless'))) throw new Error(`Ghidra käivitaja puudub: ${ghidra}`);
    let javaHome;
    const javaCandidates = [process.env.JAVA_HOME,
      '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
      command('/usr/libexec/java_home',['-v','21'],process.env).stdout.trim()].filter(Boolean);
    summary.java_candidates = [];
    for (const candidate of [...new Set(javaCandidates)]) {
      if (!exists(path.join(candidate,'bin/javac')) || !exists(path.join(candidate,'bin/java'))) continue;
      const check = command(path.join(candidate,'bin/javac'),['-version'],process.env);
      const major = Number((check.stdout+'\n'+check.stderr).match(/javac (\d+)/)?.[1]);
      summary.java_candidates.push({path:candidate,major,status:check.status});
      if (check.status === 0 && major >= 21) { javaHome=candidate; break; }
    }
    if (!javaHome || !exists(path.join(javaHome,'bin/java')) || !exists(path.join(javaHome,'bin/javac')))
      throw new Error('Täis-JDK ei ole leitav. Midagi ei paigaldatud.');
    const env = {...process.env,GHIDRA_INSTALL_DIR:ghidra,JAVA_HOME:javaHome,
      PATH:path.join(javaHome,'bin')+path.delimiter+process.env.PATH,
      REA_GHIDRA_STARTUP_TIMEOUT_MS:'900000'};
    for (const name of ['HOPPER_TARGET_PATH','HOPPER_TARGET_KIND','HOPPER_LOADER_ARGS_JSON']) delete env[name];
    summary.environment = {ghidra_install_dir:ghidra,java_home:javaHome,
      java:command(path.join(javaHome,'bin/java'),['-version'],env),
      javac:command(path.join(javaHome,'bin/javac'),['-version'],env)};
    const target = selectTarget(temp,summary.target_candidates);
    summary.target = {path:target,sha256:digest(fs.readFileSync(target)),architecture:'arm64',application:'FM3-Edit',version:'1.07.17',version_evidence:'Hash identity pinned to original app Info.plist'};
    const planBytes = fs.readFileSync(path.join(ROOT,'plan.json'));
    const plan = JSON.parse(planBytes);
    if (plan.required_target_sha256 !== EXPECTED_SHA256 || plan.required_rea_version !== pkg.version)
      throw new Error('Analüüsiplaani versioon või sihtfail ei vasta sellele skriptile.');
    summary.function_checkpoints = validatePlanTarget(plan,fs.readFileSync(target));
    summary.plan_sha256 = digest(planBytes);
    fs.writeFileSync(path.join(out,'plan.json'),planBytes);
    fs.copyFileSync(fileURLToPath(import.meta.url),path.join(out,'collector-used.mjs'));
    save(path.join(out,'summary.json'),summary);
    log('Kontrollin ainult Ghidra valmisolekut…');
    const doctor = command(process.execPath,[launcher,'doctor','--provider','ghidra','--format','json'],env);
    save(path.join(out,'doctor-command.json'),doctor);
    let doctorData;
    try { doctorData=JSON.parse(doctor.stdout); } catch {}
    save(path.join(out,'doctor.json'),doctorData ?? {parse_failed:true});
    if (doctor.status !== 0 || !ghidraReady(doctorData))
      throw new Error('Ghidra valmisolekukontroll ei läbinud. Diagnostika on tulemuste kaustas.');
    log('Käivitan ühe REA seansi. Ghidra esimene import võib võtta mitu minutit.');
    client = await connectREA(launcher,env,path.join(out,'rea-stderr.log'));
    const collected = await collect(client,target,out,plan,{log,checkpoint:rows=>{
      summary.queries=rows; save(path.join(out,'summary.json'),summary);
    }});
    summary.queries = collected.rows;
    if (collected.error) summary.errors.push(collected.error);
    summary.interrupted = collected.interrupted;
    summary.analysis_performed = collected.rows.some(x=>x.tool==='analyze_function' && x.status!=='error');
    summary.new_REA_analysis = summary.analysis_performed;
    const followup = path.join(out,'reference-followup.json');
    summary.followup_limited = exists(followup) ? load(followup).limited : null;
    summary.status = summary.errors.length || collected.rows.some(x=>x.status==='error') ? 'partial' : 'collected';
  } catch (error) {
    summary.status='blocked'; summary.errors.push(error.message); log(`PEATATUD: ${error.message}`);
  } finally {
    if (client) await client.close().catch(error=>summary.errors.push(`REA sulgemine: ${error.message}`));
    if (summary.target && exists(summary.target.path)) {
      summary.target.sha256_after = digest(fs.readFileSync(summary.target.path));
      if (summary.target.sha256_after !== EXPECTED_SHA256) summary.errors.push('Sihtfaili räsi muutus kogumise ajal.');
    }
    if (summary.status === 'collected' && summary.errors.length) summary.status='partial';
    fs.rmSync(temp,{recursive:true,force:true});
    summary.finished_at = new Date().toISOString();
    save(path.join(out,'summary.json'),summary);
    const ok = summary.queries.filter(x=>x.status==='ok').length;
    const limited = summary.queries.filter(x=>x.status==='limited').length;
    const errors = summary.queries.filter(x=>x.status==='error').length;
    fs.writeFileSync(path.join(out,'READ_ME_FIRST.txt'),
      `FM3 REA Volume’i pedaaliseos — ${summary.status}\nPäringuid OK: ${ok}; piiratud: ${limited}; vigu: ${errors}.\n`+
      `See on staatilise analüüsi kogum, mitte kinnitatud kirjutustugi.\n`+
      `Uusi seadmeeksporte: 0. Originaalset editoribinaari ei pakita.\n`+
      `Vead: ${summary.errors.join('; ') || 'puuduvad'}\n`+
      `Tulemused võivad sisaldada failiteid, assemblerit ja dekompileeritud koodi.\n`+
      `Laadi tulemuste ZIP samasse vestlusse; automaatset üleslaadimist ei toimu.\n`);
    // Only this new result directory is packaged, never the input or installation.
    const archive = `${out}.zip`;
    const zipper = process.platform==='darwin' ?
      command('/usr/bin/ditto',['-c','-k','--keepParent',out,archive],process.env) :
      {status:1,error:'ZIP loomine on mõeldud macOS-ile'};
    if (zipper.status===0 && exists(archive)) {
      log(`\nVALMIS (${summary.status}). Laadi siia üks fail:\n${archive}`);
      log(`ZIP SHA-256: ${digest(fs.readFileSync(archive))}`);
    } else { log(`ZIP loomine ei õnnestunud: ${zipper.error || zipper.stderr}. Tulemused säilivad: ${out}`); }
    process.exitCode = summary.status==='collected' && zipper.status===0 ? 0 : 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main().catch(error=>{console.error(error.message);process.exitCode=1;});
