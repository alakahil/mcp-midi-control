// Shared measured controls; historical scopes and ranges are unchanged.
export const controls=Object.freeze({
 gainB:{eid:58,pid:7,offset:4958,min:0,max:10,values:[4,5,6,7],label:'Amp B Gain',unit:'/10'},
 bassB:{eid:58,pid:8,offset:4960,min:0,max:10,values:[4,5,6,7],label:'Amp B Bass',unit:'/10'},
 midB:{eid:58,pid:9,offset:4962,min:0,max:10,label:'Amp B Mid',unit:'/10'},
 trebleB:{eid:58,pid:10,offset:4964,min:0,max:10,label:'Amp B Treble',unit:'/10'},
 presenceB:{eid:58,pid:26,offset:4996,min:0,max:10,label:'Amp B Presence',unit:'/10'},
 levelB:{eid:58,pid:1,offset:4946,min:-80,max:20,label:'Amp B Level',unit:'dB'},
 delayMixA:{eid:70,pid:0,offset:7392,min:0,max:100,label:'Delay A Mix',unit:'%'},
 reverbMixA:{eid:66,pid:13,offset:9590,min:0,max:100,label:'Reverb A Mix',unit:'%'},
 delayTimeMs:{eid:70,pid:8,offset:7408,min:1,max:16000,low:50,high:1000,label:'Delay A Time',unit:'ms'},
 delayFeedback:{eid:70,pid:10,offset:7412,min:-100,max:100,low:0,high:50,label:'Delay A Feedback',unit:'%'},
 reverbTimeS:{eid:66,pid:1,offset:9566,min:0.1,max:100,low:0.5,high:5,label:'Reverb A Time',unit:'s'},
 reverbPredelayMs:{eid:66,pid:9,offset:9582,min:0,max:1000,low:0,high:100,label:'Reverb A Pre-Delay',unit:'ms'},
 delayTempoA:{eid:70,pid:15,offset:7422,values:['NONE'],rawValues:[0],label:'Delay A Tempo'},
 reverbPredelayTempoA:{eid:66,pid:62,offset:9688,values:['NONE'],rawValues:[0],label:'Reverb A Pre-Delay Tempo'},
 delayScene2:{offset:7374,values:[true,false],rawValues:[0,1],label:'Scene 2 Delay'},
 reverbScene1:{offset:9528,values:['A','B'],rawValues:[0,1],label:'Scene 1 Reverb kanal'}
});
