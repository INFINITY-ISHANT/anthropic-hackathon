"""
Hardcoded Union Budget 2026-27 data.
Source: Budget Speech, Nirmala Sitharaman, February 1 2026.
Updated once per year when the new budget is tabled.
"""

BUDGET_META = {
    "year": "2026-27",
    "presented_by": "Nirmala Sitharaman",
    "presented_on": "2026-02-01",
    "theme": "Yuva Shakti — 3 Kartavya: Accelerate Growth · Fulfil Aspirations · Sabka Sath Sabka Vikas",
}

FISCAL_SUMMARY = {
    "total_expenditure_cr": 5350000,       # ₹53.5 lakh crore
    "capital_expenditure_cr": 1220000,     # ₹12.2 lakh crore
    "net_tax_receipts_cr": 2870000,        # ₹28.7 lakh crore
    "fiscal_deficit_pct_gdp": 4.3,
    "debt_to_gdp_pct": 55.6,
    "gross_market_borrowings_cr": 1720000, # ₹17.2 lakh crore
    "finance_commission_grants_cr": 140000,# ₹1.4 lakh crore
}

# Key announcements by profile relevance
BUDGET_HIGHLIGHTS = [
    # --- Farmers ---
    {
        "id": "bharat_vistaar",
        "title": "Bharat-VISTAAR AI Tool for Farmers",
        "description": "Multilingual AI tool integrating AgriStack and ICAR agricultural practices. Provides customised advisory, reduces farm risk.",
        "profiles": ["Farmer"],
        "signal": "positive",
        "tags": ["agriculture", "AI", "farmer-income"],
    },
    {
        "id": "coconut_scheme",
        "title": "Coconut Promotion Scheme",
        "description": "Support for replacing old/non-productive coconut trees. Benefits ~10 million coconut farmers in coastal states.",
        "profiles": ["Farmer"],
        "signal": "positive",
        "tags": ["agriculture", "coconut", "coastal"],
    },
    {
        "id": "high_value_agri",
        "title": "High Value Agriculture Push",
        "description": "Support for coconut, sandalwood, cocoa, cashew, walnuts, almonds, pine nuts — targeting farm income diversification.",
        "profiles": ["Farmer"],
        "signal": "positive",
        "tags": ["agriculture", "farmer-income"],
    },
    {
        "id": "fisheries",
        "title": "Fisheries: Zero Duty on EEZ Catch",
        "description": "Fish caught by Indian fishing vessels in EEZ or High Seas will be duty-free. Landing at foreign port treated as export.",
        "profiles": ["Farmer"],
        "signal": "positive",
        "tags": ["fisheries", "exports", "coastal"],
    },
    # --- Salaried Employee ---
    {
        "id": "new_it_act",
        "title": "New Income Tax Act 2025 (effective 1 April 2026)",
        "description": "Simplified IT Act replaces the 1961 Act. Ordinary citizens can comply without difficulty. Simplified forms and rules.",
        "profiles": ["Salaried Employee"],
        "signal": "positive",
        "tags": ["income-tax", "compliance"],
    },
    {
        "id": "revised_return_extension",
        "title": "Return Revision Deadline Extended to 31 March",
        "description": "Taxpayers can now revise returns up to 31 March (was 31 Dec) with a nominal fee of ₹1,000–₹5,000.",
        "profiles": ["Salaried Employee"],
        "signal": "positive",
        "tags": ["income-tax", "compliance"],
    },
    {
        "id": "mact_interest_exemption",
        "title": "Motor Accident Tribunal Interest Exempt from Tax",
        "description": "Interest awarded by MACT to individuals is fully exempt from income tax. No TDS on such interest.",
        "profiles": ["Salaried Employee", "Senior Citizen"],
        "signal": "positive",
        "tags": ["income-tax", "relief"],
    },
    {
        "id": "tcs_overseas_tour",
        "title": "TCS on Overseas Tour Package Cut to 2%",
        "description": "TCS rate on overseas tour packages reduced from 5%/20% to a flat 2% with no amount threshold.",
        "profiles": ["Salaried Employee"],
        "signal": "positive",
        "tags": ["TCS", "travel", "income-tax"],
    },
    {
        "id": "tcs_lrs_education",
        "title": "TCS on Education/Medical LRS Reduced to 2%",
        "description": "TCS under LRS for education and medical purposes reduced from 5% to 2%.",
        "profiles": ["Salaried Employee", "Student"],
        "signal": "positive",
        "tags": ["TCS", "education", "LRS"],
    },
    {
        "id": "fast_ds",
        "title": "Foreign Asset Disclosure Scheme (FAST-DS 2026)",
        "description": "One-time 6-month scheme for small taxpayers to disclose undisclosed foreign assets/income below thresholds with reduced penalty.",
        "profiles": ["Salaried Employee"],
        "signal": "neutral",
        "tags": ["foreign-assets", "disclosure", "income-tax"],
    },
    # --- Student ---
    {
        "id": "university_townships",
        "title": "5 University Townships near Industrial Corridors",
        "description": "States supported to create academic zones hosting multiple universities, research institutions, skill centres.",
        "profiles": ["Student"],
        "signal": "positive",
        "tags": ["education", "higher-education", "skilling"],
    },
    {
        "id": "girls_hostel",
        "title": "Girls' Hostel in Every District (STEM)",
        "description": "VGF/capital support to establish 1 girls' hostel per district in Higher Education STEM institutions.",
        "profiles": ["Student"],
        "signal": "positive",
        "tags": ["education", "gender", "STEM"],
    },
    {
        "id": "ahp_institutions",
        "title": "100,000 Allied Health Professionals Over 5 Years",
        "description": "New AHP institutions in private and government sectors covering 10 disciplines including optometry, radiology, psychology.",
        "profiles": ["Student"],
        "signal": "positive",
        "tags": ["health", "skilling", "careers"],
    },
    {
        "id": "avgc_labs",
        "title": "AVGC Content Creator Labs in 15,000 Schools",
        "description": "Animation, VFX, Gaming & Comics labs set up in 15,000 secondary schools and 500 colleges.",
        "profiles": ["Student"],
        "signal": "positive",
        "tags": ["AVGC", "orange-economy", "skilling"],
    },
    # --- Small Business ---
    {
        "id": "sme_growth_fund",
        "title": "₹10,000 Crore SME Growth Fund",
        "description": "Dedicated equity fund to create Champion MSMEs. Incentivises enterprises on select growth criteria.",
        "profiles": ["Small Business"],
        "signal": "positive",
        "tags": ["MSME", "equity", "finance"],
    },
    {
        "id": "treds_mandate",
        "title": "TReDS Mandated for CPSE Purchases from MSMEs",
        "description": "All CPSE purchases from MSMEs must use TReDS. Credit guarantee through CGTMSE for invoice discounting added.",
        "profiles": ["Small Business"],
        "signal": "positive",
        "tags": ["MSME", "liquidity", "TReDS"],
    },
    {
        "id": "corporate_mitras",
        "title": "Corporate Mitras — Para-Professionals for MSMEs",
        "description": "ICAI/ICSI/ICMAI to offer short modular courses creating accredited compliance advisors for Tier-II/III MSMEs.",
        "profiles": ["Small Business"],
        "signal": "positive",
        "tags": ["MSME", "compliance", "professional-support"],
    },
    {
        "id": "courier_cap_removed",
        "title": "₹10 Lakh Courier Export Cap Removed",
        "description": "Value cap of ₹10 lakh per consignment on e-commerce courier exports fully removed.",
        "profiles": ["Small Business"],
        "signal": "positive",
        "tags": ["exports", "e-commerce", "customs"],
    },
    {
        "id": "sez_dta_sales",
        "title": "SEZ Units Can Sell to DTA at Concessional Duty (One-Time)",
        "description": "Manufacturing units in SEZs permitted to sell limited quantities to Domestic Tariff Area at concessional rates due to global trade disruption.",
        "profiles": ["Small Business"],
        "signal": "positive",
        "tags": ["SEZ", "manufacturing", "customs"],
    },
    # --- Senior Citizen ---
    {
        "id": "personal_import_duty",
        "title": "Personal Import Duty Reduced to 10% (from 20%)",
        "description": "Tariff on all dutiable goods imported for personal use halved from 20% to 10% (effective 1 April 2026).",
        "profiles": ["Senior Citizen", "Salaried Employee"],
        "signal": "positive",
        "tags": ["customs", "personal-imports", "ease-of-living"],
    },
    {
        "id": "cancer_drugs_exemption",
        "title": "17 Cancer & Rare Disease Drugs Exempt from Import Duty",
        "description": "Basic customs duty exemption on 17 new drugs and 7 more rare disease medicines/FSMP for personal imports.",
        "profiles": ["Senior Citizen"],
        "signal": "positive",
        "tags": ["health", "customs", "cancer", "rare-diseases"],
    },
    {
        "id": "assistive_devices",
        "title": "Divyang Sahara: Scale-Up of Assistive Devices",
        "description": "ALIMCO production of assistive devices scaled up; Assistive Technology Marts set up for Divyangjan and senior citizens.",
        "profiles": ["Senior Citizen"],
        "signal": "positive",
        "tags": ["divyangjan", "assistive-tech", "senior-citizens"],
    },
    {
        "id": "nimhans2",
        "title": "NIMHANS-2 and Mental Health Apex Centres",
        "description": "New NIMHANS-2 in North India. National Mental Health Institutes in Ranchi and Tezpur upgraded to Regional Apex status.",
        "profiles": ["Senior Citizen"],
        "signal": "positive",
        "tags": ["mental-health", "healthcare"],
    },
    {
        "id": "emergency_trauma_centres",
        "title": "Emergency & Trauma Care Capacity +50% in District Hospitals",
        "description": "Emergency and Trauma Care Centres to increase capacity by 50% in district hospitals across India.",
        "profiles": ["Senior Citizen", "Farmer"],
        "signal": "positive",
        "tags": ["healthcare", "emergency", "district-hospitals"],
    },
]

# Tax changes for direct impact calculation
TAX_CHANGES = {
    "new_it_act_effective": "2026-04-01",
    "tcs_overseas_tour_new_rate_pct": 2,
    "tcs_lrs_education_new_rate_pct": 2,
    "personal_import_duty_new_rate_pct": 10,
    "stt_futures_new_rate_pct": 0.05,
    "stt_options_premium_new_rate_pct": 0.15,
    "mat_new_rate_pct": 14,
}
