// Historical manifests include full-precision Math.pow results. The FM3 offline
// workflow pins Node 22; another V8 can change only the last display digits and
// therefore the JSON hash even when every SYX byte remains identical.
export function assertHistoricalRuntime(version=process.versions.node){
 if(Number(version.split('.')[0])!==22)throw Error(`FM3 evidence replay requires Node 22 (CI baseline); found Node ${version}. Run with a Node 22 executable. Do not regenerate historical evidence to hide a runtime difference.`);
}
