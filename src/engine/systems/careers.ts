import {jobs} from '../../data/world';
import type {Action,LifeState} from '../core/model';
import {countryOf} from './geography';
import {log,remember} from './history';
export const jobOf=(g:LifeState)=>jobs.find(j=>j.id===g.job);
export const salary=(g:LifeState)=>Math.round((jobOf(g)?.salary??0)*countryOf(g).wage*(1+g.level*.2));
export function leaveJob(g:LifeState){g.job=null;g.jobYears=0;g.level=0;}
export function careerReason(g:LifeState,action:Action):string|null{
 if(action==='university'&&(g.age<18||g.education!=='secondary'))return 'Requires completion of secondary school.';
 if(action==='study'&&!['school','university'].includes(g.education))return 'Available while enrolled in school.';
 if(action==='retire'&&(g.age<65||g.retired))return 'Retirement is available from age 65.';
 if(action.startsWith('job:')){const j=jobs.find(j=>j.id===action.split(':')[1]);if(!j)return 'Unknown career.';if(g.age<18)return 'Careers open at age 18.';if(g.retired)return 'You have retired.';if(g.education==='university')return 'Complete university before a full-time career.';if(g.job===j.id)return 'Your current career.';if(g.stats.smarts<j.smarts)return `Requires ${j.smarts} smarts.`;if(j.degree&&g.education!=='degree')return 'Requires a university degree.';}
 return null;
}
export function careerAction(g:LifeState,action:Action){
 if(action==='university'){g.education='university';g.studyYears=0;leaveJob(g);log(g,'You enrol at university. Tuition will be charged for the next three years.','milestone');remember(g,'education:university','education','Enrolled at university.');}
 if(action==='retire'){g.retired=true;g.job=null;log(g,'You retire. A modest annual pension begins next year.','milestone');remember(g,'career:retired','career','Retired from employment.');}
 if(action.startsWith('job:')){leaveJob(g);g.job=action.split(':')[1];log(g,`You begin a new chapter as a ${jobOf(g)!.name.toLowerCase()}.`,'milestone');remember(g,action,'career',`Started ${g.job}.`);}
}
export function advanceCareerYear(g:LifeState){if(g.age>=18&&g.job&&!g.retired){g.jobYears++;if(g.jobYears%3===0&&g.stats.smarts>=40&&g.level<5){g.level++;log(g,`Your work earns a promotion to career level ${g.level+1}.`,'milestone');remember(g,`promotion:${g.job}:${g.level}`,'career','Earned a promotion.');}}}
export function advanceEducationYear(g:LifeState){if(g.age>=18&&g.education==='university'){g.studyYears++;g.stats.smarts=Math.min(100,g.stats.smarts+5);if(g.studyYears>=3){g.education='degree';log(g,'Three years of study pay off: you graduate from university.','milestone');remember(g,'qualification:degree','qualification','Completed a university degree.');}}}
