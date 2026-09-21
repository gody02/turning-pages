export const townPolicies = [
  { id: 'hold', name: 'Keep a reserve', cost: 0, description: 'Make no new commitment. Keep funds available for later months.', lens: 'Capacity to respond later has value, but present hardship also has a cost.' },
  { id: 'relief', name: 'Household relief', cost: 45000, description: 'Share £45,000 between renting households, weighted towards their unmet essential costs.', lens: 'Protect consumption now. This does not create more energy or housing.' },
  { id: 'business', name: 'Employer bridge grants', cost: 40000, description: 'Split £40,000 between employers before they set next month’s payroll.', lens: 'Protect productive capacity. Owners and workers may benefit differently.' },
  { id: 'retrofit', name: 'Insulate rented homes', cost: 60000, description: 'A £60,000 external contract takes three months. Each completed project cuts renters’ energy use by 6%, up to 30%.', lens: 'Invest in future living standards. The immediate payment leaves the town.' },
] as const;
export type PolicyId = typeof townPolicies[number]['id'];
export const townLenses = [
  {id:'socratic',name:'Socratic inquiry',question:'What would make this decision just?',text:'Ask what you mean by fairness. Would you defend the same rule if you belonged to another household group?',source:'https://plato.stanford.edu/entries/socrates/'},
  {id:'smith',name:'Smith: exchange & institutions',question:'Can people cooperate through a functioning market?',text:'Examine specialisation, competition, trust and concentrated interests. A profitable employer is not by itself evidence that everyone is benefiting.',source:'https://plato.stanford.edu/entries/smith-moral-political/'},
  {id:'marx',name:'Marx: ownership & labour',question:'Who controls production, and who receives its income?',text:'Follow wages, rents, ownership and workers’ dependence on employment. Ask whether relief changes the underlying relationship or only its immediate effects.',source:'https://plato.stanford.edu/entries/marx/'},
  {id:'transition',name:'Lenin & Trotsky: transition',question:'What does a compromise change about the next decision?',text:'Consider tensions between immediate recovery and long-term transformation, and dependence on conditions outside the town. This prototype does not yet simulate the NEP or revolution.',source:'https://www.marxists.org/archive/lenin/works/1921/oct/17.htm'},
] as const;
export type LensId = typeof townLenses[number]['id'];
export const townShocks = [
  {month:1,title:'An ordinary beginning',body:'Mereford starts with 800 households and two employers. Your experimental fund supports a fictional local programme. You are testing choices, not exercising the real powers of a UK council.',energy:1,orders:1},
  {month:4,title:'The price of warmth',body:'Imported energy becomes more expensive. Bills and business energy costs rise together. Renters have fewer assets to fall back on.',energy:1.65,orders:1},
  {month:9,title:'Orders go quiet',body:'Outside customers reduce orders. Employers must balance cash reserves against payroll. Local spending now matters more.',energy:1.4,orders:.76},
  {month:14,title:'A hesitant recovery',body:'External orders begin to recover. Lower energy prices do not reverse savings already spent or hardship already experienced.',energy:1.18,orders:.92},
  {month:19,title:'Work returns',body:'Outside demand strengthens. Hiring can recover gradually when employers can afford it. Earlier investments continue to matter.',energy:1.08,orders:1.06},
] as const;
