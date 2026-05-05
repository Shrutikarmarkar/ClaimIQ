import { SampleClaim } from './types';

export const SAMPLE_CLAIMS: SampleClaim[] = [
  {
    id: 'claim-1',
    label: 'Car Accident',
    type: 'Auto Collision',
    amount: '$8,000',
    riskLevel: 'LOW',
    text: `Claimant: James Morrison
Date of Incident: March 14, 2025
Incident Type: Vehicle Collision
Location: Highway 101 Southbound, Exit 42, San Jose, CA
Claim Amount: $8,000
Prior Claims History: None — this is my first insurance claim.

Description:
On the afternoon of March 14, 2025 at approximately 2:45 PM, I was driving southbound on Highway 101 when a silver Ford F-150 (license plate 7XZH432) ran a red light at the Exit 42 interchange and struck the driver's side of my 2021 Honda Accord at an estimated speed of 35 mph. I immediately pulled over to the shoulder, activated my hazard lights, and called 911. Emergency services arrived within 8 minutes.

A police report was filed at the scene (San Jose PD Report #2025-03-14-887). The responding officer, Badge #4421, documented that the other driver was cited for running a red light. Photographs of both vehicles were taken by the officer and shared with me. I also took 23 additional photos documenting all damage angles.

Damage assessment: The driver door is severely dented and will not open, the side mirror is shattered, the rear quarter panel has significant impact damage, and the airbags deployed. I obtained two independent repair estimates — Bernal Auto Body ($7,650) and Pacific Collision Center ($8,120). I am seeking $8,000 which falls within this range.

I have full collision coverage with a $500 deductible. I was not at fault as confirmed by the police report. All supporting documentation including the police report, photos, and repair estimates is attached.`,
  },
  {
    id: 'claim-2',
    label: 'House Fire',
    type: 'Residential Fire',
    amount: '$95,000',
    riskLevel: 'HIGH',
    text: `Claimant: Sandra Kelley
Date of Incident: February 2, 2025
Incident Type: Residential Structure Fire
Location: 4821 Westbrook Lane, Dallas, TX
Claim Amount: $95,000
Prior Claims History: 4 prior claims in the past 24 months — two water damage claims (March 2023, August 2023), one theft claim (January 2024), one fire/smoke damage claim (June 2024).

Description:
There was a fire at my property. The kitchen area sustained damage. Some belongings were also affected. The fire department responded and came to the house. Various items and structural elements were burned or damaged. I need repairs done. I obtained an estimate for about $95,000. I am asking for this claim to be processed quickly as I need the funds.`,
  },
  {
    id: 'claim-3',
    label: 'Workplace Injury',
    type: 'Occupational Injury',
    amount: '$22,000',
    riskLevel: 'MEDIUM',
    text: `Claimant: David Chen
Date of Incident: January 22, 2025
Incident Type: Occupational Injury — Industrial Equipment Failure
Location: Precision Parts Manufacturing, 1100 Industrial Blvd, Unit 7, Fremont, CA
Claim Amount: $22,000
Prior Claims History: 1 prior workers' compensation claim filed in October 2022 for a repetitive strain injury (right wrist) — resolved with a $6,400 settlement.

Description:
At approximately 10:20 AM on January 22, 2025, while operating Hydraulic Press Unit #3 during my regular shift at Precision Parts Manufacturing, a pressure seal on the hydraulic line failed unexpectedly. High-pressure hydraulic fluid sprayed onto my right hand and forearm. I was immediately taken to St. Luke's Medical Center Emergency Room where I received treatment for second-degree chemical burns on my right hand (covering approximately 18% of the hand surface) and multiple lacerations on the forearm.

The incident was witnessed by my direct supervisor Robert Haines (ext. 2214) and two coworkers, Marcus Webb and Jennifer Ortiz, both of whom have provided written statements. An OSHA incident report was filed on the same day (Report #CA-2025-FRE-0122-003). The equipment has since been taken offline pending inspection.

Medical costs to date total $18,400, including emergency room treatment, follow-up care with burn specialist Dr. Patricia Nguyen, and physical therapy (3 sessions completed, 4 remaining). I have been unable to work for three weeks, resulting in $3,600 in documented lost wages. All medical records, OSHA report, witness statements, and wage loss documentation are attached.`,
  },
  {
    id: 'claim-4',
    label: 'Car Theft',
    type: 'Vehicle Theft',
    amount: '$45,000',
    riskLevel: 'LOW-MEDIUM',
    text: `Claimant: Maria Torres
Date of Incident: March 1, 2025 (discovered March 2, 2025 at 8:15 AM)
Incident Type: Vehicle Theft
Location: Commerce Square Parking Garage, Level 3, Space 3-F-18, 200 Commerce Street, Austin, TX
Claim Amount: $45,000
Prior Claims History: None — this is my first claim of any kind.

Description:
My 2023 BMW X5 xDrive40i (VIN: 5UXCR6C0XP9L83421, silver, license plate TX-JMK-9947) was stolen from the Commerce Square Parking Garage on the evening of March 1, 2025. I parked the vehicle at approximately 6:30 PM when I arrived for a dinner engagement at a nearby restaurant. When I returned to the garage at approximately 8:15 AM on March 2, 2025, the vehicle was not in the designated space.

I immediately contacted Austin Police Department, who responded and filed a theft report (APD Case #2025-AT-0302-1042). I have provided officers with the VIN, registration documents, proof of ownership, and all vehicle keys (both are accounted for and in my possession). The garage security manager, Thomas Reed, confirmed that security camera footage from the evening was captured and submitted to law enforcement.

The vehicle's BMW ConnectedDrive GPS was active at the time of theft and its last recorded location data was shared with APD investigators. The vehicle had comprehensive coverage with a $1,000 deductible. NADA clean value for this make, model, year, and mileage (18,400 miles) is $46,200. I am claiming $45,000 to account for normal depreciation. As of this filing date, the vehicle has not been recovered.`,
  },
  {
    id: 'claim-5',
    label: 'Slip & Fall',
    type: 'Personal Injury',
    amount: '$31,000',
    riskLevel: 'HIGH',
    text: `Claimant: Robert Simmons
Date of Incident: November 15, 2024 (or possibly November 16th — I'm not entirely certain of the exact date)
Incident Type: Slip and Fall — Premises Liability
Location: A grocery store. I believe it was the Riverside location, or possibly the one on Central Ave.
Claim Amount: $31,000
Prior Claims History: 2 prior slip-and-fall claims — one in 2021 (settled for $14,000) and one in 2023 (settled for $9,500).

Description:
I slipped on a wet floor at the grocery store. There may have been a wet floor sign, I don't recall seeing one. I hurt my back and also possibly my knee. I went to see a doctor a few days after the incident — I don't have the doctor's name available right now but I can get it later. Some of those doctor visits may have included treatment for a pre-existing back condition as well. The medical bills came to approximately $28,000 though I haven't separated the incident-related charges from the unrelated ones yet. I also lost some income, roughly $3,000, though I don't have documentation for that at this time. I'm not certain whether the store filed an incident report. I didn't speak to a manager at the time. I'm requesting $31,000 total.`,
  },
];
