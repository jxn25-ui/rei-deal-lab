/* REI Deal Lab — market + cost reference data.
   All figures are planning estimates (2025–26 sources: ACS effective tax rates,
   state insurance averages for $300k dwelling coverage, construction cost indices).
   Every value surfaces in the UI as an editable default — verify with the county
   assessor, an insurance quote, and local contractor bids before you close. */
window.REI = window.REI || {};

/* code: [name, effTaxOwnerOcc%, investorTax% (non-homestead / reassessed at purchase),
          avg annual HO premium @ $300k dwelling, construction cost index (US=1.00), foreclosure process] */
REI.stateRows = {
  AL:["Alabama",0.38,0.75,2900,0.86,"Non-judicial"], AK:["Alaska",1.04,1.10,1300,1.25,"Non-judicial"],
  AZ:["Arizona",0.52,0.65,2000,0.93,"Non-judicial"], AR:["Arkansas",0.57,0.65,3200,0.85,"Non-judicial"],
  CA:["California",0.71,1.15,1500,1.22,"Non-judicial"], CO:["Colorado",0.49,0.55,3600,1.00,"Non-judicial"],
  CT:["Connecticut",1.70,1.85,1800,1.12,"Judicial"], DE:["Delaware",0.56,0.60,1100,1.02,"Judicial"],
  DC:["District of Columbia",0.57,0.85,1400,1.08,"Non-judicial"], FL:["Florida",0.82,1.70,4400,0.92,"Judicial"],
  GA:["Georgia",0.83,1.05,2200,0.88,"Non-judicial"], HI:["Hawaii",0.27,0.40,1000,1.25,"Non-judicial"],
  ID:["Idaho",0.56,0.85,1200,0.92,"Non-judicial"], IL:["Illinois",1.95,2.10,2300,1.10,"Judicial"],
  IN:["Indiana",0.75,1.40,1800,0.92,"Judicial"], IA:["Iowa",1.43,1.55,2100,0.94,"Judicial"],
  KS:["Kansas",1.34,1.45,3800,0.90,"Judicial"], KY:["Kentucky",0.77,0.85,2600,0.90,"Judicial"],
  LA:["Louisiana",0.51,0.95,4200,0.87,"Judicial"], ME:["Maine",1.09,1.15,1200,0.95,"Judicial"],
  MD:["Maryland",0.99,1.10,1700,0.97,"Non-judicial"], MA:["Massachusetts",1.04,1.15,1800,1.18,"Non-judicial"],
  MI:["Michigan",1.28,1.85,2200,0.98,"Non-judicial"], MN:["Minnesota",1.02,1.35,2600,1.06,"Non-judicial"],
  MS:["Mississippi",0.67,1.00,2900,0.85,"Non-judicial"], MO:["Missouri",0.88,0.95,2800,0.97,"Non-judicial"],
  MT:["Montana",0.68,0.75,2800,0.93,"Non-judicial"], NE:["Nebraska",1.50,1.60,4300,0.92,"Both"],
  NV:["Nevada",0.49,0.60,1300,1.03,"Non-judicial"], NH:["New Hampshire",1.61,1.65,1100,0.98,"Non-judicial"],
  NJ:["New Jersey",2.23,2.30,1400,1.16,"Judicial"], NM:["New Mexico",0.67,0.85,2200,0.89,"Judicial"],
  NY:["New York",1.40,1.55,1800,1.15,"Judicial"], NC:["North Carolina",0.70,0.80,2200,0.87,"Non-judicial"],
  ND:["North Dakota",0.88,1.00,2400,0.94,"Judicial"], OH:["Ohio",1.36,1.55,1400,0.94,"Judicial"],
  OK:["Oklahoma",0.80,0.95,4600,0.87,"Both"], OR:["Oregon",0.86,1.00,1100,1.02,"Non-judicial"],
  PA:["Pennsylvania",1.41,1.50,1300,1.02,"Judicial"], RI:["Rhode Island",1.32,1.50,2000,1.10,"Non-judicial"],
  SC:["South Carolina",0.51,1.35,2100,0.87,"Judicial"], SD:["South Dakota",1.08,1.20,3200,0.89,"Both"],
  TN:["Tennessee",0.56,0.65,2400,0.88,"Non-judicial"], TX:["Texas",1.47,2.05,3900,0.88,"Non-judicial"],
  UT:["Utah",0.52,0.90,1300,0.92,"Non-judicial"], VT:["Vermont",1.71,1.80,1000,0.95,"Judicial"],
  VA:["Virginia",0.80,0.85,1600,0.93,"Non-judicial"], WA:["Washington",0.80,0.90,1500,1.05,"Non-judicial"],
  WV:["West Virginia",0.55,1.05,1400,0.92,"Non-judicial"], WI:["Wisconsin",1.51,1.60,1200,1.00,"Judicial"],
  WY:["Wyoming",0.55,0.60,1600,0.92,"Non-judicial"]
};
REI.states = {};
for (const [k, r] of Object.entries(REI.stateRows)) {
  REI.states[k] = { code:k, name:r[0], to:r[1], ti:r[2], ins:r[3], cost:r[4], fc:r[5] };
}

/* City presets: [city, state, investor tax %, HO premium @ $300k (null = state avg), cost index] */
REI.cityRows = [
  ["Houston","TX",2.20,4300,0.88],["Dallas","TX",2.05,4200,0.89],["San Antonio","TX",2.25,3700,0.85],
  ["Austin","TX",1.85,3300,0.92],["Fort Worth","TX",2.30,4100,0.88],["El Paso","TX",2.50,2800,0.83],
  ["Miami","FL",1.95,6800,0.95],["Tampa","FL",1.80,5200,0.92],["Orlando","FL",1.75,4100,0.92],
  ["Jacksonville","FL",1.70,3200,0.90],["Atlanta","GA",1.25,2300,0.92],["Charlotte","NC",0.95,2000,0.88],
  ["Raleigh","NC",0.90,1900,0.88],["Memphis","TN",1.70,3000,0.86],["Nashville","TN",0.85,2300,0.92],
  ["Birmingham","AL",0.80,3100,0.87],["Cleveland","OH",2.40,1500,0.97],["Columbus","OH",1.85,1400,0.95],
  ["Cincinnati","OH",1.90,1500,0.93],["Detroit","MI",3.00,2800,1.00],["Grand Rapids","MI",1.85,1900,0.94],
  ["Indianapolis","IN",1.90,1900,0.93],["Chicago","IL",2.10,2400,1.20],["Kansas City","MO",1.40,3000,1.00],
  ["St. Louis","MO",1.55,2600,1.02],["Milwaukee","WI",2.30,1300,1.03],["Philadelphia","PA",1.40,1500,1.12],
  ["Pittsburgh","PA",2.10,1300,1.02],["Baltimore","MD",2.30,1800,0.96],["New York City","NY",0.95,2000,1.32],
  ["Buffalo","NY",2.20,1500,1.05],["Oklahoma City","OK",1.15,4700,0.86],["Tulsa","OK",1.25,4900,0.86],
  ["Phoenix","AZ",0.60,2100,0.92],["Tucson","AZ",0.95,1800,0.90],["Las Vegas","NV",0.60,1300,1.04],
  ["Denver","CO",0.55,3200,1.00],["Los Angeles","CA",1.20,2100,1.25],["San Diego","CA",1.15,1700,1.18],
  ["Sacramento","CA",1.15,1600,1.18],["Seattle","WA",0.90,1600,1.10],["Portland","OR",1.10,1100,1.05],
  ["Salt Lake City","UT",0.65,1300,0.92],["Albuquerque","NM",1.00,2100,0.89],["New Orleans","LA",1.15,5600,0.88],
  ["Louisville","KY",1.00,2500,0.91],["Columbia","SC",1.60,2100,0.86],["Richmond","VA",1.20,1600,0.93],
  ["Omaha","NE",2.00,4200,0.92],["Minneapolis","MN",1.40,2500,1.10],["Wichita","KS",1.45,4000,0.88],
  ["Little Rock","AR",1.00,3100,0.85],["Boston","MA",1.10,1900,1.25],["Washington","DC",0.85,1400,1.08],
  ["Honolulu","HI",0.35,1000,1.28]
];
REI.cities = REI.cityRows.map(r => ({ n:r[0], s:r[1], t:r[2], i:r[3], m:r[4] }));

/* Repair line items — national-average installed cost (contractor pricing, 2025–26).
   basis: flat | flatS (scaled by sqrt(sqft/1500)) | sqft | bath | roofsq | wall | perim | count | pctHard
   Each level: [label, unit cost, basis]  — level 0 is always "Skip". */
REI.repairCats = [
  { id:"ext", name:"Exterior & Envelope", items:[
    { id:"roof", name:"Roof", note:"Asphalt tear-off priced per roofing square (100 sq ft), pitch + waste included",
      lv:[["Skip",0],["Patch / repair",1400,"flat"],["Replace (tear-off)",560,"roofsq"]] },
    { id:"gutters", name:"Gutters & downspouts", lv:[["Skip",0],["Clean / repair",450,"flat"],["Replace",10,"perim"]] },
    { id:"siding", name:"Siding / exterior paint", note:"Wall area ≈ perimeter × 9 ft × stories",
      lv:[["Skip",0],["Spot repair",2200,"flat"],["Paint exterior",3,"wall"],["Replace vinyl siding",7.5,"wall"]] },
    { id:"windows", name:"Windows", qty:"windows", note:"Vinyl double-hung, installed, per window",
      lv:[["Skip",0],["Repair / reglaze",175,"count"],["Replace",760,"count"]] },
    { id:"extdoors", name:"Exterior doors", qty:"extdoors", lv:[["Skip",0],["Rekey / hardware",120,"count"],["Replace",1350,"count"]] },
    { id:"garage", name:"Garage door", lv:[["Skip",0],["Repair / opener",450,"flat"],["Replace",1900,"flat"]] },
    { id:"landscape", name:"Landscaping & curb appeal", lv:[["Skip",0],["Clean-up & mulch",1200,"flat"],["Full refresh",4800,"flat"]] },
    { id:"concrete", name:"Driveway / walks", lv:[["Skip",0],["Patch & seal",1600,"flat"],["Replace driveway",6200,"flat"]] },
    { id:"fence", name:"Fence", lv:[["Skip",0],["Repair sections",900,"flat"],["Replace (150 lf)",5400,"flat"]] },
    { id:"deck", name:"Deck / porch", lv:[["Skip",0],["Repair & stain",1300,"flat"],["Rebuild",7200,"flat"]] }
  ]},
  { id:"sys", name:"Mechanicals & Structure", items:[
    { id:"hvac", name:"HVAC", note:"Scaled by home size", lv:[["Skip",0],["Service / tune-up",375,"flat"],["Furnace or AC only",5200,"flatS"],["Full system + ducts",11500,"flatS"]] },
    { id:"wh", name:"Water heater", lv:[["Skip",0],["Replace (tank)",1950,"flat"],["Tankless",4200,"flat"]] },
    { id:"elec", name:"Electrical", lv:[["Skip",0],["Repairs / GFCI / fixtures",950,"flat"],["200A panel upgrade",3300,"flat"],["Full rewire",8.5,"sqft"]] },
    { id:"plumb", name:"Plumbing", lv:[["Skip",0],["Repairs / leaks",950,"flat"],["Whole-house repipe (PEX)",5.75,"sqft"]] },
    { id:"sewer", name:"Sewer lateral", note:"Always scope older homes (cast iron / clay / Orangeburg)", lv:[["Skip",0],["Scope + spot repair",2200,"flat"],["Replace lateral",9500,"flat"]] },
    { id:"found", name:"Foundation", lv:[["Skip",0],["Minor (cracks / 2–4 piers)",4800,"flat"],["Major (piering / wall)",19500,"flat"]] },
    { id:"pest", name:"Termite / pest", lv:[["Skip",0],["Treatment",1250,"flat"],["Treatment + wood repair",4200,"flat"]] },
    { id:"mold", name:"Water / mold remediation", lv:[["Skip",0],["Localized",3200,"flat"],["Extensive",10500,"flat"]] }
  ]},
  { id:"int", name:"Interior Finishes", items:[
    { id:"paint", name:"Interior paint", note:"Per floor sq ft, walls + ceilings + trim", lv:[["Skip",0],["Touch-up / partial",1.4,"sqft"],["Full repaint",3.4,"sqft"]] },
    { id:"drywall", name:"Drywall", lv:[["Skip",0],["Patch & texture",1300,"flatS"],["Heavy replace",2.3,"sqft"]] },
    { id:"floor", name:"Flooring", lv:[["Skip",0],["Carpet throughout",3.9,"sqft"],["Refinish hardwood",4.25,"sqft"],["LVP throughout",6.6,"sqft"]] },
    { id:"kitchen", name:"Kitchen", lv:[["Skip",0],["Refresh (paint cabs, hardware, counters)",7800,"flat"],["Mid remodel (new cabs + quartz)",23000,"flat"],["Full gut / layout change",44000,"flat"]] },
    { id:"bath", name:"Bathrooms", note:"Priced per bathroom", lv:[["Skip",0],["Refresh (vanity, toilet, fixtures)",3600,"bath"],["Mid (tile surround + vanity)",9800,"bath"],["Full gut",18500,"bath"]] },
    { id:"appl", name:"Appliances", lv:[["Skip",0],["Basic package",3900,"flat"],["Stainless mid package",6800,"flat"]] },
    { id:"doors", name:"Interior doors & trim", qty:"intdoors", lv:[["Skip",0],["Repair / hardware",60,"count"],["Replace door + casing",340,"count"]] },
    { id:"light", name:"Lighting & fixtures", lv:[["Skip",0],["Refresh",1900,"flatS"],["Full replace + recessed",4800,"flatS"]] },
    { id:"safety", name:"Smoke / CO / code items", lv:[["Skip",0],["Detectors + handrails",650,"flat"]] }
  ]},
  { id:"soft", name:"Site, Soft Costs & Buffer", items:[
    { id:"trash", name:"Trash-out / cleanout", lv:[["Skip",0],["Light",950,"flat"],["Hoarder / heavy",3800,"flat"]] },
    { id:"dumpster", name:"Dumpsters (30 yd)", qty:"dumpsters", lv:[["Skip",0],["Haul",590,"count"]] },
    { id:"permits", name:"Permits & inspections", lv:[["Skip",0],["Standard (1.5% of hard)",1.5,"pctHard"],["Heavy scope (3%)",3,"pctHard"]] },
    { id:"gc", name:"GC overhead & profit", note:"Skip if you manage subs yourself", lv:[["Skip",0],["GC 15%",15,"pctHard"],["GC 20%",20,"pctHard"]] },
    { id:"cont", name:"Contingency", note:"Applied to hard + soft. Older homes deserve 15%+", lv:[["Skip",0],["5%",5,"pctHard"],["10%",10,"pctHard"],["15%",15,"pctHard"],["20%",20,"pctHard"]] }
  ]}
];

/* Quick $/sq ft rehab bands (national, before regional index) */
REI.rehabBands = [
  { id:"cosmetic", name:"Cosmetic", lo:15, hi:25, d:"Paint, fixtures, carpet, landscaping. Systems are fine." },
  { id:"light", name:"Light", lo:25, hi:40, d:"Cosmetic + flooring, appliances, kitchen and bath refresh." },
  { id:"moderate", name:"Moderate", lo:40, hi:60, d:"New kitchen, baths, flooring, one or two major systems." },
  { id:"heavy", name:"Heavy", lo:60, hi:85, d:"Roof, HVAC, electrical or plumbing plus full interior." },
  { id:"gut", name:"Full gut", lo:85, hi:125, d:"Down to studs. Structural, all systems, layout changes." }
];

/* Condition scan → item levels.  Each answer sets item levels (index into lv). */
REI.scan = [
  { q:"Roof age / condition", opts:[["Under 10 yrs",{roof:0}],["10–18 yrs, some wear",{roof:1}],["18+ yrs or leaking",{roof:2,gutters:2}]] },
  { q:"HVAC age", opts:[["Under 10 yrs",{hvac:1}],["10–15 yrs",{hvac:2}],["15+ yrs / missing",{hvac:3}]] },
  { q:"Kitchen", opts:[["Dated but clean",{kitchen:1,appl:1}],["Worn, cabinets OK",{kitchen:2,appl:1}],["Gutted / unusable",{kitchen:3,appl:2}]] },
  { q:"Bathrooms", opts:[["Functional",{bath:1}],["Leaks / dated tile",{bath:2}],["Rotten subfloor / gutted",{bath:3}]] },
  { q:"Flooring", opts:[["Good",{floor:0}],["Carpet stained",{floor:1}],["Mixed / damaged",{floor:3}]] },
  { q:"Walls & paint", opts:[["Clean",{paint:1,drywall:0}],["Needs full paint",{paint:2,drywall:1}],["Holes / water damage",{paint:2,drywall:2}]] },
  { q:"Electrical", opts:[["Modern breaker panel",{elec:1}],["Fuse box / FPE / Zinsco",{elec:2}],["Knob & tube",{elec:3}]] },
  { q:"Plumbing", opts:[["Copper / PEX",{plumb:0}],["Some leaks",{plumb:1}],["Galvanized / polybutylene",{plumb:2}]] },
  { q:"Foundation", opts:[["Solid",{found:0}],["Hairline cracks / sticking doors",{found:1}],["Bowing walls / major settling",{found:2}]] },
  { q:"Junk / debris", opts:[["Broom clean",{trash:0,dumpster:0}],["Furniture left",{trash:1,dumpster:1}],["Hoarder",{trash:2,dumpster:1}]] }
];

/* "Method Match" training scenarios */
REI.scenarios = [
  { s:"Seller inherited a house with no mortgage. Needs $40k+ of work, lives out of state, wants it gone in 2 weeks. ARV $210k.",
    a:"Wholesale", o:["Wholesale","Subject-To","Lease option","Novation"],
    e:"Free and clear + heavy rehab + speed = a cash offer. With no existing debt there's nothing to take over, and the seller won't wait for a retail listing. Lock it at your MAO and assign it to a rehabber (or flip it yourself)." },
  { s:"Seller has a 3.1% mortgage, owes $182k on a $195k house, is relocating for work and can't make two payments in a row. Rent comps $1,900.",
    a:"Subject-To", o:["Wholesale","Subject-To","Fix & flip","Novation"],
    e:"Thin equity kills any cash offer, but a 3.1% loan is a gift. Take title subject to the existing financing, cure the arrears, and keep the low payment against market rent. Disclose due-on-sale risk to the seller in writing." },
  { s:"Retiree owns a paid-off duplex, wants monthly income, hates the idea of a big capital gains bill, and is in no rush.",
    a:"Seller finance", o:["Seller finance","Wholesale","Subject-To","Wholetail"],
    e:"Free and clear + wants income + tax-sensitive = seller carry. An installment sale spreads the seller's gain over years, and you get terms (low down, fair rate) instead of fighting over price." },
  { s:"House needs only paint, carpet and a deep clean. Sells as-is to retail buyers in this zip within 30 days. Seller wants top dollar but can't afford to fix it.",
    a:"Novation", o:["Novation","Wholesale","BRRRR","Subject-To"],
    e:"Light repairs + strong retail demand + seller wants more than a cash offer: a novation agreement lets you fund light work, list at retail, and pay the seller a guaranteed net that beats your cash offer while you keep the spread." },
  { s:"Distressed property in a B-class neighborhood: buy $95k, rehab $35k, ARV $185k, rent $1,650. You have $45k cash and want to keep doors.",
    a:"BRRRR", o:["BRRRR","Wholesale","Novation","Lease option"],
    e:"All-in $130k vs 75% LTV refi of $138,750 — this can return nearly all your capital. Buy with hard money, rehab, rent, refinance, repeat. Limited cash + want long-term holds is the BRRRR profile." },
  { s:"Vacant, ugly-but-livable house bought cheap at auction. Market is hot. A deep clean and carpet would make it MLS-presentable; a full rehab would add only $15k of value.",
    a:"Wholetail", o:["Wholetail","Fix & flip","Subject-To","Seller finance"],
    e:"When the delta between as-is and fully renovated value is small, skip the long rehab. Clean it, list it, and sell to owner-occupants and investors on the MLS within 60–90 days." },
  { s:"Seller won't come down on price (wants $260k, ARV $265k) but owns it free and clear and says 'I just want the most money.' Rent is $2,200.",
    a:"Seller finance", o:["Seller finance","Wholesale","Fix & flip","Novation"],
    e:"No margin at their price for a cash exit. Give them price, take terms: e.g., $260k at 0–3% interest, 10-year balloon. A low rate turns a retail price into a cash-flowing rental." },
  { s:"Tired landlord with a house worth $240k, owes $150k at 6.9%. Won't sell below $225k. Tenant wants to buy but has a 610 credit score and $8k saved.",
    a:"Lease option", o:["Lease option","Wholesale","Subject-To","BRRRR"],
    e:"Sandwich lease option: lease-option from the landlord at $225k, sub-lease-option to the tenant-buyer at ~$250k with $8k option fee. You profit on the option-fee spread, monthly spread, and back-end spread with little capital." },
  { s:"Turnkey 3/2 in a growing suburb: price $280k, rent $2,450, needs nothing. You have 25% down and stable W-2 income.",
    a:"Buy & hold", o:["Buy & hold","Wholesale","Novation","Wholetail"],
    e:"No forced appreciation to capture, no motivated-seller discount — this is a straight underwriting exercise: PITI, opex, CoC, DSCR. Buy it only if the cash flow survives realistic vacancy, repairs, capex and management." },
  { s:"Pre-foreclosure: auction in 3 weeks. Owes $96k at 4.25%, value $175k, needs $25k of work. Seller wants to walk away with something.",
    a:"Subject-To", o:["Subject-To","Lease option","Novation","Seller finance"],
    e:"$79k of gross equity and a cheap rate. Reinstate the loan, take title subject-to, give the seller moving money. You can then rent, wrap it to an owner-occupant, or rehab and refinance later. Time pressure rules out a 60-day retail listing." },
  { s:"ARV $320k, as-is value $230k, needs $55k of work. Seller wants a quick cash close. Your buyers list says flippers in this area pay up to 75% of ARV minus repairs.",
    a:"Wholesale", o:["Wholesale","Subject-To","Lease option","Seller finance"],
    e:"Buyer MAO = $320k × 75% − $55k = $185k. Contract around $170k and assign for ~$15k. Classic wholesale: motivated cash seller, rehab-heavy, active buyer list." },
  { s:"You're buying your first property and want to live in it. 4-unit building, $520k, each unit rents $1,450. You have $25k.",
    a:"Buy & hold", o:["Buy & hold","Wholesale","Novation","Subject-To"],
    e:"House hack: FHA allows 3.5% down on 1–4 units if you owner-occupy. Live in one unit, rent three. Underwrite it as buy & hold with the FHA loan preset (UFMIP + MIP)." }
];

/* Formula library used by Tool Belt + drills */
REI.glossary = {
  PITI:"Principal + Interest + Taxes + Insurance. Add HOA and mortgage insurance for PITIA / total housing payment.",
  NOI:"Net Operating Income: effective gross income minus operating expenses. Excludes the mortgage.",
  CoC:"Cash-on-cash return: annual pre-tax cash flow ÷ total cash you put in.",
  DSCR:"Debt Service Coverage Ratio: NOI ÷ annual debt service. Lenders want 1.20–1.25+.",
  ARV:"After Repair Value: what the property sells for fully renovated, supported by renovated sold comps."
};
