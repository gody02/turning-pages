export const parties = [
  {id:'labour',name:'Labour',description:'Build a coalition across organised labour, public services and reform-minded voters.'},
  {id:'conservative',name:'Conservative',description:'Navigate enterprise, institutions, fiscal restraint and local loyalties.'},
  {id:'liberal',name:'Liberal Democrat',description:'Work through civil liberties, local campaigning and negotiated reform.'},
  {id:'green',name:'Green',description:'Connect environmental transition to housing, ownership and living standards.'},
  {id:'assembly',name:'Workers’ Assembly',description:'A fictional party debating democratic socialism, class power and economic transformation.'},
] as const;
export const doctrines = [
  {id:'socratic',name:'Socratic inquiry',question:'What do you mean by justice—and would you accept that definition from the other side?',source:'https://plato.stanford.edu/entries/socrates/'},
  {id:'smith',name:'Smith: markets & moral judgement',question:'Who can participate in exchange, and whose power can distort it?',source:'https://plato.stanford.edu/entries/smith-moral-political/'},
  {id:'marx',name:'Marx: ownership & class',question:'Who controls the productive assets, who does the work, and who receives the surplus?',source:'https://plato.stanford.edu/entries/marx/'},
  {id:'lenin',name:'Lenin: organisation & transition',question:'Does an immediate compromise strengthen your capacity to transform society, or change the interests of your organisation?',source:'https://www.marxists.org/archive/lenin/works/1921/oct/17.htm'},
  {id:'trotsky',name:'Trotsky: uneven development',question:'Can a local transformation endure without changes in the wider economy on which it depends?',source:'https://www.marxists.org/archive/trotsky/1931/tpr/pr10.htm'},
] as const;
export type PartyId=typeof parties[number]['id'];
export type DoctrineId=typeof doctrines[number]['id'];
export type PoliticalRole='activist'|'councillor'|'mp'|'minister'|'premier';
export const roleNames:Record<PoliticalRole,string>={activist:'Community organiser',councillor:'Mereford councillor',mp:'MP for Mereford',minister:'Housing & communities minister',premier:'Prime Minister'};
export const rolePay:Record<PoliticalRole,number>={activist:0,councillor:12000,mp:54000,minister:66000,premier:78000};
export type PoliticalEffects={reputation?:number;integrity?:number;organisation?:number;knowledge?:number;caucus?:number;unions?:number;enterprise?:number;support?:number;family?:number;health?:number;happiness?:number;money?:number;campaign?:number};
export type PoliticalEvent={id:string;title:string;text:string;minimum:number;choices:{label:string;result:string;effects:PoliticalEffects;memory?:string}[]};
export const politicalEvents:PoliticalEvent[]=[
  {id:'purpose',title:'What brings you into the room?',text:'At your first branch meeting, Ruth asks why you want to enter politics. The room waits. This is a promise people may remember.',minimum:0,choices:[
    {label:'“People need secure homes and livelihoods.”',result:'You put material security at the centre of your politics.',effects:{support:5,unions:5},memory:'Promised to put household security first.'},
    {label:'“Power should be open to challenge.”',result:'You promise to explain decisions and accept scrutiny.',effects:{integrity:7,knowledge:3},memory:'Promised open, accountable decisions.'},
    {label:'“We must change who owns and controls things.”',result:'Some members are inspired; others want to hear how the transition would work.',effects:{unions:8,enterprise:-5,organisation:4},memory:'Promised to challenge concentrated ownership.'}]},
  {id:'donor',title:'An offer over coffee',text:'A property investor offers £1,200 to your campaign and asks for a private briefing. The donation is permitted in this fictional scenario; the question is what influence you would allow.',minimum:0,choices:[
    {label:'Accept publicly, with no policy commitment',result:'You publish the donation and your conditions. Campaign resources rise, but tenants remain cautious.',effects:{campaign:1200,enterprise:5,support:-2,integrity:1},memory:'Accepted a disclosed property-sector donation.'},
    {label:'Decline and organise small donations',result:'Volunteers collect a smaller sum. You retain independence at the price of campaigning capacity.',effects:{campaign:300,organisation:5,integrity:4},memory:'Declined a large donor to preserve independence.'}]},
  {id:'family',title:'The empty chair at dinner',text:'Your family has saved you a seat. The branch secretary calls: tonight’s meeting could settle a dispute that has divided the party.',minimum:0,choices:[
    {label:'Keep your family commitment',result:'The meeting goes ahead without you. At home, you finally listen without watching the clock.',effects:{family:7,happiness:4,caucus:-3},memory:'Kept a family commitment during a party dispute.'},
    {label:'Attend the meeting',result:'You help settle the dispute. At home, the missed evening becomes another small hurt.',effects:{caucus:7,organisation:4,family:-6,health:-1},memory:'Missed family time for party work.'}]},
  {id:'socratic',title:'A question you cannot rehearse',text:'A student asks: “You say your policies are fair. Fair to whom? Would you defend them if your own family lost out?”',minimum:0,choices:[
    {label:'Acknowledge the trade-off and explain your principles',result:'You cannot promise everyone will gain. The admission makes the discussion more honest.',effects:{integrity:5,knowledge:4,reputation:2},memory:'Accepted a public challenge to your definition of fairness.'},
    {label:'Promise that nobody will lose',result:'The line plays well in the room. It also creates an expectation no real budget can easily meet.',effects:{reputation:5,integrity:-5},memory:'Promised that nobody would lose from your policies.'}]},
  {id:'wages',title:'The shift that disappeared',text:'Dan tells you the workshop has cut hours. The employer blames outside orders and energy bills. Workers want security; management wants cash.',minimum:0,choices:[
    {label:'Bring workers and management into a public discussion',result:'Neither side gets a guarantee, but each must explain its position.',effects:{knowledge:3,unions:3,enterprise:3,organisation:2}},
    {label:'Organise around the workers’ demands',result:'Workers know where you stand. The employer questions whether you understand its constraints.',effects:{unions:8,support:4,enterprise:-5}},
    {label:'Prioritise the employer’s case for support',result:'You argue that jobs need functioning firms. Union organisers ask who will enforce any promises.',effects:{enterprise:8,unions:-5,caucus:3}}]},
  {id:'rent',title:'The letter on June’s table',text:'June shows you her energy bill beside her rent demand. A policy briefing has become a person waiting for an answer.',minimum:0,choices:[
    {label:'Help her pursue the available support',result:'Casework does not transform the system, but someone knows you followed through.',effects:{support:6,reputation:3,health:-1}},
    {label:'Make the wider housing problem your campaign focus',result:'You build a public case. June still needs help with this month’s bills.',effects:{organisation:6,knowledge:3,support:1},memory:'Made housing a public campaign priority.'}]},
  {id:'smith',title:'The market is not one voice',text:'Small shopkeepers favour competition. A large contractor wants an exclusive arrangement. Both claim to speak for enterprise.',minimum:0,choices:[
    {label:'Insist on an open, accountable process',result:'Smaller businesses gain a hearing. The contractor withdraws an offer of campaign help.',effects:{integrity:5,enterprise:3,organisation:2}},
    {label:'Build an alliance with the large contractor',result:'You gain access and support, while critics question who now has your ear.',effects:{campaign:600,caucus:4,integrity:-4,support:-2},memory:'Built a relationship with a dominant local contractor.'}]},
  {id:'marx',title:'After the wage is paid',text:'At a reading group, Amira asks why workers have little say over a business their labour keeps alive. Another member asks who bears the investment risk.',minimum:0,choices:[
    {label:'Study ownership, risk and surplus before writing a proposal',result:'You resist an easy answer and begin comparing institutional designs.',effects:{knowledge:8,organisation:2}},
    {label:'Commit to workers receiving a share of profits',result:'Union members welcome the commitment. Employers want the details and a workable transition.',effects:{unions:6,enterprise:-3,support:3},memory:'Promised to pursue worker profit-sharing.'}]},
  {id:'nep',title:'A compromise that changes its makers',text:'Your study circle considers Lenin’s NEP: private trade within a system retaining public control in key areas. Could a compromise preserve a project while creating interests that later oppose it?',minimum:0,choices:[
    {label:'Argue for a measured, reviewable transition',result:'You emphasise supply, institutions and the need to revise policy when conditions change.',effects:{knowledge:6,caucus:3,enterprise:2}},
    {label:'Insist on strong worker oversight of any compromise',result:'You focus on who gains lasting power from temporary concessions.',effects:{knowledge:4,unions:5,enterprise:-2}},
    {label:'Question whether the historical analogy fits Britain',result:'You distinguish the historical argument from the circumstances of your own constituency.',effects:{knowledge:7,integrity:2}}]},
  {id:'international',title:'The factory beyond the border',text:'A supplier abroad changes its prices. Local promises suddenly depend on an institution you cannot command. Your reading group returns to Trotsky’s concern with uneven and international development.',minimum:0,choices:[
    {label:'Build links with workers and representatives elsewhere',result:'You widen your network and recognise that local politics sits inside larger relationships.',effects:{organisation:5,knowledge:4,unions:3}},
    {label:'Focus on resilience within the constituency',result:'You prioritise changes you can influence while acknowledging their limits.',effects:{knowledge:4,support:4,enterprise:2}}]},
  {id:'whip',title:'The message from the whip',text:'Your parliamentary group wants unity. Constituents have sent you a stack of letters asking you to take a different position.',minimum:2,choices:[
    {label:'Publicly explain a principled dissent',result:'Constituents hear your reasoning. Party managers remember the rebellion.',effects:{integrity:5,support:5,caucus:-8},memory:'Defied the whip after explaining your reasons.'},
    {label:'Support the party and negotiate privately',result:'You preserve access to the leadership, but some residents feel unheard.',effects:{caucus:7,support:-4,integrity:-1},memory:'Chose party unity over a constituency petition.'}]},
  {id:'committee',title:'Evidence under oath',text:'A committee witness makes a confident claim that conflicts with the figures in your briefing.',minimum:2,choices:[
    {label:'Follow the evidence with precise questions',result:'The contradiction becomes clear. Preparation matters more than theatrical certainty.',effects:{knowledge:5,reputation:5,integrity:2}},
    {label:'Turn the hearing into a headline',result:'Your clip travels widely. Colleagues question whether the scrutiny became a performance.',effects:{reputation:7,knowledge:-2,caucus:-2}}]},
  {id:'budget',title:'A promise meets a balance sheet',text:'Officials explain that the programme you promised needs money, staff and time. Your advisers disagree about which constraint will bind first.',minimum:1,choices:[
    {label:'Publish a phased plan and its uncertainties',result:'You trade an immediate headline for a more accountable commitment.',effects:{knowledge:5,integrity:4,reputation:-1},memory:'Published the limits and timing of a policy promise.'},
    {label:'Keep the ambitious timetable',result:'Supporters applaud your resolve. Expectations rise faster than delivery capacity.',effects:{reputation:5,caucus:3,integrity:-3},memory:'Maintained an ambitious promise despite capacity warnings.'}]},
  {id:'fatigue',title:'The speech you cannot finish',text:'You have read the same paragraph three times. Your colleague suggests cancelling one appearance. The diary is full; your energy is not.',minimum:0,choices:[
    {label:'Take a proper break',result:'You return with a clearer head. A missed appearance is survivable.',effects:{health:5,happiness:4,reputation:-2}},
    {label:'Push through',result:'You fulfil the commitment and pay for it with your health.',effects:{reputation:4,health:-5,happiness:-2}}]},
];
export const politicalTasks=[
  {id:'canvass',name:'Knock on doors',description:'+5 public support, +3 reputation · £30 travel · −1 health'},
  {id:'casework',name:'Hold a residents’ surgery',description:'+4 support, +3 integrity · costs one activity'},
  {id:'organise',name:'Build your branch',description:'+7 organisation, +4 party backing · −1 health'},
  {id:'study',name:'Read and test your arguments',description:'+8 policy knowledge, +2 smarts'},
  {id:'fundraise',name:'Raise small donations',description:'+£250 campaign funds, +2 organisation'},
  {id:'family',name:'Protect an evening at home',description:'+5 family bonds, +4 happiness'},
  {id:'negotiate',name:'Negotiate across factions',description:'+6 party backing, +2 reputation'},
] as const;
export const bills=[
  {id:'warmHomes',name:'Warm Homes Programme',description:'After passage, the constituency programme receives an additional £20,000 monthly grant. Delivery still requires local decisions.'},
  {id:'profitShare',name:'Worker Profit-sharing Bill',description:'After passage, employers distribute 20% of the previous month’s positive operating surplus to workers. Reserves and later hiring can change.'},
  {id:'propertyLevy',name:'Property Income Levy',description:'After passage, up to 5% of scheduled local rent is transferred from property owners to the programme fund each month, limited by available owner cash.'},
] as const;
export type BillId=typeof bills[number]['id'];
export const billStages=['First reading','Commons debate','Committee & report','Lords scrutiny','Royal Assent'] as const;
