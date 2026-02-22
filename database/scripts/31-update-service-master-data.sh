#!/bin/bash
# ============================================================================
# GEA Portal - Update Service Master Data
# ============================================================================
# Updates services with life_events, delivery_channel, target_consumers
# and enhanced descriptions with contact details
#
# Run: ./database/scripts/31-update-service-master-data.sh
# ============================================================================

set -e

# Load environment
source "$(dirname "$0")/../lib/common.sh" 2>/dev/null || {
    # Fallback if common.sh not available
    DB_USER="${DB_USER:-feedback_user}"
    DB_NAME="${DB_NAME:-feedback}"
    DB_HOST="${DB_HOST:-localhost}"
    DB_PORT="${DB_PORT:-5432}"
}

echo "============================================"
echo "Updating Service Master Data"
echo "============================================"
echo ""
echo "This migration updates 168 services with:"
echo "  - life_events (citizen-centric tags)"
echo "  - delivery_channel (service delivery methods)"
echo "  - target_consumers (target audience)"
echo "  - service_description (enhanced with contact details)"
echo ""

# Run migration
docker exec -i feedback_db psql -U ${DB_USER:-feedback_user} -d ${DB_NAME:-feedback} << 'EOF'

-- ============================================================================
-- SERVICE MASTER DATA UPDATE
-- ============================================================================
-- Updates services with life_events, delivery_channel, target_consumers
-- and enhanced descriptions based on approved CSV review
-- Generated: 2026-02-22
-- ============================================================================

BEGIN;

-- ============================================================================
-- IMMIGRATION & PASSPORT SERVICES (DEP-009)
-- ============================================================================

UPDATE services SET
  life_events = '{traveling_abroad,coming_to_grenada}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a new Grenadian passport. Process: Submit application with birth certificate, citizenship certificate, photos, and supporting documents. Address: Immigration Department, Ministerial Complex, St. George''s. Phone: (473) 440-2113. Web: gov.gd/immigration, rgpf.gd/immigration. SLA: 4-6 weeks standard processing.'
WHERE service_id = 'SVC-IMM-001';

UPDATE services SET
  life_events = '{traveling_abroad}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen}',
  service_description = 'Renew an existing Grenadian passport. Process: Submit renewal application with expired passport, photos, and required documents. Address: Immigration Department, Ministerial Complex, St. George''s. Phone: (473) 440-2113. Web: gov.gd/immigration. SLA: 3-4 weeks.'
WHERE service_id = 'SVC-IMM-002';

UPDATE services SET
  life_events = '{coming_to_grenada}',
  delivery_channel = '{office}',
  target_consumers = '{visitor}',
  service_description = 'Apply for or extend visas or entry permits to enter or remain in Grenada. Process: Submit visa application with passport, photos, proof of funds, and travel itinerary. Address: Immigration Department, Ministerial Complex, St. George''s. Phone: (473) 440-2113. Web: edcard.gov.gd for online pre-registration.'
WHERE service_id = 'SVC-IMM-003';

-- ============================================================================
-- LABOUR / WORK PERMIT (DEP-012)
-- ============================================================================

UPDATE services SET
  life_events = '{coming_to_grenada,starting_work}',
  delivery_channel = '{office}',
  target_consumers = '{business,visitor}',
  service_description = 'Apply for a work permit for foreign nationals to work in Grenada. Process: Employer submits application with job offer, qualifications, and supporting documents. Address: Ministry of Labour, Ministerial Complex, St. George''s. Phone: (473) 440-2731. SLA: 4-6 weeks processing.'
WHERE service_id = 'SVC-LBR-001';

-- ============================================================================
-- TAX & REVENUE SERVICES (DEP-010)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'Register a new business or taxpayer with the Inland Revenue Division to obtain a Taxpayer Registration Number. Process: Complete TRN application form with business registration documents. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: ird.gd, taxservices.gov.gd. SLA: 5-10 business days.'
WHERE service_id = 'SVC-TAX-001';

UPDATE services SET
  life_events = '{starting_work}',
  delivery_channel = '{office,web_portal,email}',
  target_consumers = '{citizen}',
  service_description = 'File personal income tax returns with the Inland Revenue Division. Process: Submit annual tax return by March 31 following tax year. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: taxservices.gov.gd. SLA: Filing deadline March 31.'
WHERE service_id = 'SVC-TAX-002';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'File corporate income tax returns with the Inland Revenue Division. Process: Submit annual corporate tax return with financial statements. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: taxservices.gov.gd. SLA: Filing deadline 3 months after fiscal year end.'
WHERE service_id = 'SVC-TAX-003';

UPDATE services SET
  life_events = '{starting_a_business,traveling_abroad}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for a tax clearance certificate for personal or business purposes. Process: Request certificate showing taxes are current. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: ird.gd. SLA: 3-5 business days.'
WHERE service_id = 'SVC-TAX-004';

UPDATE services SET
  life_events = '{starting_a_business,starting_work}',
  delivery_channel = '{web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Register as an e-user to access Grenada''s online tax e-filing system through the tax portal. Process: Complete online registration to receive login credentials. Web: taxservices.gov.gd. SLA: Immediate activation upon approval.'
WHERE service_id = 'SVC-TAX-005';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Pay annual property tax using Inland Revenue payment channels including the online tax portal. Process: Pay based on property valuation assessment. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: my.gov.gd, pay.gov.gd. SLA: Due annually.'
WHERE service_id = 'SVC-TAX-006';

UPDATE services SET
  life_events = '{buying_a_vehicle}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Pay annual vehicle licence fees using Inland Revenue payment channels. Process: Pay annual fee based on vehicle type and engine size. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: my.gov.gd. SLA: Due annually before expiry.'
WHERE service_id = 'SVC-TAX-007';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'Register for Value Added Tax (VAT) as required under Grenada''s tax laws. Process: Submit VAT registration application when turnover exceeds threshold. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: ird.gd. SLA: 10-15 business days.'
WHERE service_id = 'SVC-TAX-008';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'Submit VAT returns and declarations to the Inland Revenue Division. Process: File monthly/quarterly VAT returns with sales and purchases data. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: taxservices.gov.gd. SLA: 21st of following month.'
WHERE service_id = 'SVC-TAX-009';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'File and pay withholding tax withheld from relevant payments. Process: Submit withholding tax returns monthly. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: taxservices.gov.gd.'
WHERE service_id = 'SVC-TAX-010';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'File and pay Annual Stamp Tax where applicable. Process: Submit stamp tax return with applicable documents. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: ird.gd.'
WHERE service_id = 'SVC-TAX-011';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'File and pay Gaming Tax for licensed gaming activities. Process: Submit gaming tax returns based on gaming revenue. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556.'
WHERE service_id = 'SVC-TAX-012';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for a Refreshment House Licence as required under tax and licensing regulations. Process: Submit application with premises details and business plan. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556.'
WHERE service_id = 'SVC-TAX-013';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Pay Property Transfer Tax when property is transferred in Grenada. Process: Pay tax at time of property transfer with deed. Address: Inland Revenue Division, Young Street, St. George''s. Phone: (473) 440-3556. Web: ird.gd.'
WHERE service_id = 'SVC-TAX-014';

-- ============================================================================
-- CUSTOMS SERVICES (DEP-011)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{web_portal,office}',
  target_consumers = '{business}',
  service_description = 'Submit import declarations for goods entering Grenada via the ASYCUDA World customs system. Process: File Single Administrative Document (SAD) electronically. Address: Customs & Excise Division, Burns Point, The Carenage, St. George''s. Web: asycuda.customs.gov.gd, grenadacustoms.com.'
WHERE service_id = 'SVC-CUS-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{web_portal,office}',
  target_consumers = '{business}',
  service_description = 'Submit export declarations for goods leaving Grenada via the ASYCUDA World customs system. Process: File export declaration electronically with shipping documents. Address: Customs & Excise Division, Burns Point, The Carenage, St. George''s. Web: asycuda.customs.gov.gd.'
WHERE service_id = 'SVC-CUS-002';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{web_portal}',
  target_consumers = '{business}',
  service_description = 'Use ASYCUDA World to submit and manage electronic customs declarations and supporting documents. Process: Register as trader and submit declarations online. Web: asycuda.customs.gov.gd. Address: Customs & Excise Division, Burns Point, St. George''s.'
WHERE service_id = 'SVC-CUS-003';

-- ============================================================================
-- CIVIL REGISTRATION (DEP-013, DEP-001)
-- ============================================================================

UPDATE services SET
  life_events = '{having_a_baby,child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request certified copies or extracts of birth records from the Civil Registry & Deeds. Process: Submit application with ID and payment. Address: Civil Registry & Deeds, Ministry of Health Complex, Tanteen, St. George''s. Phone: (473) 440-2737. Email: registrargda@caribsurf.com. Fee: EC $10.00. SLA: 3-5 business days.'
WHERE service_id = 'SVC-REG-001';

UPDATE services SET
  life_events = '{getting_married}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request certified copies of marriage records from the Civil Registry & Deeds. Process: Submit application with ID and marriage details. Address: Civil Registry & Deeds, Ministry of Health Complex, Tanteen, St. George''s. Phone: (473) 440-2737. Email: registrargda@caribsurf.com. Fee: EC $10.00. SLA: 3-5 business days.'
WHERE service_id = 'SVC-REG-002';

UPDATE services SET
  life_events = '{death_and_bereavement}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request certified copies of death records from the Civil Registry & Deeds. Process: Submit application with deceased''s details. Address: Civil Registry & Deeds, Ministry of Health Complex, Tanteen, St. George''s. Phone: (473) 440-2737. Email: registrargda@caribsurf.com. Fee: EC $10.00. SLA: 3-5 business days.'
WHERE service_id = 'SVC-REG-003';

UPDATE services SET
  life_events = '{getting_married}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply to the Cabinet Office for a marriage licence in Grenada. Process: Both parties apply with birth certificates, ID, and affidavits if previously married. Address: Cabinet Office, Ministerial Complex, St. George''s. Phone: (473) 440-2737. SLA: 3-7 business days.'
WHERE service_id = 'SVC-REG-004';

-- ============================================================================
-- POLICE SERVICES (AGY-002)
-- ============================================================================

UPDATE services SET
  life_events = '{traveling_abroad,starting_work}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request a police certificate of character from the Royal Grenada Police Force for employment visas or other purposes. Process: Submit application with fingerprints and photos. Address: RGPF Headquarters, Fort George, St. George''s. Phone: (473) 440-2112. Web: rgpf.gd. SLA: 7-14 business days.'
WHERE service_id = 'SVC-POL-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request an official copy of a traffic accident report. Process: Submit request with accident details and ID. Address: Traffic Department, RGPF, Point Salines. Phone: (473) 440-3999. Fee applies.'
WHERE service_id = 'SVC-POL-002';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request a police report for insurance legal or administrative purposes. Process: Submit request at police station with incident reference. Address: Nearest Police Station. Phone: RGPF Headquarters (473) 440-2112.'
WHERE service_id = 'SVC-POL-003';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a firearm licence under national regulations. Process: Submit application with background check and justification. Address: RGPF Headquarters, Fort George, St. George''s. Phone: (473) 440-2112. SLA: 6-8 weeks processing.'
WHERE service_id = 'SVC-POL-004';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Renew an existing firearm licence. Process: Submit renewal before expiry with current licence. Address: RGPF Headquarters, Fort George, St. George''s. Phone: (473) 440-2112.'
WHERE service_id = 'SVC-POL-005';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request specialized reconstruction services for major accidents. Process: Request through legal representative or insurance. Address: Traffic Department, RGPF, Point Salines. Phone: (473) 440-3999.'
WHERE service_id = 'SVC-POL-006';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Submit complaints about noise public disturbance or nuisance. Process: Report to nearest police station or call police. Address: Nearest Police Station. Phone: RGPF (473) 440-2112. Emergency: 911.'
WHERE service_id = 'SVC-POL-007';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'File a missing person report at the nearest police station. Process: Report immediately at police station with person''s details and photo. Address: Nearest Police Station. Phone: RGPF (473) 440-2112. Emergency: 911.'
WHERE service_id = 'SVC-POL-008';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request permission to host public events/processions requiring police approval. Process: Submit application 14 days before event. Address: RGPF Headquarters, Fort George, St. George''s. Phone: (473) 440-2112.'
WHERE service_id = 'SVC-POL-009';

-- ============================================================================
-- UTILITIES (AGY-012, AGY-013)
-- ============================================================================

UPDATE services SET
  life_events = '{buying_property,moving_house}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply to the National Water and Sewerage Authority (NAWASA) for a new domestic or commercial water connection. Process: Submit application with property documents and site plan. Address: NAWASA, Lucas Street, St. George''s. Phone: (473) 440-2155. SLA: 14-21 business days.'
WHERE service_id = 'SVC-WAT-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Pay water bills through NAWASA''s payment channels (office or approved agents and any available online options). Process: Pay monthly water bill at office or authorized agents. Address: NAWASA, Lucas Street, St. George''s. Phone: (473) 440-2155.'
WHERE service_id = 'SVC-WAT-002';

UPDATE services SET
  life_events = '{buying_property,moving_house}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply to Grenada Electricity Services Ltd (GRENLEC) for a new electricity supply connection. Process: Submit application with electrical inspection certificate and property documents. Address: GRENLEC, Dusty Highway, Grand Anse. Phone: (473) 440-2097. Web: grenlec.com. SLA: 7-14 business days.'
WHERE service_id = 'SVC-ELC-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business}',
  service_description = 'Pay electricity bills via GRENLEC customer service centres or online payment channels where available. Process: Pay monthly electricity bill. Address: GRENLEC, Dusty Highway, Grand Anse. Phone: (473) 440-2097. Web: grenlec.com.'
WHERE service_id = 'SVC-ELC-002';

-- ============================================================================
-- TOURISM SERVICES (AGY-010)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply to the Grenada Tourism Authority for a tour operator licence to operate a tourism enterprise. Process: Submit application with business plan and insurance. Address: Grenada Tourism Authority, Burns Point, St. George''s. Phone: (473) 440-2279. Email: info@puregrenada.com. Web: puregrenada.com.'
WHERE service_id = 'SVC-TRM-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Register hotels guest houses and other tourist accommodation facilities with the Grenada Tourism Authority. Process: Submit registration with facility details and inspection. Address: Grenada Tourism Authority, Burns Point, St. George''s. Phone: (473) 440-2279. Email: info@puregrenada.com.'
WHERE service_id = 'SVC-TRM-002';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for or renew a tourist vendor''s licence in accordance with tourism and beach vending regulations. Process: Submit application with ID and vendor location details. Address: Grenada Tourism Authority, Burns Point, St. George''s. Phone: (473) 440-2279.'
WHERE service_id = 'SVC-TRM-003';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a Tourist Guide Licence using the official tourism enterprise application form. Process: Complete training and submit application. Address: Grenada Tourism Authority, Burns Point, St. George''s. Phone: (473) 440-2279. Email: info@puregrenada.com.'
WHERE service_id = 'SVC-TRM-004';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for a Water Sports Services Licence to operate water-based tourism enterprises. Process: Submit application with safety certifications and insurance. Address: Grenada Tourism Authority, Burns Point, St. George''s. Phone: (473) 440-2279.'
WHERE service_id = 'SVC-TRM-005';

-- ============================================================================
-- AIRPORT (AGY-011)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply to the Grenada Airports Authority for commercial concessions or leases at airports. Process: Submit business proposal and lease application. Address: Grenada Airports Authority, Point Salines International Airport. Phone: (473) 444-4121.'
WHERE service_id = 'SVC-AIR-001';

-- ============================================================================
-- NATIONAL INSURANCE SCHEME (AGY-020)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business}',
  service_description = 'Register an employer with the National Insurance Scheme to remit NIS contributions on behalf of employees. Process: Complete employer registration form with business documents. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. WhatsApp: 458-6060. Email: nis@nisgrenada.org. Web: nisgrenada.org.'
WHERE service_id = 'SVC-NIS-001';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Sickness Benefit under the National Insurance Scheme. Process: Submit claim form with medical certificate within 21 days of illness. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org. Web: nisgrenada.org.'
WHERE service_id = 'SVC-NIS-010';

UPDATE services SET
  life_events = '{having_a_baby}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Maternity Benefit under the National Insurance Scheme. Process: Submit claim with medical certificate confirming pregnancy. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org. Web: nisgrenada.org.'
WHERE service_id = 'SVC-NIS-011';

UPDATE services SET
  life_events = '{losing_a_job}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Unemployment Benefit under the National Insurance Scheme. Process: Submit claim with proof of employment termination. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org. Web: nisgrenada.org.'
WHERE service_id = 'SVC-NIS-012';

UPDATE services SET
  life_events = '{death_and_bereavement}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Funeral Benefit to support funeral expenses. Process: Submit claim with death certificate and funeral receipts. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org.'
WHERE service_id = 'SVC-NIS-013';

UPDATE services SET
  life_events = '{retiring}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Age/retirement benefit (pension) from the National Insurance Scheme. Process: Apply 3 months before retirement age with contribution history. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org. Web: nisgrenada.org.'
WHERE service_id = 'SVC-NIS-014';

UPDATE services SET
  life_events = '{death_and_bereavement}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Survivors Benefit for eligible dependants of a deceased insured person. Process: Submit claim with death certificate and proof of relationship. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org.'
WHERE service_id = 'SVC-NIS-015';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit a claim for Employment Injury-related benefits under the National Insurance Scheme. Process: Submit claim with employer''s injury report and medical certificate. Address: NIS, Melville Street, St. George''s. Phone: (473) 440-3309. Email: nis@nisgrenada.org.'
WHERE service_id = 'SVC-NIS-016';

-- ============================================================================
-- SOCIAL PROTECTION SERVICES (MIN-012, DEP-024, DEP-026)
-- ============================================================================

UPDATE services SET
  life_events = '{experiencing_hardship,child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Flagship social safety net programme providing regular cash transfers (EC$50-$700/month) to the poorest and most vulnerable households in Grenada, Carriacou and Petite Martinique. Process: Apply through Ministry social worker assessment. Address: Ministry of Social Development, Ministerial Complex West Wing, Tanteen, St. George''s. Phone: (473) 440-6037. Email: ministrysod@yahoo.com.'
WHERE service_id = 'SVC-SOC-001';

UPDATE services SET
  life_events = '{experiencing_hardship}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Legacy cash assistance schemes such as Public Assistance and related funds that were consolidated under the unified SEED Programme. Process: Contact Ministry for transition to SEED. Address: Ministry of Social Development, Ministerial Complex West Wing, Tanteen, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-002';

UPDATE services SET
  life_events = '{violence_or_abuse,experiencing_hardship}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Counselling and psycho-social support services for survivors of violence, vulnerable households and persons in need, coordinated by Social & Community Development units. Process: Self-referral or agency referral to social worker. Address: Ministry of Social Development, Ministerial Complex West Wing, Tanteen, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-003';

UPDATE services SET
  life_events = '{experiencing_hardship}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Intake assessment and case management service that registers and manages beneficiary households for social safety net programmes such as SEED. Process: Household assessment by trained social worker. Address: Ministry of Social Development, Ministerial Complex West Wing, Tanteen, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-004';

UPDATE services SET
  life_events = '{retiring,illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Social protection and support services targeted at elderly and senior citizens including assistance with basic needs and referrals to relevant programmes. Process: Apply through Social Services Department. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-005';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Application for disability-related support or grants managed by Social Services for eligible persons with disabilities. Process: Submit application with medical certification of disability. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-006';

UPDATE services SET
  life_events = '{disaster_recovery,experiencing_hardship}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Provision of short-term emergency assistance to households affected by shocks disasters or sudden loss of income managed through social services casework. Process: Emergency assessment by social worker. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-007';

UPDATE services SET
  life_events = '{violence_or_abuse}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Support and referral services for survivors of gender-based violence including access to shelters counselling and justice-sector referrals. Process: Confidential intake and safety planning. Address: Gender Affairs Division, Ministerial Complex, St. George''s. Phone: (473) 440-6037. Crisis Line available.'
WHERE service_id = 'SVC-SOC-008';

UPDATE services SET
  life_events = '{child_welfare,violence_or_abuse}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Submit requests or referrals for child protection assessments or support. Process: Contact Child Protection Authority directly or through social services. Address: Child Protection Authority, St. George''s. Phone: (473) 440-6037. Hotline available.'
WHERE service_id = 'SVC-SOC-009';

UPDATE services SET
  life_events = '{child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply to become a foster parent under national foster care programmes. Process: Complete application and home study process. Address: Child Protection Authority, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-010';

UPDATE services SET
  life_events = '{child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Support services for families initiating adoption processes. Process: Consultation and support through adoption process. Address: Child Protection Authority, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-011';

UPDATE services SET
  life_events = '{illness_or_disability,retiring}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request caregiver or home-help support for elderly or disabled persons in vulnerable households. Process: Submit application with assessment. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-012';

UPDATE services SET
  life_events = '{violence_or_abuse}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Referral-based counselling for individuals or families referred through courts police or community services. Process: Referred by court, police or community agency. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-013';

UPDATE services SET
  life_events = '{disaster_recovery}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Assessment of households affected by disasters for temporary support programmes. Process: Register with NEMO or social services after disaster declaration. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-014';

UPDATE services SET
  life_events = '{having_a_baby,child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for childcare subsidy assistance for low-income households. Process: Submit application with income verification. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-015';

UPDATE services SET
  life_events = '{experiencing_hardship}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request a socio-economic assessment for placement into social programmes. Process: Social worker conducts household assessment. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-016';

UPDATE services SET
  life_events = '{experiencing_hardship,child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Access casework services for families facing economic or social hardship. Process: Register with social services for case management. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-017';

UPDATE services SET
  life_events = '{violence_or_abuse}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Request emergency placement in women''s or family shelters. Process: Contact social services or crisis hotline. Address: Gender Affairs Division, Ministerial Complex, St. George''s. Phone: (473) 440-6037. Crisis Line available.'
WHERE service_id = 'SVC-SOC-018';

UPDATE services SET
  life_events = '{violence_or_abuse}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Access crisis intervention for gender-based violence incidents. Process: Contact crisis hotline or walk-in. Address: Gender Affairs Division, Ministerial Complex, St. George''s. Phone: (473) 440-6037. 24-hour support available.'
WHERE service_id = 'SVC-SOC-019';

UPDATE services SET
  life_events = '{child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Register for parenting and family strengthening programmes. Process: Register through social services or community referral. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-020';

UPDATE services SET
  life_events = '{child_welfare}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Referral service for youth at risk of violence or exploitation. Process: Referral through school, police or community. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-021';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request preparation of social inquiries or reports mandated by courts. Process: Court orders social investigation. Address: Social Services Department, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-SOC-022';

-- ============================================================================
-- HOUSING (DEP-025)
-- ============================================================================

UPDATE services SET
  life_events = '{buying_property,experiencing_hardship}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Application for allocation of China-aided low-income housing units through the Housing Division / Housing Authority processes. Process: Submit application with income verification. Address: Housing Division, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-HOU-001';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Financial housing support such as soft loans or related facilities to assist eligible households to access adequate housing. Process: Apply with income documents and property details. Address: Housing Division, Ministerial Complex, St. George''s. Phone: (473) 440-6037.'
WHERE service_id = 'SVC-HOU-002';

-- ============================================================================
-- STATISTICS (DEP-014)
-- ============================================================================

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email}',
  target_consumers = '{citizen,business,government_employee}',
  service_description = 'Request official statistics and datasets from the Central Statistical Office via its data request channels. Process: Submit formal data request. Address: Central Statistical Office, Ministerial Complex, St. George''s. Phone: (473) 440-1731. Email: stats@gov.gd.'
WHERE service_id = 'SVC-STA-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen,business,government_employee}',
  service_description = 'Access statistical publications bulletins survey reports and census outputs produced by the Central Statistical Office. Process: Download from website or request copies. Address: Central Statistical Office, Ministerial Complex, St. George''s. Phone: (473) 440-1731.'
WHERE service_id = 'SVC-STA-002';

-- ============================================================================
-- INVESTMENT & BUSINESS SUPPORT (AGY-007)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Submit applications for fiscal and other investment incentives through the Grenada Investment Development Corporation (GIDC). Process: Submit business plan and investment proposal. Address: GIDC, Frequente, St. George''s. Phone: (473) 444-1035. Web: grenadaidc.com.'
WHERE service_id = 'SVC-INV-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office,event}',
  target_consumers = '{business}',
  service_description = 'Register for entrepreneurship and business development training programmes offered or coordinated by GIDC. Process: Register for scheduled training sessions. Address: GIDC, Frequente, St. George''s. Phone: (473) 444-1035. Web: grenadaidc.com.'
WHERE service_id = 'SVC-INV-002';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{business,government_employee}',
  service_description = 'Book conference and meeting rooms managed by GIDC for businesses development partners and government agencies. Process: Submit booking request. Address: GIDC, Frequente, St. George''s. Phone: (473) 444-1035.'
WHERE service_id = 'SVC-INV-003';

-- ============================================================================
-- STANDARDS & QUALITY (AGY-014)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply to the Grenada Bureau of Standards for testing inspection and certification services that support national quality infrastructure. Process: Submit samples and testing request. Address: Grenada Bureau of Standards, Queen''s Park, St. George''s. Phone: (473) 440-5886. Web: gnbs.gd.'
WHERE service_id = 'SVC-STD-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Access laboratory testing services (e.g. analytical chemistry and product quality) provided by the Grenada Bureau of Standards. Process: Submit samples with testing requirements. Address: Grenada Bureau of Standards, Queen''s Park, St. George''s. Phone: (473) 440-5886.'
WHERE service_id = 'SVC-STD-002';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Obtain national and international standards documents through the Grenada Bureau of Standards. Process: Request specific standards documents. Address: Grenada Bureau of Standards, Queen''s Park, St. George''s. Phone: (473) 440-5886.'
WHERE service_id = 'SVC-STD-003';

-- ============================================================================
-- FINANCIAL REGULATION (AGY-019)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply to GARFIN for a licence to operate a Money Services Business under the Money Services Business Act. Process: Submit comprehensive application with business plan and compliance documentation. Address: GARFIN, Church Street, St. George''s. Phone: (473) 440-7989.'
WHERE service_id = 'SVC-FIN-REG-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for authorisation and licensing of insurance companies and pension plans under the Insurance Act supervised by GARFIN. Process: Submit application with capital requirements and actuarial reports. Address: GARFIN, Church Street, St. George''s. Phone: (473) 440-7989.'
WHERE service_id = 'SVC-FIN-REG-002';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Register and maintain licences for non-bank financial institutions (e.g. credit unions certain investment entities) supervised by GARFIN. Process: Submit registration with governance documents. Address: GARFIN, Church Street, St. George''s. Phone: (473) 440-7989.'
WHERE service_id = 'SVC-FIN-REG-003';

-- ============================================================================
-- HEALTH SERVICES (DEP-017, DEP-019, MIN-007)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Attend food handler training and obtain certification and badges from the Environmental Health Department. Process: Complete training course and examination. Address: Environmental Health Department, Ministry of Health Complex, Tanteen. Phone: (473) 440-2255. Fee applies.'
WHERE service_id = 'SVC-HE-ENV-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Renew existing Food Handler badges issued by the Environmental Health Department. Process: Submit renewal application before expiry. Address: Environmental Health Department, Ministry of Health Complex, Tanteen. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-ENV-002';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Seek certification for fish processing and similar food establishments through application inspection and licensing by the Environmental Health Department. Process: Facility inspection and compliance review. Address: Environmental Health Department, Ministry of Health Complex, Tanteen. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-ENV-003';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Request public health inspections of food premises public events or facilities to ensure compliance with environmental health standards. Process: Submit inspection request. Address: Environmental Health Department, Ministry of Health Complex, Tanteen. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-ENV-004';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Register for or request appointments at community health clinics providing primary healthcare services. Process: Walk-in or call for appointment. Address: Nearest Community Health Centre. Phone: Ministry of Health (473) 440-2255. Services: Free/low-cost primary care.'
WHERE service_id = 'SVC-HE-COM-001';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office,event}',
  target_consumers = '{citizen}',
  service_description = 'Register individuals or communities to participate in outreach clinics vaccination drives or screening programmes organised by Community Health Services. Process: Register at community health centre or during outreach events. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-COM-002';

UPDATE services SET
  life_events = '{having_a_baby,illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Access immunization and vaccination services for children and adults at community health clinics. Process: Visit community health centre with health card. Address: Nearest Community Health Centre. Phone: Ministry of Health (473) 440-2255. Services: Free vaccinations.'
WHERE service_id = 'SVC-HE-COM-003';

UPDATE services SET
  life_events = '{having_a_baby}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Access antenatal postnatal and child health services provided by Community Health Centres. Process: Register at community health centre during pregnancy. Address: Nearest Community Health Centre. Phone: Ministry of Health (473) 440-2255. Services: Free/low-cost care.'
WHERE service_id = 'SVC-HE-COM-004';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Register for scheduled chronic disease clinics (hypertension diabetes etc.) at community health facilities. Process: Register with diagnosis and referral. Address: Nearest Community Health Centre. Phone: Ministry of Health (473) 440-2255.'
WHERE service_id = 'SVC-HE-COM-005';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request district nursing or home-visiting services for eligible persons in the community health system. Process: Request through community health centre or hospital referral. Phone: Ministry of Health (473) 440-2255.'
WHERE service_id = 'SVC-HE-COM-006';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Submit complaints related to sanitation rodents nuisances or public health hazards for investigation. Process: Submit complaint to Environmental Health. Address: Environmental Health Department, Ministry of Health Complex, Tanteen. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-COM-007';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for approval and licensing of private medical clinics dental clinics diagnostic labs or health facilities. Process: Submit application with facility plans and staff credentials. Address: Ministry of Health, Ministerial Complex, Tanteen. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-LIC-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Request renewal inspection and certification for licensed private health facilities. Process: Submit renewal application before licence expiry. Address: Ministry of Health, Ministerial Complex, Tanteen. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-HE-LIC-002';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Register for outpatient visits at public hospitals. Process: Walk-in registration with ID. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051. Fee: Nominal registration fee.'
WHERE service_id = 'SVC-HE-HOSP-001';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request copies of medical records or imaging reports. Process: Submit written request to Medical Records Department. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051. SLA: 3-5 business days.'
WHERE service_id = 'SVC-HE-HOSP-002';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit doctor''s referral for laboratory testing at public hospitals. Process: Present doctor''s referral to lab department. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051.'
WHERE service_id = 'SVC-HE-HOSP-003';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office,phone}',
  target_consumers = '{citizen}',
  service_description = 'Request X-ray ultrasound or diagnostic imaging appointment. Process: Present referral and schedule appointment. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051.'
WHERE service_id = 'SVC-HE-HOSP-004';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit referral documents for hospital admission. Process: Doctor submits admission request with clinical justification. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051.'
WHERE service_id = 'SVC-HE-HOSP-005';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{phone}',
  target_consumers = '{citizen}',
  service_description = 'Request emergency ambulance support or non-emergency transport. Process: Call emergency number or hospital directly. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051. Emergency: 911.'
WHERE service_id = 'SVC-HE-HOSP-006';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Submit referral for scheduling elective surgery at public hospitals. Process: Specialist submits surgery scheduling request. Address: General Hospital, Grand Etang Road, St. George''s. Phone: (473) 440-2051.'
WHERE service_id = 'SVC-HE-HOSP-007';

UPDATE services SET
  life_events = '{illness_or_disability}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request medication refill for long-term therapy. Process: Present prescription or refill card at hospital pharmacy. Address: General Hospital Pharmacy, Grand Etang Road, St. George''s. Phone: (473) 440-2051.'
WHERE service_id = 'SVC-HE-HOSP-008';

-- ============================================================================
-- YOUTH (MIN-004)
-- ============================================================================

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,ngo}',
  service_description = 'Apply for Community Support Grant funding for youth-led community projects under the Division of Youth / Ministry of Youth & Sports. Process: Submit project proposal with budget. Address: Ministry of Youth & Sports, Tanteen, St. George''s. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-YTH-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,student}',
  service_description = 'Submit youth project proposals for review and possible support under Ministry of Youth & Sports programmes. Process: Submit detailed proposal with objectives and outcomes. Address: Ministry of Youth & Sports, Tanteen, St. George''s. Phone: (473) 440-2255.'
WHERE service_id = 'SVC-YTH-002';

-- ============================================================================
-- AGRICULTURE, LAND, FISHERIES, FORESTRY (DEP-027, DEP-028, DEP-029, DEP-030, MIN-014)
-- ============================================================================

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for the lease or tenancy of agricultural lands managed by the Lands & Survey Division / Ministry of Agriculture & Lands. Process: Submit application with farming proposal. Address: Lands & Survey Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-AGR-001';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request cadastral surveys and the preparation of survey plans for parcels of land through the Lands & Survey Division. Process: Submit survey request with property details. Address: Lands & Survey Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731. SLA: 7-18 days.'
WHERE service_id = 'SVC-AGR-002';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Register fishing vessels and obtain appropriate licences and markings through the Fisheries Division. Process: Submit vessel details and safety documentation. Address: Fisheries Division, Melville Street, St. George''s. Phone: (473) 440-3814.'
WHERE service_id = 'SVC-AGR-003';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Register fishers and fishing enterprises with the Fisheries Division for inclusion in official records and eligibility for support programmes. Process: Complete fisher registration form. Address: Fisheries Division, Melville Street, St. George''s. Phone: (473) 440-3814.'
WHERE service_id = 'SVC-AGR-004';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for permits to cut trees or harvest forest produce in accordance with forestry laws and regulations. Process: Submit application with forest location details. Address: Forestry Department, Queen''s Park, St. George''s. Phone: (473) 440-2934.'
WHERE service_id = 'SVC-AGR-005';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Register new co-operative societies with the Cooperatives Division including submission of required documentation and by-laws. Process: Submit registration with by-laws and member list. Address: Cooperatives Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-AGR-006';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Submit annual returns and required reports for registered co-operative societies to the Cooperatives Division. Process: File annual return with financial statements. Address: Cooperatives Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-AGR-007';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for farm support or agricultural assistance programmes offered under the Ministry of Agriculture & Lands Forestry & Marine Resources (e.g. inputs technical support). Process: Submit application with farm details. Address: Ministry of Agriculture, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-AGR-008';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply to purchase or lease designated state-owned lands through the Lands & Survey Division. Process: Submit application with intended use and financial capability. Address: Lands & Survey Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-LND-001';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Request investigation and review of land boundary issues or disputes. Process: Submit request with survey documents and title. Address: Lands & Survey Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-LND-002';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request official topographic or detailed land surveys from the Lands & Survey Division. Process: Submit survey request with property details. Address: Lands & Survey Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731. SLA: 7 days for plot survey.'
WHERE service_id = 'SVC-LND-003';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for a licence to operate aquaculture ponds, tanks or related facilities. Process: Submit application with facility plans and environmental assessment. Address: Fisheries Division, Melville Street, St. George''s. Phone: (473) 440-3814.'
WHERE service_id = 'SVC-FSH-001';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a licence for specified categories of fishing gear in marine or inland waters. Process: Submit application with gear specifications. Address: Fisheries Division, Melville Street, St. George''s. Phone: (473) 440-3814.'
WHERE service_id = 'SVC-FSH-002';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a hunting licence in accordance with forestry and wildlife regulations. Process: Submit application during hunting season. Address: Forestry Department, Queen''s Park, St. George''s. Phone: (473) 440-2934.'
WHERE service_id = 'SVC-FOR-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for permits to keep, display or rehabilitate wildlife in captivity. Process: Submit application with facility details and animal welfare plan. Address: Forestry Department, Queen''s Park, St. George''s. Phone: (473) 440-2934.'
WHERE service_id = 'SVC-FOR-002';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request seedlings, technical advice or support for tree planting and reforestation activities. Process: Contact Forestry Department for seedling availability. Address: Forestry Department, Queen''s Park, St. George''s. Phone: (473) 440-2934.'
WHERE service_id = 'SVC-FOR-003';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Request statutory or special audits for registered co-operative societies. Process: Submit audit request with financial records. Address: Cooperatives Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-COOP-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Submit proposed amendments to a co-operative society''s by-laws for review and approval. Process: Submit amended by-laws with member resolution. Address: Cooperatives Division, Ministerial Complex, St. George''s. Phone: (473) 440-2731.'
WHERE service_id = 'SVC-COOP-002';

-- ============================================================================
-- EDUCATION (DEP-021, DEP-022, DEP-023)
-- ============================================================================

UPDATE services SET
  life_events = '{going_to_school,pursuing_higher_education}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Register candidates for regional or external examinations administered through the Examinations Unit. Process: School registers students with required fees. Address: Examinations Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737. SLA: Registration deadlines apply.'
WHERE service_id = 'SVC-EDU-001';

UPDATE services SET
  life_events = '{going_to_school}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Register students for national examinations or assessments coordinated by the Examinations Unit. Process: School submits registration with student details. Address: Examinations Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-002';

UPDATE services SET
  life_events = '{going_to_school,pursuing_higher_education}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Request replacement copies of examination certificates or statements of results through the Examinations Unit. Process: Submit request with ID and fee. Address: Examinations Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737. Fee applies.'
WHERE service_id = 'SVC-EDU-003';

UPDATE services SET
  life_events = '{pursuing_higher_education}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Apply for government scholarships or bursaries for tertiary or overseas study coordinated by the Tertiary Education Unit. Process: Submit application with academic records and references. Address: Tertiary Education Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-004';

UPDATE services SET
  life_events = '{pursuing_higher_education}',
  delivery_channel = '{office}',
  target_consumers = '{student,government_employee}',
  service_description = 'Apply for study leave or tuition support schemes for eligible students or public officers via the Tertiary Education Unit. Process: Submit application through employer or directly. Address: Tertiary Education Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-005';

UPDATE services SET
  life_events = '{going_to_school}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Submit requests to transfer students between primary or secondary schools managed by the School Administration Division. Process: Parent submits transfer request through school. Address: School Administration Division, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-006';

UPDATE services SET
  life_events = '{going_to_school}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Request school placements or admission for students entering the school system or changing schools managed by the School Administration Division. Process: Submit placement request with previous school records. Address: School Administration Division, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-007';

UPDATE services SET
  life_events = '{going_to_school}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Submit a late registration request for approved national, regional or international examinations. Process: Submit late registration with penalty fee. Address: Examinations Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737. Additional fee applies.'
WHERE service_id = 'SVC-EDU-008';

UPDATE services SET
  life_events = '{going_to_school}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Request special examination accommodations (e.g. extra time, separate room) for candidates with approved needs. Process: Submit request with supporting documentation. Address: Examinations Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-009';

UPDATE services SET
  life_events = '{pursuing_higher_education}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Apply for bursaries or grants administered through the Tertiary Education Unit. Process: Submit application with financial need documentation. Address: Tertiary Education Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-010';

UPDATE services SET
  life_events = '{pursuing_higher_education}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Request official academic transcripts or statements of results from the Tertiary Education / related authority. Process: Submit request with ID and fee. Address: Tertiary Education Unit, Ministry of Education, Tanteen. Phone: (473) 440-2737. Fee applies.'
WHERE service_id = 'SVC-EDU-011';

UPDATE services SET
  life_events = '{starting_work}',
  delivery_channel = '{office}',
  target_consumers = '{government_employee}',
  service_description = 'Register as a teacher within the national education system in accordance with Ministry of Education procedures. Process: Submit application with qualifications and police clearance. Address: Ministry of Education, Tanteen, St. George''s. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-012';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{government_employee}',
  service_description = 'Request a transfer between schools or education districts for appointed teachers. Process: Submit transfer request through principal to Ministry. Address: Ministry of Education, Tanteen, St. George''s. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-013';

UPDATE services SET
  life_events = '{going_to_school}',
  delivery_channel = '{office}',
  target_consumers = '{student}',
  service_description = 'Request copies of official school records (e.g. attendance, performance summaries) for enrolled or former students. Process: Submit request to school administration. Address: School Administration Division, Ministry of Education, Tanteen. Phone: (473) 440-2737.'
WHERE service_id = 'SVC-EDU-014';

-- ============================================================================
-- PLANNING & BUILDING (DEP-031)
-- ============================================================================

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply to the Building & Planning Authority for permission to construct extend or modify buildings. Process: Submit building plans with site survey. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272. Email: ministryofworks@gov.gd. SLA: 6-8 weeks. Dev permit: 90 days.'
WHERE service_id = 'SVC-PLN-001';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for approval to subdivide land or undertake lot development projects. Process: Submit subdivision plan with surveys. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272. Email: ministryofworks@gov.gd.'
WHERE service_id = 'SVC-PLN-002';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for planning permission to change the use of land or buildings in accordance with planning regulations. Process: Submit change of use application. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272.'
WHERE service_id = 'SVC-PLN-003';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request the issuance of a Certificate of Occupancy for buildings that have been completed and inspected. Process: Request final inspection after construction completion. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272.'
WHERE service_id = 'SVC-PLN-004';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for an electrical installation permit for new or existing buildings. Process: Submit electrical plans with licensed electrician certification. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272.'
WHERE service_id = 'SVC-PLN-005';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for plumbing or sewer connection permits for construction projects. Process: Submit plumbing plans with building permit. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272.'
WHERE service_id = 'SVC-PLN-006';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Apply for permission to demolish structures or buildings. Process: Submit demolition application with site details. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272.'
WHERE service_id = 'SVC-PLN-007';

UPDATE services SET
  life_events = '{buying_property}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request a consultation with the Planning Authority prior to submitting a development application. Process: Schedule pre-application consultation. Address: Physical Planning Unit, Ministerial Complex, St. George''s. Phone: (473) 440-2271/2272.'
WHERE service_id = 'SVC-PLN-008';

-- ============================================================================
-- TRANSPORT & VEHICLES (DEP-032)
-- ============================================================================

UPDATE services SET
  life_events = '{getting_drivers_license}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a new driver''s licence (theory + road test). Process: Pass theory test, practical driving test with licensed instructor. Address: Licensing Authority, Traffic Department, Point Salines. Phone: (473) 440-3999. Fee: $50.00.'
WHERE service_id = 'SVC-TRN-001';

UPDATE services SET
  life_events = '{getting_drivers_license}',
  delivery_channel = '{office,web_portal}',
  target_consumers = '{citizen}',
  service_description = 'Renew a driver''s licence based on expiry cycle. Process: Submit renewal with valid ID and fee. Address: Inland Revenue Division, Young Street. Phone: (473) 440-3556. Web: my.gov.gd.'
WHERE service_id = 'SVC-TRN-002';

UPDATE services SET
  life_events = '{getting_drivers_license}',
  delivery_channel = '{office}',
  target_consumers = '{citizen}',
  service_description = 'Apply for a learner''s permit to practice driving. Process: Pass theory test and vision screening. Address: Licensing Authority, Traffic Department, Point Salines. Phone: (473) 440-3999.'
WHERE service_id = 'SVC-TRN-003';

UPDATE services SET
  life_events = '{buying_a_vehicle}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Register new motor vehicles for use on public roads. Process: Submit proof of purchase, customs clearance, insurance. Address: Inland Revenue Division, Young Street. Phone: (473) 440-3556.'
WHERE service_id = 'SVC-TRN-004';

UPDATE services SET
  life_events = '{buying_a_vehicle}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Transfer vehicle ownership between parties. Process: Both parties sign transfer documents with current registration. Address: Inland Revenue Division, Young Street. Phone: (473) 440-3556.'
WHERE service_id = 'SVC-TRN-005';

UPDATE services SET
  life_events = '{buying_a_vehicle}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Conduct vehicle inspection and issue roadworthiness certificate. Process: Vehicle inspection during January-June period. Address: Traffic Department, Point Salines. Phone: (473) 440-3999.'
WHERE service_id = 'SVC-TRN-006';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{citizen,business}',
  service_description = 'Request duplicate registration papers for vehicles. Process: Submit affidavit for lost registration with ID. Address: Inland Revenue Division, Young Street. Phone: (473) 440-3556.'
WHERE service_id = 'SVC-TRN-007';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for a special permit for operating heavy equipment on public roads. Process: Submit application with equipment specifications. Address: Traffic Department, Point Salines. Phone: (473) 440-3999.'
WHERE service_id = 'SVC-TRN-008';

UPDATE services SET
  life_events = '{starting_a_business}',
  delivery_channel = '{office}',
  target_consumers = '{business}',
  service_description = 'Apply for bus/taxi route permits. Process: Submit application with vehicle fitness and insurance. Address: Traffic Department, Point Salines. Phone: (473) 440-3999.'
WHERE service_id = 'SVC-TRN-009';

-- ============================================================================
-- ENTERPRISE ARCHITECTURE / DIGITAL GOVERNMENT (AGY-005)
-- ============================================================================

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Support ministries and agencies to develop a digital transformation roadmap aligned with Grenada''s Enterprise Architecture. Process: Request support through formal engagement. Address: Digital Transformation Agency, St. George''s. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-001';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Request support to interpret update or extend the Grenada Enterprise Architecture framework for a specific initiative. Process: Submit review request. Address: Digital Transformation Agency, St. George''s. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-002';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Request an assessment of EA capability and eGovernment maturity for an MDA especially where funding involves digital initiatives. Process: Schedule assessment. Address: Digital Transformation Agency, St. George''s. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-003';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Request controlled access to Grenada''s national EA repository for authorised officers and partners. Process: Submit access request with justification. Web: EA Portal. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-004';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Request an EA compliance review of a solution or project against Grenada EA principles standards and guidelines. Process: Submit solution documentation for review. Address: Digital Transformation Agency, St. George''s. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-005';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Request a structured review of an MDA''s IT portfolio aligned with Grenada EA and digital transformation priorities. Process: Submit portfolio documentation. Address: Digital Transformation Agency, St. George''s. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-006';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Request training and capacity development on Grenada EA concepts framework and practical application. Process: Register for training sessions. Address: Digital Transformation Agency, St. George''s. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-EA-007';

UPDATE services SET
  life_events = '{}',
  delivery_channel = '{office,email,web_portal}',
  target_consumers = '{government_employee}',
  service_description = 'Submit a technical or functional support request related to the Grenada EA Portal. Process: Submit support ticket online. Web: EA Portal. Email: dta@gov.gd, website: gea.gov.gd'
WHERE service_id = 'SVC-DIG-001';

-- ============================================================================
-- VERIFY UPDATES
-- ============================================================================

DO $$
DECLARE
    updated_count INTEGER;
    life_events_count INTEGER;
    delivery_channel_count INTEGER;
    target_consumers_count INTEGER;
BEGIN
    -- Count services with populated fields
    SELECT COUNT(*) INTO life_events_count
    FROM services
    WHERE life_events IS NOT NULL AND array_length(life_events, 1) > 0;

    SELECT COUNT(*) INTO delivery_channel_count
    FROM services
    WHERE delivery_channel IS NOT NULL AND array_length(delivery_channel, 1) > 0;

    SELECT COUNT(*) INTO target_consumers_count
    FROM services
    WHERE target_consumers IS NOT NULL AND array_length(target_consumers, 1) > 0;

    RAISE NOTICE '============================================';
    RAISE NOTICE 'Service Master Data Update Summary';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Services with life_events: %', life_events_count;
    RAISE NOTICE 'Services with delivery_channel: %', delivery_channel_count;
    RAISE NOTICE 'Services with target_consumers: %', target_consumers_count;
    RAISE NOTICE '============================================';
END $$;

COMMIT;

EOF

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "Migration completed successfully!"
    echo "============================================"
    echo ""
    echo "Updated 168 services with:"
    echo "  - life_events (citizen-centric tags)"
    echo "  - delivery_channel (service delivery methods)"
    echo "  - target_consumers (target audience)"
    echo "  - service_description (enhanced with contact details)"
    echo ""
else
    echo "Migration failed!"
    exit 1
fi

echo "============================================"
echo "Migration Complete"
echo "============================================"
