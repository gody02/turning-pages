import { extraLaws } from './institutions';
// Dated rules are factual; spending envelopes and behavioural coefficients are game assumptions.
export const nationalSources=[
 {name:'ONS · August 2026 CPI: 3.1%',url:'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/consumerpriceinflation/august2026'},
 {name:'ONS · May–July 2026 unemployment: 4.9%',url:'https://www.ons.gov.uk/employmentandlabourmarket/peoplenotinwork/unemployment'},
 {name:'Bank of England · September 2026 Bank Rate: 3.75%',url:'https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026'},
 {name:'HMRC · 2026/27 Income Tax bands and allowance',url:'https://www.gov.uk/income-tax-rates'},
 {name:'HMRC · 2026/27 National Insurance',url:'https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027'},
 {name:'HMRC · VAT rates',url:'https://www.gov.uk/vat-rates'},
 {name:'HMRC · Corporation Tax',url:'https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax'},
 {name:'Parliament · Taxation, spending and resolutions',url:'https://guidetoprocedure.parliament.uk/collections/C6pm6WK1/taxation-and-spending'},
 {name:'Parliament · Money Bills and their limits',url:'https://guidetoprocedure.parliament.uk/articles/J2ZqTNCr'},
 {name:'OBR · March 2026 outlook (context, not our forecast)',url:'https://obr.uk/efo/economic-and-fiscal-outlook-march-2026/'},
];
export const budgetFields={
 basic:{label:'Basic Income Tax',unit:'%',min:0,max:40,step:1,base:20},
 higher:{label:'Higher Income Tax',unit:'%',min:0,max:60,step:1,base:40},
 additional:{label:'Additional Income Tax',unit:'%',min:0,max:70,step:1,base:45},
 allowance:{label:'Personal Allowance',unit:'£',min:0,max:25000,step:500,base:12570},
 ni:{label:'Employee NI main rate',unit:'%',min:0,max:20,step:1,base:8},
 employerNI:{label:'Employer NI',unit:'%',min:0,max:30,step:1,base:15},
 vat:{label:'Standard VAT',unit:'%',min:0,max:30,step:1,base:20},
 corporation:{label:'Main Corporation Tax',unit:'%',min:5,max:40,step:1,base:25},
 health:{label:'Health & care',unit:'£bn/year',min:100,max:400,step:5,base:230},
 education:{label:'Education & skills',unit:'£bn/year',min:50,max:220,step:5,base:120},
 welfare:{label:'Working-age benefits',unit:'£bn/year',min:60,max:300,step:5,base:165},
 pensions:{label:'State pensions',unit:'£bn/year',min:70,max:260,step:5,base:145},
 defence:{label:'Defence',unit:'£bn/year',min:20,max:160,step:5,base:65},
 justice:{label:'Justice & policing',unit:'£bn/year',min:15,max:100,step:5,base:45},
 local:{label:'Local services & devolved block proxy',unit:'£bn/year',min:20,max:140,step:5,base:65},
 transport:{label:'Transport operations',unit:'£bn/year',min:10,max:100,step:5,base:40},
 investment:{label:'Public capital investment',unit:'£bn/year',min:10,max:240,step:5,base:100},
} as const;
export type BudgetKey=keyof typeof budgetFields;
export type Budget=Record<BudgetKey,number>;
export const baselineBudget=Object.fromEntries(Object.entries(budgetFields).map(([k,v])=>[k,v.base])) as Budget;
export const sectors=[
 {id:'services',name:'Business & consumer services',share:.60,energy:.12,trade:.20},
 {id:'industry',name:'Manufacturing & industry',share:.15,energy:.65,trade:.60},
 {id:'construction',name:'Construction & housing',share:.07,energy:.35,trade:.10},
 {id:'public',name:'Public services',share:.18,energy:.15,trade:.02},
] as const;
export type LawEffect={productivity?:number;energy?:number;housing?:number;rights?:number;competition?:number;trade?:number;health?:number;skills?:number};
export type NationalLaw={id:string;name:string;area:string;summary:string;tradeoff:string;cost:number;delay:number;controversy:number;effect:LawEffect};
// Costs are additional annual £bn while active. These are original policy proposals, not existing Acts.
export const nationalLaws:NationalLaw[]=[
 ...extraLaws,
 {id:'grid',name:'Grid Connections and Storage Bill',area:'Energy',summary:'Expand grid connections and storage capacity.',tradeoff:'Capital spending now; construction and imported equipment delay cheaper energy.',cost:12,delay:12,controversy:25,effect:{energy:-.10,productivity:.3}},
 {id:'insulation',name:'National Home Retrofit Bill',area:'Housing',summary:'Fund a multi-year insulation programme.',tradeoff:'Installer bottlenecks and an ongoing public funding commitment.',cost:15,delay:9,controversy:20,effect:{energy:-.07,housing:4}},
 {id:'homes',name:'Social Housebuilding Bill',area:'Housing',summary:'Commission new social housing and infrastructure.',tradeoff:'Land, skills and construction demand compete with private building.',cost:20,delay:18,controversy:35,effect:{housing:10,productivity:.2}},
 {id:'planning',name:'Planning and Infrastructure Consent Bill',area:'Housing',summary:'Streamline approvals with local consultation.',tradeoff:'Local opposition to development; approvals alone do not provide workers.',cost:2,delay:12,controversy:55,effect:{housing:6,productivity:.4}},
 {id:'renters',name:'Rental Security and Enforcement Bill',area:'Housing',summary:'Strengthen tenant security and fund enforcement.',tradeoff:'Compliance costs and possible landlord withdrawal.',cost:2,delay:4,controversy:45,effect:{housing:3,rights:5}},
 {id:'bargaining',name:'Sectoral Bargaining Bill',area:'Work',summary:'Create sector bargaining institutions.',tradeoff:'Stronger wage bargaining can also increase costs for marginal firms.',cost:1,delay:6,controversy:65,effect:{rights:12}},
 {id:'sickpay',name:'Universal Sick Pay Support Bill',area:'Work',summary:'Expand support during short-term sickness.',tradeoff:'Public cost and a modest rise in employer adjustment pressure.',cost:5,delay:3,controversy:30,effect:{rights:5,health:3}},
 {id:'childcare',name:'Childcare Capacity Bill',area:'Services',summary:'Train staff and expand affordable childcare places.',tradeoff:'Recruitment takes time; funding promises do not create places instantly.',cost:10,delay:12,controversy:20,effect:{skills:5,productivity:.4}},
 {id:'nurses',name:'Clinical Workforce Training Bill',area:'Services',summary:'Expand training and retention in health services.',tradeoff:'Training capacity takes two years and money is committed throughout.',cost:8,delay:24,controversy:15,effect:{health:12}},
 {id:'skills',name:'Technical Colleges and Apprenticeships Bill',area:'Services',summary:'Build technical training and apprenticeships.',tradeoff:'Trainees need time and firms must be able to offer placements.',cost:7,delay:18,controversy:15,effect:{skills:10,productivity:.6}},
 {id:'rail',name:'Rail Integration and Reliability Bill',area:'Transport',summary:'Coordinate timetables, maintenance and investment.',tradeoff:'Up-front transition costs before reliable services improve output.',cost:9,delay:15,controversy:45,effect:{productivity:.4,energy:-.02}},
 {id:'competition',name:'Competition and Procurement Bill',area:'Markets',summary:'Strengthen procurement access and competition enforcement.',tradeoff:'Incumbents lobby against reform; investigation has administrative costs.',cost:2,delay:6,controversy:40,effect:{competition:10,productivity:.3}},
 {id:'coops',name:'Cooperative Development Bill',area:'Ownership',summary:'Provide finance and technical support for worker cooperatives.',tradeoff:'Public investment carries risk and does not guarantee viable businesses.',cost:5,delay:12,controversy:50,effect:{rights:4,competition:5,productivity:.2}},
 {id:'trade',name:'Customs Cooperation Bill',area:'Trade',summary:'Negotiate closer customs and standards cooperation.',tradeoff:'Partners must reciprocate; domestic regulatory discretion narrows.',cost:2,delay:9,controversy:65,effect:{trade:.08,productivity:.3}},
 {id:'research',name:'Research and Industrial Innovation Bill',area:'Industry',summary:'Fund research networks and industrial demonstration projects.',tradeoff:'Not every project succeeds; returns arrive well after spending.',cost:10,delay:24,controversy:25,effect:{productivity:.9,skills:3}},
 {id:'water',name:'Water Resilience and Enforcement Bill',area:'Environment',summary:'Improve water infrastructure and inspection.',tradeoff:'Capital commitments and construction disruption precede resilience.',cost:6,delay:18,controversy:35,effect:{health:3,productivity:.2}},
 {id:'courts',name:'Courts Capacity and Legal Aid Bill',area:'Justice',summary:'Expand court staffing and access to representation.',tradeoff:'Recruitment and case processing lag the funding commitment.',cost:4,delay:9,controversy:25,effect:{rights:4,competition:2}},
 {id:'export',name:'Export Finance and Diversification Bill',area:'Trade',summary:'Support firms entering additional overseas markets.',tradeoff:'Public exposure to commercial failures and uncertain foreign demand.',cost:4,delay:9,controversy:25,effect:{trade:.05,productivity:.2}},
];
export const legislativeStages=['First reading','Second reading','Committee','Report','Third reading','Lords scrutiny','Consideration of amendments','Royal Assent'] as const;
export const budgetStages=['Budget debate & Ways and Means','Finance Bill Commons scrutiny','Supply estimates & appropriation','Lords financial scrutiny','Royal Assent'] as const;
export const nationalIncidents=[
 {id:'energy',title:'Imported energy squeeze',text:'Wholesale energy offers tighten. Importers pass part of the increase into contracts.',energy:.16,demand:-.015,confidence:-3},
 {id:'orders',title:'Overseas orders soften',text:'Trading partners postpone orders. Export-facing firms review their shifts.',energy:0,demand:-.07,confidence:-4},
 {id:'recovery',title:'An opening in export markets',text:'New orders arrive from abroad. Firms will need capacity to fulfil them.',energy:0,demand:.06,confidence:3},
 {id:'supply',title:'Energy supply improves',text:'Additional deliveries ease wholesale prices, with a lag before household bills adjust.',energy:-.12,demand:.015,confidence:2},
 {id:'strike',title:'Pay negotiations break down',text:'Disruption follows a pay dispute. Falling living standards and labour relations shaped the risk.',energy:0,demand:-.025,confidence:-3},
 {id:'credit',title:'Lenders tighten credit',text:'Lenders demand larger buffers as arrears and financing concerns rise.',energy:0,demand:-.035,confidence:-6},
 {id:'innovation',title:'A production breakthrough spreads',text:'Several firms adopt a more effective process; diffusion depends on investment and skills.',energy:0,demand:.02,confidence:4},
 {id:'flood',title:'Flood damage interrupts deliveries',text:'Repairs and transport disruption put pressure on firms and local services.',energy:.035,demand:-.03,confidence:-2},
] as const;
