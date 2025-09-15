/**
 * Public crime announcement messages
 * Used for server-wide notifications when crimes occur
 */

export interface CrimeAnnouncement {
  successMessages: string[];
  witnessMessages: string[];
  jailMessages: string[];
}

export const crimeAnnouncements: Record<string, CrimeAnnouncement> = {
  // === PETTY CRIMES ===
  pickpocketing: {
    successMessages: [
      "🚨 **CRIME ALERT** 🚨\nA pickpocketing incident has been reported in the area. Keep your valuables secure!",
      "⚠️ **SECURITY NOTICE** ⚠️\nWitnesses report suspicious activity near the market. Stay vigilant!",
      "🔍 **POLICE BULLETIN** 🔍\nA theft has occurred downtown. Citizens are advised to be cautious.",
      "📢 **PUBLIC WARNING** 📢\nPickpocketing activity detected. Watch your belongings!",
      "🚔 **INCIDENT REPORT** 🚔\nPetty theft reported in the vicinity. Remain alert!",
    ],
    witnessMessages: [
      "👁️ **WITNESS REPORT** 👁️\n{username} was seen acting suspiciously near the shopping district!",
      "📱 **CITIZEN TIP** 📱\nSomeone reported seeing {username} engaging in questionable behavior!",
      "🕵️ **EYEWITNESS ACCOUNT** 🕵️\n{username} was spotted in the area when the theft occurred!",
      "📞 **ANONYMOUS TIP** 📞\nA concerned citizen reported {username}'s suspicious activities!",
    ],
    jailMessages: [
      "🚔 **ARREST MADE** 🚔\n{username} has been caught red-handed and sentenced to jail for pickpocketing!",
      "⚖️ **JUSTICE SERVED** ⚖️\n{username} was apprehended during a failed theft attempt and is now behind bars!",
      "🔒 **CRIMINAL CAPTURED** 🔒\n{username} tried to pickpocket someone but got caught by the authorities!",
    ],
  },

  shoplifting: {
    successMessages: [
      "🏪 **RETAIL THEFT ALERT** 🏪\nMerchandise theft reported in the shopping district. Store security heightened!",
      "🛒 **SHOPLIFTING INCIDENT** 🛒\nRetail crime detected. Businesses advised to check inventory!",
      "🚨 **STORE SECURITY BREACH** 🚨\nUnauthorized merchandise removal reported. Enhanced surveillance active!",
      "📦 **INVENTORY CRIME** 📦\nTheft from retail establishments detected. Shoppers stay alert!",
      "🔍 **RETAIL WATCH** 🔍\nSuspicious shopping activity reported. Store owners be vigilant!",
    ],
    witnessMessages: [
      "🏪 **STORE WITNESS** 🏪\n{username} was seen concealing merchandise without paying!",
      "🛒 **SHOPPING SUSPECT** 🛒\nEmployees report {username} acting suspiciously in the store!",
      "📦 **THEFT SPOTTER** 📦\n{username} was observed taking items without purchasing!",
      "🚨 **RETAIL TIP** 🚨\nSecurity cameras captured {username} shoplifting!",
    ],
    jailMessages: [
      "🏪 **SHOPLIFTER CAUGHT** 🏪\n{username} was apprehended while attempting to steal merchandise!",
      "🛒 **RETAIL THIEF JAILED** 🛒\n{username} failed to escape with stolen goods and is now in custody!",
      "⚖️ **MERCHANT CRIMINAL ARRESTED** ⚖️\n{username} is behind bars for shoplifting!",
    ],
  },

  bike_theft: {
    successMessages: [
      "🚲 **BIKE THEFT ALERT** 🚲\nBicycle theft reported in the area. Secure your bikes properly!",
      "🔒 **CYCLING SECURITY NOTICE** 🔒\nUnauthorized bicycle removal detected. Check your locks!",
      "⚠️ **TRANSPORT CRIME** ⚠️\nTwo-wheeled vehicle theft reported. Enhanced bike rack security advised!",
      "🚨 **BICYCLE INCIDENT** 🚨\nCycle theft activity in the vicinity. Use stronger locks!",
      "🔍 **BIKE RACK BREACH** 🔍\nSuspicious activity around bicycle parking areas reported!",
    ],
    witnessMessages: [
      "🚲 **CYCLING WITNESS** 🚲\n{username} was seen tampering with locked bicycles!",
      "🔒 **BIKE SECURITY TIP** 🔒\nResidents report {username} acting suspiciously near bike racks!",
      "⚠️ **TRANSPORT SUSPECT** ⚠️\n{username} was observed attempting to break bike locks!",
      "🚨 **CYCLE SPOTTER** 🚨\nSomeone saw {username} stealing a bicycle!",
    ],
    jailMessages: [
      "🚲 **BIKE THIEF BUSTED** 🚲\n{username} was caught stealing a bicycle and is now in jail!",
      "🔒 **CYCLE CRIMINAL JAILED** 🔒\n{username} failed to escape on a stolen bike!",
      "⚖️ **TRANSPORT THIEF ARRESTED** ⚖️\n{username} is in custody for bicycle theft!",
    ],
  },

  // === FRAUD CRIMES ===
  credit_card_fraud: {
    successMessages: [
      "💳 **CREDIT FRAUD ALERT** 💳\nUnauthorized credit card activity detected. Check your statements!",
      "🏦 **FINANCIAL FRAUD WARNING** 🏦\nCredit card misuse reported. Monitor your accounts closely!",
      "💰 **PAYMENT FRAUD NOTICE** 💰\nIllegal credit transactions detected. Contact your bank immediately!",
      "🚨 **CARD SECURITY BREACH** 🚨\nCredit card fraud activity reported. Review recent purchases!",
      "📱 **DIGITAL THEFT ALERT** 📱\nOnline payment fraud detected. Secure your financial information!",
    ],
    witnessMessages: [
      "💳 **FRAUD WITNESS** 💳\n{username} was seen using suspicious payment methods!",
      "🏦 **FINANCIAL TIP** 🏦\nMerchants report {username} conducting questionable transactions!",
      "💰 **PAYMENT SUSPECT** 💰\n{username} was observed using multiple credit cards suspiciously!",
      "📱 **DIGITAL CRIMINAL ID** 📱\nAuthorities linked {username} to fraudulent online purchases!",
    ],
    jailMessages: [
      "💳 **FRAUD CRIMINAL CAUGHT** 💳\n{username} was arrested for credit card fraud!",
      "🏦 **FINANCIAL SCAMMER JAILED** �\n{username} failed to cover their fraudulent tracks!",
      "⚖️ **CARD CRIMINAL ARRESTED** ⚖️\n{username} is in custody for credit card misuse!",
    ],
  },

  // === THEFT CRIMES ===
  car_theft: {
    successMessages: [
      "🚗 **AUTO THEFT ALERT** 🚗\nVehicle theft reported in the area. Secure your cars properly!",
      "🔐 **CAR SECURITY BREACH** 🔐\nUnauthorized vehicle removal detected. Check parking areas!",
      "⚠️ **MOTOR VEHICLE CRIME** ⚠️\nCar theft activity reported. Enhanced parking security advised!",
      "🚨 **AUTOMOTIVE INCIDENT** 🚨\nVehicle theft in the vicinity. Use car alarms and secure parking!",
      "🔍 **PARKING LOT BREACH** 🔍\nSuspicious activity around parked vehicles reported!",
    ],
    witnessMessages: [
      "🚗 **AUTO WITNESS** 🚗\n{username} was seen breaking into vehicles!",
      "🔐 **CAR SECURITY TIP** 🔐\nResidents report {username} tampering with parked cars!",
      "⚠️ **MOTOR SUSPECT** ⚠️\n{username} was observed attempting to steal a vehicle!",
      "🚨 **AUTOMOTIVE SPOTTER** 🚨\nSomeone saw {username} driving off in a stolen car!",
    ],
    jailMessages: [
      "🚗 **CAR THIEF BUSTED** 🚗\n{username} was caught stealing a vehicle and is now in jail!",
      "🔐 **AUTO CRIMINAL JAILED** 🔐\n{username} failed to escape in the stolen car!",
      "⚖️ **VEHICLE THIEF ARRESTED** ⚖️\n{username} is in custody for grand theft auto!",
    ],
  },

  burglary: {
    successMessages: [
      "�🏠 **BREAK-IN ALERT** 🏠\nA burglary has been reported in a residential area. Secure your homes!",
      "🚨 **HOME INVASION** 🚨\nProperty crime detected. Check your locks and security systems!",
      "🔓 **SECURITY BREACH** 🔓\nUnauthorized entry reported. Neighbors should stay vigilant!",
      "🏘️ **NEIGHBORHOOD WATCH** 🏘️\nSuspicious break-in activity in the area. Be on high alert!",
      "🚪 **PROPERTY CRIME** 🚪\nA residence has been compromised. Review your home security!",
    ],
    witnessMessages: [
      "🏠 **NEIGHBOR ALERT** 🏠\n{username} was seen near a house that was later burgled!",
      "👀 **SUSPICIOUS ACTIVITY** 👀\nResidents report seeing {username} casing properties!",
      "🚨 **WITNESS STATEMENT** 🚨\n{username} was spotted leaving the scene of a break-in!",
      "📹 **SECURITY FOOTAGE** 📹\nSurveillance shows {username} in the area during the burglary!",
    ],
    jailMessages: [
      "🏠 **BURGLAR BUSTED** 🏠\n{username} was caught breaking into a house and is now in custody!",
      "🔒 **HOME INVADER JAILED** 🔒\n{username} failed to escape after a botched burglary attempt!",
      "⚖️ **PROPERTY CRIMINAL CAUGHT** ⚖️\n{username} was arrested for attempted burglary!",
    ],
  },

  // === ROBBERY CRIMES ===
  store_robbery: {
    successMessages: [
      "🏪 **STORE ROBBERY ALERT** 🏪\nRetail establishment robbery reported. Business owners increase security!",
      "💰 **COMMERCIAL HEIST** 💰\nStore robbery detected. Enhanced merchant protection advised!",
      "🚨 **RETAIL CRIME EMERGENCY** 🚨\nArmed robbery at local business. Avoid the area!",
      "🔫 **MERCHANT THREAT** 🔫\nStore employees threatened during robbery. Security forces responding!",
      "⚠️ **BUSINESS SECURITY ALERT** ⚠️\nCommercial robbery compromises local safety!",
    ],
    witnessMessages: [
      "🏪 **STORE WITNESS** 🏪\n{username} was identified during the store robbery!",
      "💰 **ROBBERY SPOTTER** 💰\nCustomers report seeing {username} threatening store employees!",
      "🚨 **HEIST WITNESS** 🚨\n{username} was observed fleeing the scene of a store robbery!",
      "🔫 **COMMERCIAL CRIME ID** 🔫\nSecurity footage shows {username} was involved in the robbery!",
    ],
    jailMessages: [
      "🏪 **STORE ROBBER CAUGHT** 🏪\n{username} was apprehended during a failed store robbery!",
      "💰 **COMMERCIAL CRIMINAL JAILED** 💰\n{username} couldn't escape after the botched heist!",
      "⚖️ **RETAIL ROBBER ARRESTED** ⚖️\n{username} is in custody for armed robbery!",
    ],
  },

  bank_robbery: {
    successMessages: [
      "🏦 **BANK SECURITY ALERT** 🏦\nA financial institution has been compromised. Enhanced security measures in effect!",
      "💰 **MAJOR HEIST** 💰\nSignificant financial crime reported. All banks on high alert!",
      "🚨 **FINANCIAL EMERGENCY** 🚨\nBank security has been breached. Authorities investigating!",
      "🏛️ **INSTITUTION BREACH** 🏛️\nA major financial crime has shaken the district!",
      "💳 **BANK INCIDENT** 💳\nSecurity protocols activated across all financial institutions!",
    ],
    witnessMessages: [
      "🏦 **BANK WITNESS** 🏦\n{username} was identified near the bank during the heist!",
      "💰 **SECURITY ALERT** 💰\nBank cameras captured {username} in the vicinity!",
      "🚨 **EYEWITNESS REPORT** 🚨\n{username} was seen acting suspicious near the financial district!",
      "📹 **SURVEILLANCE MATCH** 📹\nFootage shows {username} was involved in the bank incident!",
    ],
    jailMessages: [
      "🏦 **BANK ROBBER CAPTURED** 🏦\n{username} was arrested during a failed bank heist!",
      "💰 **HEIST FOILED** 💰\n{username} couldn't escape after botching a bank robbery!",
      "⚖️ **FINANCIAL CRIMINAL JAILED** ⚖️\n{username} is now behind bars for attempted bank robbery!",
    ],
  },

  // === WHITE COLLAR CRIMES ===
  hacking: {
    successMessages: [
      "💻 **CYBER ATTACK ALERT** 💻\nComputer systems breached. Enhanced digital security protocols active!",
      "🔐 **NETWORK SECURITY BREACH** 🔐\nUnauthorized system access detected. Change passwords immediately!",
      "⚠️ **DIGITAL CRIME WARNING** ⚠️\nCyber criminal activity reported. Secure your online accounts!",
      "🚨 **SYSTEM INTRUSION** 🚨\nHacking attempt compromises local networks. Update security!",
      "📱 **TECH SECURITY ALERT** 📱\nDigital theft activity detected. Monitor your devices!",
    ],
    witnessMessages: [
      "💻 **CYBER WITNESS** 💻\n{username} was traced to suspicious network activity!",
      "🔐 **DIGITAL TIP** 🔐\nIT departments report {username} attempting unauthorized access!",
      "⚠️ **HACKER IDENTIFIED** ⚠️\n{username} was linked to recent cyber attacks!",
      "🚨 **TECH CRIME SPOTTER** 🚨\nSecurity experts flagged {username} for malicious activity!",
    ],
    jailMessages: [
      "💻 **HACKER BUSTED** 💻\n{username} was caught during a cyber attack and is now in jail!",
      "🔐 **CYBER CRIMINAL JAILED** 🔐\n{username} failed to cover their digital tracks!",
      "⚖️ **TECH CRIMINAL ARRESTED** ⚖️\n{username} is in custody for computer crimes!",
    ],
  },

  // === ORGANIZED CRIME ===
  drug_dealing: {
    successMessages: [
      "💊 **DRUG ACTIVITY ALERT** 💊\nIllegal substance distribution reported. Avoid suspicious areas!",
      "🚫 **NARCOTICS WARNING** 🚫\nDrug trafficking detected in the area. Stay away from dealers!",
      "💉 **SUBSTANCE ALERT** 💉\nIllegal drug activity reported. Contact authorities if you see anything!",
      "🔍 **ANTI-DRUG OPERATION** 🔍\nNarcotics enforcement is investigating suspicious activity!",
      "⚠️ **DEALER SPOTTED** ⚠️\nIllegal drug sales reported. Community vigilance requested!",
    ],
    witnessMessages: [
      "💊 **DRUG TIP** 💊\n{username} was reported engaging in suspicious exchanges!",
      "🚫 **NARCOTICS SUSPECT** 🚫\nCitizens report {username} involved in drug-related activity!",
      "👁️ **DEALER IDENTIFIED** 👁️\n{username} was seen making questionable transactions!",
      "📞 **CRIME STOPPERS** 📞\nAnonymous tip identifies {username} as a suspected dealer!",
    ],
    jailMessages: [
      "💊 **DRUG DEALER BUSTED** 💊\n{username} was caught red-handed dealing narcotics!",
      "🚫 **NARCOTICS ARREST** 🚫\n{username} failed to escape during a drug bust!",
      "⚖️ **DEALER JAILED** ⚖️\n{username} is now in custody for drug trafficking!",
    ],
  },

  extortion: {
    successMessages: [
      "💼 **EXTORTION ALERT** 💼\nBusinesses report intimidation tactics. Enhanced protection advised!",
      "🤝 **PROTECTION RACKET** 🤝\nIllegal protection schemes detected. Business owners stay vigilant!",
      "💰 **INTIMIDATION REPORTED** 💰\nExtortion activity in the commercial district. Be cautious!",
      "🏢 **BUSINESS THREAT** 🏢\nCompanies advised to review security due to criminal pressure!",
      "⚠️ **CRIMINAL PRESSURE** ⚠️\nExtortion schemes targeting local establishments!",
    ],
    witnessMessages: [
      "💼 **BUSINESS TIP** 💼\n{username} was seen pressuring local business owners!",
      "🤝 **INTIMIDATION WITNESS** 🤝\nEmployees report {username} making threatening demands!",
      "🏢 **COMMERCIAL CRIME** 🏢\n{username} was observed engaging in extortion activities!",
      "💰 **PROTECTION SCHEME** 💰\nBusinesses identify {username} as running illegal operations!",
    ],
    jailMessages: [
      "💼 **EXTORTIONIST CAUGHT** 💼\n{username} was arrested for intimidating business owners!",
      "🤝 **RACKETEER JAILED** 🤝\n{username} failed in an extortion attempt and is now locked up!",
      "⚖️ **INTIMIDATOR ARRESTED** ⚖️\n{username} is behind bars for criminal extortion!",
    ],
  },

  money_laundering: {
    successMessages: [
      "💳 **FINANCIAL CRIMES ALERT** 💳\nSuspicious financial activity detected. Monitor your accounts!",
      "🏦 **MONEY FLOW WARNING** 🏦\nIrregular transactions reported. Financial institutions on alert!",
      "💰 **LAUNDERING DETECTED** 💰\nClean money schemes uncovered. Banking security enhanced!",
      "📊 **FINANCIAL ANOMALY** 📊\nUnusual money movements trigger investigation protocols!",
      "🔍 **AUDIT ALERT** 🔍\nFinancial irregularities discovered. Authorities investigating!",
    ],
    witnessMessages: [
      "💳 **FINANCIAL WITNESS** 💳\n{username} was involved in suspicious financial transactions!",
      "🏦 **BANKING ALERT** 🏦\nTellers report {username} conducting irregular operations!",
      "💰 **MONEY TRAIL** 💰\n{username} was traced in complex financial schemes!",
      "📊 **AUDIT DISCOVERY** 📊\nInvestigators linked {username} to money laundering activities!",
    ],
    jailMessages: [
      "💳 **MONEY LAUNDERER BUSTED** 💳\n{username} was caught in a financial crimes investigation!",
      "🏦 **FINANCIAL CRIMINAL JAILED** 🏦\n{username} failed to cover their money laundering tracks!",
      "⚖️ **LAUNDERER ARRESTED** ⚖️\n{username} is now in custody for financial crimes!",
    ],
  },

  assassination: {
    successMessages: [
      "🎯 **SECURITY THREAT** 🎯\nHigh-profile incident reported. VIP protection measures activated!",
      "🕴️ **ELITE SECURITY ALERT** 🕴️\nThreat to prominent figures detected. Enhanced vigilance required!",
      "⚠️ **DANGER LEVEL ELEVATED** ⚠️\nSerious criminal activity reported. Public safety priority!",
      "🔒 **MAXIMUM SECURITY** 🔒\nCritical incident triggers citywide protection protocols!",
      "🚨 **HIGH ALERT STATUS** 🚨\nExtreme criminal activity detected. All units mobilized!",
    ],
    witnessMessages: [
      "🎯 **ELITE WITNESS** 🎯\n{username} was spotted in restricted VIP areas!",
      "🕴️ **SECURITY BREACH** 🕴️\nProtection detail reports {username} as a person of interest!",
      "⚠️ **THREAT IDENTIFIED** ⚠️\n{username} was observed conducting high-level criminal activity!",
      "🔒 **VIP SECURITY ALERT** 🔒\nElite protection services flag {username} as dangerous!",
    ],
    jailMessages: [
      "🎯 **ELITE CRIMINAL CAPTURED** 🎯\n{username} was stopped before completing their deadly mission!",
      "🕴️ **ASSASSIN FOILED** 🕴️\n{username} failed in their high-stakes criminal attempt!",
      "⚖️ **DANGEROUS CRIMINAL JAILED** ⚖️\n{username} is now in maximum security for attempted assassination!",
    ],
  },

  arms_trafficking: {
    successMessages: [
      "🔫 **WEAPONS ALERT** 🔫\nIllegal arms activity detected. Enhanced security sweeps initiated!",
      "⚔️ **TRAFFICKING WARNING** ⚔️\nWeapons smuggling reported. Citizens should report suspicious packages!",
      "🛡️ **ARMS CONTROL BREACH** 🛡️\nUnauthorized weapons distribution detected. Military alerted!",
      "🚨 **WEAPONS EMERGENCY** 🚨\nArms trafficking compromises public safety. Stay vigilant!",
      "🔒 **CONTRABAND ALERT** 🔒\nIllegal weapons trade discovered. Security forces mobilized!",
    ],
    witnessMessages: [
      "🔫 **ARMS WITNESS** 🔫\n{username} was seen handling suspicious weapon crates!",
      "⚔️ **WEAPONS TIP** ⚔️\nCitizens report {username} involved in illegal arms transactions!",
      "🛡️ **TRAFFICKING SUSPECT** 🛡️\n{username} was identified moving weapon shipments!",
      "🚨 **CONTRABAND SPOTTER** 🚨\nAuthorities link {username} to illegal arms distribution!",
    ],
    jailMessages: [
      "🔫 **ARMS DEALER BUSTED** 🔫\n{username} was caught trafficking illegal weapons!",
      "⚔️ **WEAPONS SMUGGLER JAILED** ⚔️\n{username} failed to escape with their illegal cargo!",
      "⚖️ **TRAFFICKER ARRESTED** ⚖️\n{username} is now in custody for weapons trafficking!",
    ],
  },

  heist: {
    successMessages: [
      "💎 **MAJOR HEIST ALERT** 💎\nHigh-value target compromised. Maximum security protocols activated!",
      "🏛️ **GRAND THEFT** 🏛️\nSignificant criminal operation detected. All units responding!",
      "💰 **MEGA CRIME** 💰\nLarge-scale theft reported. Citywide manhunt initiated!",
      "🎭 **MASTER CRIMINAL** 🎭\nSophisticated crime syndicate activity detected!",
      "🚨 **CODE RED HEIST** 🚨\nElite criminal operation compromises major institution!",
    ],
    witnessMessages: [
      "💎 **HEIST WITNESS** 💎\n{username} was identified as part of the master criminal operation!",
      "🏛️ **MAJOR CRIME SPOTTER** 🏛️\nSecurity footage shows {username} involved in the grand heist!",
      "💰 **CRIMINAL MASTERMIND** 💰\n{username} was seen coordinating the sophisticated theft!",
      "🎭 **ELITE CRIMINAL ID** 🎭\nInvestigators link {username} to the high-profile heist!",
    ],
    jailMessages: [
      "💎 **HEIST MASTERMIND CAUGHT** 💎\n{username} was apprehended during their elaborate criminal scheme!",
      "🏛️ **GRAND THIEF JAILED** 🏛️\n{username} couldn't escape after their heist went wrong!",
      "⚖️ **MASTER CRIMINAL ARRESTED** ⚖️\n{username} is now in maximum security for grand theft!",
    ],
  },
};

/**
 * Get a random message from an array
 */
export function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get random crime announcement based on crime type and outcome
 */
export function getCrimeAnnouncement(
  crimeId: string,
  success: boolean,
  username?: string
): string {
  const announcement = crimeAnnouncements[crimeId];
  if (!announcement) {
    // Fallback for unknown crimes
    if (success) {
      return "🚨 **CRIME ALERT** 🚨\nCriminal activity detected in the area. Stay vigilant!";
    } else {
      return `🚔 **ARREST MADE** 🚔\n${username} has been apprehended and sent to jail!`;
    }
  }

  if (!success) {
    // Crime failed - use jail message
    const message = getRandomMessage(announcement.jailMessages);
    return message.replace("{username}", username || "A criminal");
  }

  // Crime succeeded - 20% chance of witness message, 80% generic
  const useWitness = Math.random() < 0.2 && username;
  if (useWitness) {
    const message = getRandomMessage(announcement.witnessMessages);
    return message.replace("{username}", username);
  } else {
    return getRandomMessage(announcement.successMessages);
  }
}
