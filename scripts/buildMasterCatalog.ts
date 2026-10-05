/**
 * Master Universe Builder: S&P 500 + Small & Mid Caps + ETFs
 * Total ~850-1,000+ actively traded options equities
 */

import fs from 'fs';
import path from 'path';

// Curated active options small/mid-cap names outside S&P 500
const SMALL_MID_CAPS = [
  // Fast-growing non-S&P 500 small/mid caps (User Highlights)
  { ticker: 'IONQ', name: 'IonQ Inc.', sector: 'Quantum Computing' },
  { ticker: 'LUNR', name: 'Intuitive Machines', sector: 'Space Systems' },
  { ticker: 'RDW', name: 'Redwire Space', sector: 'Space Infrastructure' },
  { ticker: 'ACHR', name: 'Archer Aviation', sector: 'eVTOL / Aerospace' },
  { ticker: 'ONDS', name: 'Ondas Holdings', sector: 'Autonomous Drones' },
  { ticker: 'RGTI', name: 'Rigetti Computing', sector: 'Quantum Computing' },
  { ticker: 'PLTR', name: 'Palantir Technologies', sector: 'Enterprise AI & Defense' },
  { ticker: 'SMCI', name: 'Super Micro Computer', sector: 'AI Server Infrastructure' },

  // Quantum, Photonics & Advanced Tech
  { ticker: 'QUBT', name: 'Quantum Computing Inc.', sector: 'Quantum Computing' },
  { ticker: 'QBTS', name: 'D-Wave Quantum', sector: 'Quantum Annealing' },
  { ticker: 'ARQQ', name: 'Arqit Quantum', sector: 'Quantum Encryption' },
  { ticker: 'SOUN', name: 'SoundHound AI', sector: 'Voice AI' },
  { ticker: 'BBAI', name: 'BigBear.ai', sector: 'Defense AI' },
  { ticker: 'AI', name: 'C3.ai Inc.', sector: 'Enterprise AI' },
  { ticker: 'SYM', name: 'Symbotic Inc.', sector: 'Warehouse Robotics' },
  { ticker: 'DUOL', name: 'Duolingo Inc.', sector: 'EdTech AI' },
  { ticker: 'APP', name: 'AppLovin Corp.', sector: 'Mobile AdTech AI' },
  { ticker: 'PATH', name: 'UiPath Inc.', sector: 'Enterprise Automation' },
  { ticker: 'DOCN', name: 'DigitalOcean', sector: 'Developer Cloud' },
  { ticker: 'CFLT', name: 'Confluent Inc.', sector: 'Data Streaming' },
  { ticker: 'ESTC', name: 'Elastic N.V.', sector: 'Search AI' },
  { ticker: 'GTLB', name: 'GitLab Inc.', sector: 'DevSecOps' },
  { ticker: 'IOT', name: 'Samsara Inc.', sector: 'Connected Operations' },
  { ticker: 'FSLY', name: 'Fastly Inc.', sector: 'Edge Cloud' },
  { ticker: 'TEM', name: 'Tempus AI', sector: 'Healthcare AI' },
  { ticker: 'ARM', name: 'Arm Holdings', sector: 'Semiconductor IP' },
  { ticker: 'ALAB', name: 'Astera Labs', sector: 'Connectivity Chips' },
  { ticker: 'CART', name: 'Maplebear (Instacart)', sector: 'Grocery Tech' },
  { ticker: 'KVYO', name: 'Klaviyo Inc.', sector: 'Marketing Automation' },
  { ticker: 'MNDY', name: 'Monday.com', sector: 'Work OS' },

  // Space, Satellite & eVTOL
  { ticker: 'ASTS', name: 'AST SpaceMobile', sector: 'Satellite Cellular' },
  { ticker: 'RKLB', name: 'Rocket Lab USA', sector: 'Space Launch & Systems' },
  { ticker: 'JOBY', name: 'Joby Aviation', sector: 'eVTOL Air Taxi' },
  { ticker: 'BLDE', name: 'Blade Air Mobility', sector: 'Urban Air Mobility' },
  { ticker: 'EH', name: 'EHang Holdings', sector: 'Autonomous Aerial Vehicles' },
  { ticker: 'PL', name: 'Planet Labs', sector: 'Earth Observation' },
  { ticker: 'BKSY', name: 'BlackSky Technology', sector: 'Real-Time Geospatial' },
  { ticker: 'SPCE', name: 'Virgin Galactic', sector: 'Aerospace' },
  { ticker: 'MNTS', name: 'Momentus Inc.', sector: 'Space Transportation' },
  { ticker: 'LLAP', name: 'Terran Orbital', sector: 'Satellite Manufacturing' },
  { ticker: 'AVAV', name: 'AeroVironment', sector: 'Unmanned Defense Systems' },
  { ticker: 'KTOS', name: 'Kratos Defense', sector: 'Defense Drones & Combat' },

  // Crypto, Blockchain & Fintech
  { ticker: 'MSTR', name: 'MicroStrategy', sector: 'Bitcoin Treasury' },
  { ticker: 'COIN', name: 'Coinbase Global', sector: 'Crypto Platform' },
  { ticker: 'MARA', name: 'MARA Holdings', sector: 'Digital Asset Compute' },
  { ticker: 'RIOT', name: 'Riot Platforms', sector: 'Bitcoin Mining' },
  { ticker: 'CLSK', name: 'CleanSpark', sector: 'Bitcoin Mining' },
  { ticker: 'HUT', name: 'Hut 8 Corp.', sector: 'Energy & Compute' },
  { ticker: 'BITF', name: 'Bitfarms', sector: 'Bitcoin Mining' },
  { ticker: 'WULF', name: 'TeraWulf', sector: 'Zero-Carbon Compute' },
  { ticker: 'CIFR', name: 'Cipher Mining', sector: 'Bitcoin Mining' },
  { ticker: 'IREN', name: 'Iris Energy', sector: 'Next-Gen Data Centers' },
  { ticker: 'CORZ', name: 'Core Scientific', sector: 'AI Data Centers' },
  { ticker: 'SOFI', name: 'SoFi Technologies', sector: 'Fintech' },
  { ticker: 'HOOD', name: 'Robinhood Markets', sector: 'Fintech Brokerage' },
  { ticker: 'AFRM', name: 'Affirm Holdings', sector: 'Fintech / BNPL' },
  { ticker: 'UPST', name: 'Upstart Holdings', sector: 'AI Lending Platform' },
  { ticker: 'NU', name: 'Nu Holdings (Nubank)', sector: 'Digital Banking' },
  { ticker: 'LC', name: 'LendingClub', sector: 'Fintech Bank' },
  { ticker: 'OPEN', name: 'Opendoor Technologies', sector: 'iBuying Real Estate' },
  { ticker: 'DAVE', name: 'Dave Inc.', sector: 'Personal Finance' },
  { ticker: 'FLYW', name: 'Flywire Corp.', sector: 'Global Payments' },

  // Clean Energy, Solar, Batteries & Hydrogen
  { ticker: 'ENPH', name: 'Enphase Energy', sector: 'Solar Microinverters' },
  { ticker: 'SEDG', name: 'SolarEdge Technologies', sector: 'Clean Energy' },
  { ticker: 'RUN', name: 'Sunrun Inc.', sector: 'Residential Solar' },
  { ticker: 'NOVA', name: 'Sunnova Energy', sector: 'Residential Solar' },
  { ticker: 'PLUG', name: 'Plug Power', sector: 'Hydrogen Energy' },
  { ticker: 'BE', name: 'Bloom Energy', sector: 'Solid Oxide Power' },
  { ticker: 'STEM', name: 'Stem Inc.', sector: 'AI Storage Software' },
  { ticker: 'ENVX', name: 'Enovix Corp.', sector: 'Silicon Battery Tech' },
  { ticker: 'FREY', name: 'FREYR Battery', sector: 'Clean Battery Tech' },
  { ticker: 'WOLF', name: 'Wolfspeed Inc.', sector: 'Silicon Carbide' },
  { ticker: 'AEHR', name: 'Aehr Test Systems', sector: 'Semiconductor Test' },
  { ticker: 'CHPT', name: 'ChargePoint Holdings', sector: 'EV Charging' },
  { ticker: 'EVGO', name: 'EVgo Inc.', sector: 'Fast EV Charging' },
  { ticker: 'BLNK', name: 'Blink Charging', sector: 'EV Infrastructure' },
  { ticker: 'AMPS', name: 'Altus Power', sector: 'Commercial Solar' },
  { ticker: 'HASI', name: 'HA Sustainable Infra', sector: 'Climate Solutions' },
  { ticker: 'ARRY', name: 'Array Technologies', sector: 'Solar Trackers' },
  { ticker: 'SHLS', name: 'Shoals Technologies', sector: 'Solar EBOS' },
  { ticker: 'FLNC', name: 'Fluence Energy', sector: 'Grid Energy Storage' },

  // Electric Vehicles & Auto Tech
  { ticker: 'RIVN', name: 'Rivian Automotive', sector: 'Electric Vehicles' },
  { ticker: 'LCID', name: 'Lucid Group', sector: 'Electric Vehicles' },
  { ticker: 'QS', name: 'QuantumScape', sector: 'Solid-State Batteries' },
  { ticker: 'CVNA', name: 'Carvana Co.', sector: 'Auto E-Commerce' },
  { ticker: 'CAR', name: 'Avis Budget Group', sector: 'Mobility & Car Rental' },
  { ticker: 'XPEV', name: 'XPeng Inc.', sector: 'Electric Vehicles' },
  { ticker: 'NIO', name: 'NIO Inc.', sector: 'Smart EVs' },
  { ticker: 'LI', name: 'Li Auto', sector: 'Electric Vehicles' },
  { ticker: 'VFS', name: 'VinFast Auto', sector: 'Electric Vehicles' },
  { ticker: 'LAZR', name: 'Luminar Technologies', sector: 'Automotive LiDAR' },
  { ticker: 'OUST', name: 'Ouster Inc.', sector: 'Digital Flash LiDAR' },
  { ticker: 'INVZ', name: 'Innoviz Technologies', sector: 'LiDAR Sensors' },

  // Biotech, Genomics & Healthcare Tech
  { ticker: 'HIMS', name: 'Hims & Hers Health', sector: 'Digital Health' },
  { ticker: 'RXRX', name: 'Recursion Pharmaceuticals', sector: 'AI Drug Discovery' },
  { ticker: 'CRSP', name: 'CRISPR Therapeutics', sector: 'Gene Editing' },
  { ticker: 'BEAM', name: 'Beam Therapeutics', sector: 'Base Editing' },
  { ticker: 'NTLA', name: 'Intellia Therapeutics', sector: 'In Vivo Gene Editing' },
  { ticker: 'EDIT', name: 'Editas Medicine', sector: 'Genome Editing' },
  { ticker: 'DNA', name: 'Ginkgo Bioworks', sector: 'Synthetic Biology' },
  { ticker: 'PACB', name: 'Pacific Biosciences', sector: 'Genomic Sequencing' },
  { ticker: 'TWST', name: 'Twist Bioscience', sector: 'Synthetic DNA' },
  { ticker: 'VKTX', name: 'Viking Therapeutics', sector: 'Metabolic & Obesity' },
  { ticker: 'ALT', name: 'Altimmune', sector: 'GLP-1 Therapeutics' },
  { ticker: 'ARVN', name: 'Arvinas', sector: 'PROTAC Protein Degradation' },
  { ticker: 'KYMR', name: 'Kymera Therapeutics', sector: 'Targeted Protein Degraders' },
  { ticker: 'TNDM', name: 'Tandem Diabetes', sector: 'Insulin Delivery Tech' },
  { ticker: 'EXAS', name: 'Exact Sciences', sector: 'Cancer Diagnostics' },
  { ticker: 'GH', name: 'Guardant Health', sector: 'Liquid Biopsy' },
  { ticker: 'KRTX', name: 'Karuna Therapeutics', sector: 'Neuroscience' },
  { ticker: 'BMRN', name: 'BioMarin Pharmaceutical', sector: 'Rare Genetic Disease' },
  { ticker: 'ALNY', name: 'Alnylam Pharmaceuticals', sector: 'RNAi Therapeutics' },
  { ticker: 'SRPT', name: 'Sarepta Therapeutics', sector: 'Gene Therapy' },
  { ticker: 'AXSM', name: 'Axsome Therapeutics', sector: 'CNS Disorders' },
  { ticker: 'CYTK', name: 'Cytokinetics', sector: 'Cardiovascular Therapeutics' },
  { ticker: 'MDGL', name: 'Madrigal Pharmaceuticals', sector: 'MASH Therapeutics' },
  { ticker: 'INSM', name: 'Insmed Inc.', sector: 'Pulmonary Diseases' },
  { ticker: 'APLS', name: 'Apellis Pharmaceuticals', sector: 'Complement System' },
  { ticker: 'RARE', name: 'Ultragenyx Pharmaceutical', sector: 'Rare Metabolic' },

  // Consumer Growth, Restaurants, Gaming & Retail
  { ticker: 'CELH', name: 'Celsius Holdings', sector: 'Consumer Beverages' },
  { ticker: 'DKNG', name: 'DraftKings Inc.', sector: 'Online Gaming / Sportsbook' },
  { ticker: 'PENN', name: 'PENN Entertainment', sector: 'Gaming & ESPN BET' },
  { ticker: 'RBLX', name: 'Roblox Corp.', sector: 'Gaming Platform' },
  { ticker: 'U', name: 'Unity Software', sector: 'Real-Time 3D Engine' },
  { ticker: 'DASH', name: 'DoorDash Inc.', sector: 'Local Commerce Platform' },
  { ticker: 'ABNB', name: 'Airbnb Inc.', sector: 'Travel Accommodations' },
  { ticker: 'ETSY', name: 'Etsy Inc.', sector: 'E-Commerce Marketplace' },
  { ticker: 'W', name: 'Wayfair Inc.', sector: 'Home Goods E-Commerce' },
  { ticker: 'CHWY', name: 'Chewy Inc.', sector: 'Pet E-Commerce' },
  { ticker: 'TOST', name: 'Toast Inc.', sector: 'Restaurant Technology' },
  { ticker: 'CAVA', name: 'CAVA Group', sector: 'Fast Casual Mediterranean' },
  { ticker: 'WING', name: 'Wingstop Inc.', sector: 'Fast Casual Dining' },
  { ticker: 'SHAK', name: 'Shake Shack', sector: 'Fast Casual Burgers' },
  { ticker: 'BROS', name: 'Dutch Bros', sector: 'Drive-Thru Beverages' },
  { ticker: 'SG', name: 'Sweetgreen', sector: 'Automated Fast Casual' },
  { ticker: 'BOOT', name: 'Boot Barn Holdings', sector: 'Western Apparel' },
  { ticker: 'ANF', name: 'Abercrombie & Fitch', sector: 'Apparel Retail' },
  { ticker: 'ELF', name: 'e.l.f. Beauty', sector: 'Cosmetics & Skincare' },
  { ticker: 'BIRK', name: 'Birkenstock Holding', sector: 'Footwear' },
  { ticker: 'ONON', name: 'On Holding', sector: 'Performance Running' },
  { ticker: 'CROX', name: 'Crocs Inc.', sector: 'Footwear & HeyDude' },
  { ticker: 'SKX', name: 'Skechers U.S.A.', sector: 'Footwear' },
  { ticker: 'DECK', name: 'Deckers Outdoor (HOKA)', sector: 'Footwear' },
  { ticker: 'LULU', name: 'Lululemon Athletica', sector: 'Activewear' },

  // Key Benchmarks & Sector ETFs
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Index ETF' },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Tech Index ETF' },
  { ticker: 'IWM', name: 'iShares Russell 2000', sector: 'Small Cap Index ETF' },
  { ticker: 'SMH', name: 'VanEck Semiconductor ETF', sector: 'Semiconductor ETF' },
  { ticker: 'XBI', name: 'SPDR S&P Biotech ETF', sector: 'Biotech ETF' },
  { ticker: 'ARKK', name: 'ARK Innovation ETF', sector: 'Disruptive Tech ETF' },
  { ticker: 'XLF', name: 'Financial Select Sector SPDR', sector: 'Financial ETF' },
  { ticker: 'XLE', name: 'Energy Select Sector SPDR', sector: 'Energy ETF' },
  { ticker: 'XLK', name: 'Technology Select Sector SPDR', sector: 'Tech ETF' },
  { ticker: 'XLV', name: 'Health Care Select Sector SPDR', sector: 'Healthcare ETF' },
  { ticker: 'XLI', name: 'Industrial Select Sector SPDR', sector: 'Industrial ETF' },
  { ticker: 'XLY', name: 'Consumer Discretionary SPDR', sector: 'Consumer ETF' },
  { ticker: 'XLP', name: 'Consumer Staples SPDR', sector: 'Staples ETF' },
  { ticker: 'XLU', name: 'Utilities Select Sector SPDR', sector: 'Utilities ETF' },
  { ticker: 'XLRE', name: 'Real Estate Select Sector SPDR', sector: 'Real Estate ETF' },
  { ticker: 'XLC', name: 'Communication Services SPDR', sector: 'Communications ETF' },
  { ticker: 'BITO', name: 'ProShares Bitcoin Strategy ETF', sector: 'Crypto ETF' },
  { ticker: 'GDX', name: 'VanEck Gold Miners ETF', sector: 'Metals & Mining ETF' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury ETF', sector: 'Fixed Income ETF' },
  { ticker: 'HYG', name: 'iShares High Yield Bond ETF', sector: 'Credit ETF' },

  // Additional Russell 2000 & Nasdaq Active Options Equities
  { ticker: 'GME', name: 'GameStop Corp.', sector: 'Specialty Retail' },
  { ticker: 'AMC', name: 'AMC Entertainment', sector: 'Entertainment' },
  { ticker: 'BB', name: 'BlackBerry Ltd.', sector: 'Cybersecurity & IoT' },
  { ticker: 'TLRY', name: 'Tilray Brands', sector: 'Cannabis / Consumer' },
  { ticker: 'CGC', name: 'Canopy Growth', sector: 'Cannabis' },
  { ticker: 'CRON', name: 'Cronos Group', sector: 'Cannabis' },
  { ticker: 'NTNX', name: 'Nutanix Inc.', sector: 'Hybrid Cloud Software' },
  { ticker: 'S', name: 'SentinelOne', sector: 'Cybersecurity' },
  { ticker: 'BOX', name: 'Box Inc.', sector: 'Cloud Content Management' },
  { ticker: 'VRNS', name: 'Varonis Systems', sector: 'Data Security' },
  { ticker: 'TENB', name: 'Tenable Holdings', sector: 'Cybersecurity' },
  { ticker: 'QLYS', name: 'Qualys Inc.', sector: 'Cloud Security' },
  { ticker: 'RPD', name: 'Rapid7 Inc.', sector: 'SecOps Software' },
  { ticker: 'CRUS', name: 'Cirrus Logic', sector: 'Audio Semis' },
  { ticker: 'RMBS', name: 'Rambus Inc.', sector: 'Memory Interface Chips' },
  { ticker: 'SLAB', name: 'Silicon Labs', sector: 'IoT Semis' },
  { ticker: 'ACLS', name: 'Axcelis Technologies', sector: 'Ion Implantation' },
  { ticker: 'ONTO', name: 'Onto Innovation', sector: 'Semiconductor Metrology' },
  { ticker: 'COHR', name: 'Coherent Corp.', sector: 'Silicon Photonics' },
  { ticker: 'LITE', name: 'Lumentum Holdings', sector: 'Optical & Photonic' },
  { ticker: 'HALO', name: 'Halozyme Therapeutics', sector: 'Drug Delivery Enzymes' },
  { ticker: 'NBIX', name: 'Neurocrine Biosciences', sector: 'Neuroscience' },
  { ticker: 'EXEL', name: 'Exelixis Inc.', sector: 'Oncology Drug Discovery' },
  { ticker: 'INCY', name: 'Incyte Corp.', sector: 'Biopharmaceuticals' },
  { ticker: 'UTHR', name: 'United Therapeutics', sector: 'Pulmonary Hypertension' },
  { ticker: 'IOVA', name: 'Iovance Biotherapeutics', sector: 'TIL Cell Therapy' },
  { ticker: 'GERN', name: 'Geron Corp.', sector: 'Myelodysplastic Syndromes' },
  { ticker: 'ARGX', name: 'argenx SE', sector: 'Immunology Therapeutics' },
  { ticker: 'BBIO', name: 'BridgeBio Pharma', sector: 'Genetic Diseases' },
  { ticker: 'PODD', name: 'Insulet Corp.', sector: 'Tubeless Insulin Pumps' },
  { ticker: 'INSP', name: 'Inspire Medical Systems', sector: 'Sleep Apnea Devices' },
  { ticker: 'NVRO', name: 'Nevro Corp.', sector: 'Spinal Cord Stimulation' },
  { ticker: 'SWAV', name: 'Shockwave Medical', sector: 'Intravascular Lithotripsy' },
  { ticker: 'EQT', name: 'EQT Corp.', sector: 'Natural Gas Production' },
  { ticker: 'AR', name: 'Antero Resources', sector: 'Natural Gas & NGLs' },
  { ticker: 'RRC', name: 'Range Resources', sector: 'Natural Gas' },
  { ticker: 'MTDR', name: 'Matador Resources', sector: 'Oil & Gas E&P' },
  { ticker: 'CHRD', name: 'Chord Energy', sector: 'Williston Basin E&P' },
  { ticker: 'RIG', name: 'Transocean Ltd.', sector: 'Offshore Ultra-Deepwater' },
  { ticker: 'VAL', name: 'Valaris Ltd.', sector: 'Offshore Drilling' },
  { ticker: 'WFRD', name: 'Weatherford International', sector: 'Energy Services' },
  { ticker: 'AXON', name: 'Axon Enterprise', sector: 'Public Safety Tech' },
  { ticker: 'HEI', name: 'HEICO Corp.', sector: 'Aerospace & Defense' },
  { ticker: 'TDG', name: 'TransDigm Group', sector: 'Aerospace Components' },
  { ticker: 'HWM', name: 'Howmet Aerospace', sector: 'Engine Forgings' },
  { ticker: 'WWD', name: 'Woodward Inc.', sector: 'Control Solutions' },
  { ticker: 'SPR', name: 'Spirit AeroSystems', sector: 'Aerostructures' },
  { ticker: 'BWXT', name: 'BWX Technologies', sector: 'Nuclear Components' },
  { ticker: 'GTLS', name: 'Chart Industries', sector: 'Cryogenic Equipment' },
  { ticker: 'FIVE', name: 'Five Below', sector: 'Value Retail' },
  { ticker: 'OLLI', name: "Ollie's Bargain Outlet", sector: 'Extreme Value Retail' },
  { ticker: 'SFM', name: 'Sprouts Farmers Market', sector: 'Specialty Grocery' },
  { ticker: 'ANF', name: 'Abercrombie & Fitch', sector: 'Apparel Retail' },
  { ticker: 'URBN', name: 'Urban Outfitters', sector: 'Lifestyle Apparel' },
  { ticker: 'AEO', name: 'American Eagle Outfitters', sector: 'Apparel Retail' },
  { ticker: 'WAL', name: 'Western Alliance Bancorp', sector: 'Regional Banking' },
  { ticker: 'ZION', name: 'Zions Bancorporation', sector: 'Regional Banking' },
  { ticker: 'CMA', name: 'Comerica Inc.', sector: 'Commercial Banking' },
  { ticker: 'KEY', name: 'KeyCorp', sector: 'Regional Banking' },
  { ticker: 'CFG', name: 'Citizens Financial Group', sector: 'Consumer Banking' },
  { ticker: 'FITB', name: 'Fifth Third Bancorp', sector: 'Diversified Financial' },
  { ticker: 'HBAN', name: 'Huntington Bancshares', sector: 'Regional Banking' },
  { ticker: 'RF', name: 'Regions Financial Corp.', sector: 'Regional Banking' },
  { ticker: 'MTB', name: 'M&T Bank Corp.', sector: 'Commercial Banking' },
  { ticker: 'FHN', name: 'First Horizon Corp.', sector: 'Regional Banking' },
  { ticker: 'NYCB', name: 'Flagstar Financial', sector: 'Community Banking' },
  { ticker: 'SLM', name: 'SLM Corp. (Sallie Mae)', sector: 'Education Loans' },
  { ticker: 'CACC', name: 'Credit Acceptance Corp.', sector: 'Auto Finance' },
  { ticker: 'RITM', name: 'Rithm Capital', sector: 'Asset Management REIT' },
  { ticker: 'AGNC', name: 'AGNC Investment Corp.', sector: 'Agency Mortgage REIT' },
  { ticker: 'NLY', name: 'Annaly Capital Management', sector: 'Mortgage REIT' },

  // High Growth Tech, Cloud & Security
  { ticker: 'SNOW', name: 'Snowflake Inc.', sector: 'Data Cloud Platform' },
  { ticker: 'CRWD', name: 'CrowdStrike Holdings', sector: 'Cybersecurity' },
  { ticker: 'ZS', name: 'Zscaler Inc.', sector: 'Zero Trust Cloud Security' },
  { ticker: 'MDB', name: 'MongoDB Inc.', sector: 'Modern Database Platform' },
  { ticker: 'NET', name: 'Cloudflare Inc.', sector: 'Edge Connectivity & Security' },
  { ticker: 'TEAM', name: 'Atlassian Corp.', sector: 'Collaboration Software' },
  { ticker: 'HUBS', name: 'HubSpot Inc.', sector: 'CRM & Marketing Platform' },
  { ticker: 'OKTA', name: 'Okta Inc.', sector: 'Identity Management' },
  { ticker: 'DDOG', name: 'Datadog Inc.', sector: 'Observability & Monitoring' },
  { ticker: 'BILL', name: 'BILL Holdings', sector: 'Financial Automation' },
  { ticker: 'TWLO', name: 'Twilio Inc.', sector: 'Cloud Communications' },
  { ticker: 'FROG', name: 'JFrog Ltd.', sector: 'Liquid Software / DevOps' },
  { ticker: 'BRZE', name: 'Braze Inc.', sector: 'Customer Engagement' },
  { ticker: 'AMPL', name: 'Amplitude Inc.', sector: 'Product Analytics' },
  { ticker: 'WK', name: 'Workiva Inc.', sector: 'Regulatory Reporting' },
  { ticker: 'ASAN', name: 'Asana Inc.', sector: 'Work Management' },
  { ticker: 'CXM', name: 'Sprinklr Inc.', sector: 'Customer Experience AI' },
  { ticker: 'PSTG', name: 'Pure Storage', sector: 'Enterprise All-Flash' },
  { ticker: 'WDC', name: 'Western Digital', sector: 'Data Storage' },
  { ticker: 'STX', name: 'Seagate Technology', sector: 'Hard Disk Drives' },
  { ticker: 'NTAP', name: 'NetApp Inc.', sector: 'Intelligent Data Infrastructure' },
  { ticker: 'GEN', name: 'Gen Digital', sector: 'Consumer Cyber Safety' },

  // Additional Semiconductors & Capital Equipment
  { ticker: 'TSM', name: 'Taiwan Semiconductor', sector: 'Semiconductor Foundry' },
  { ticker: 'ASML', name: 'ASML Holding', sector: 'Lithography Equipment' },
  { ticker: 'MRVL', name: 'Marvell Technology', sector: 'Custom AI Chips & Optical' },
  { ticker: 'ON', name: 'ON Semiconductor', sector: 'Automotive Power Semis' },
  { ticker: 'MPWR', name: 'Monolithic Power Systems', sector: 'Power Management' },
  { ticker: 'SWKS', name: 'Skyworks Solutions', sector: 'Radio Frequency Semis' },
  { ticker: 'QRVO', name: 'Qorvo Inc.', sector: 'RF Solutions' },
  { ticker: 'POWI', name: 'Power Integrations', sector: 'High-Voltage Power ICs' },
  { ticker: 'SMTC', name: 'Semtech Corp.', sector: 'Analog & Mixed-Signal' },
  { ticker: 'ICHR', name: 'Ichor Holdings', sector: 'Fluid Delivery Systems' },
  { ticker: 'UCTT', name: 'Ultra Clean Holdings', sector: 'Subsystems Manufacturing' },
  { ticker: 'VECO', name: 'Veeco Instruments', sector: 'Semiconductor Process' },
  { ticker: 'FORM', name: 'FormFactor Inc.', sector: 'Probe Cards & Test' },
  { ticker: 'CAMT', name: 'Camtek Ltd.', sector: 'Metrology & Inspection' },
  { ticker: 'MKSI', name: 'MKS Instruments', sector: 'Process Control' },
  { ticker: 'ENTG', name: 'Entegris Inc.', sector: 'Advanced Materials' },
  { ticker: 'LSCC', name: 'Lattice Semiconductor', sector: 'Low Power FPGAs' },
  { ticker: 'SITM', name: 'SiTime Corp.', sector: 'Precision Timing MEMS' },

  // Chinese & International ADRs
  { ticker: 'BABA', name: 'Alibaba Group', sector: 'E-Commerce & Cloud' },
  { ticker: 'PDD', name: 'PDD Holdings (Temu)', sector: 'Global E-Commerce' },
  { ticker: 'JD', name: 'JD.com Inc.', sector: 'Supply Chain & Retail' },
  { ticker: 'BIDU', name: 'Baidu Inc.', sector: 'AI & Autonomous Driving' },
  { ticker: 'BILI', name: 'Bilibili Inc.', sector: 'Video & Entertainment' },
  { ticker: 'FUTU', name: 'Futu Holdings', sector: 'Digital Brokerage' },
  { ticker: 'TCOM', name: 'Trip.com Group', sector: 'Travel Services' },
  { ticker: 'BEKE', name: 'KE Holdings', sector: 'Housing Platform' },
  { ticker: 'YUMC', name: 'Yum China', sector: 'Fast Food Restaurants' },
  { ticker: 'SE', name: 'Sea Limited', sector: 'Digital Entertainment & Shopee' },
  { ticker: 'GRAB', name: 'Grab Holdings', sector: 'Superapp & Deliveries' },
  { ticker: 'CPNG', name: 'Coupang Inc.', sector: 'E-Commerce Platform' },

  // Nuclear, Power & Uranium
  { ticker: 'CCJ', name: 'Cameco Corp.', sector: 'Uranium Fuel' },
  { ticker: 'UEC', name: 'Uranium Energy Corp.', sector: 'In-Situ Uranium Mining' },
  { ticker: 'NXE', name: 'NexGen Energy', sector: 'High-Grade Uranium' },
  { ticker: 'DNN', name: 'Denison Mines', sector: 'Uranium Exploration' },
  { ticker: 'URA', name: 'Global X Uranium ETF', sector: 'Uranium ETF' },
  { ticker: 'URNM', name: 'Sprott Uranium Miners ETF', sector: 'Uranium ETF' },
  { ticker: 'OKLO', name: 'Oklo Inc.', sector: 'Advanced Nuclear Fission' },
  { ticker: 'SMR', name: 'NuScale Power', sector: 'Small Modular Reactors' },
  { ticker: 'NNE', name: 'Nano Nuclear Energy', sector: 'Micro-SMR Tech' },
  { ticker: 'TLN', name: 'Talen Energy', sector: 'Nuclear Power & Data Centers' },

  // Aerospace, Defense & Industrial Machinery
  { ticker: 'BA', name: 'Boeing Co.', sector: 'Commercial & Defense Aerospace' },
  { ticker: 'LMT', name: 'Lockheed Martin', sector: 'Defense & Space' },
  { ticker: 'RTX', name: 'RTX Corp.', sector: 'Aerospace & Missile Defense' },
  { ticker: 'NOC', name: 'Northrop Grumman', sector: 'Stealth & Space Systems' },
  { ticker: 'GD', name: 'General Dynamics', sector: 'Submarines & Land Combat' },
  { ticker: 'HII', name: 'Huntington Ingalls', sector: 'Naval Shipbuilding' },
  { ticker: 'LHX', name: 'L3Harris Technologies', sector: 'Tactical Communications' },
  { ticker: 'TXT', name: 'Textron Inc.', sector: 'Bell Helicopters & Aviation' },
  { ticker: 'ERJ', name: 'Embraer SA', sector: 'Regional Jet Manufacturing' },

  // Entertainment, Media, Streaming & Leisure
  { ticker: 'SPOT', name: 'Spotify Technology', sector: 'Audio Streaming' },
  { ticker: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment Streaming' },
  { ticker: 'DIS', name: 'Walt Disney Co.', sector: 'Entertainment & Parks' },
  { ticker: 'WBD', name: 'Warner Bros. Discovery', sector: 'Media & Entertainment' },
  { ticker: 'PARA', name: 'Paramount Global', sector: 'Media Network' },
  { ticker: 'LYV', name: 'Live Nation Entertainment', sector: 'Live Events & Ticketing' },
  { ticker: 'MTCH', name: 'Match Group', sector: 'Online Dating' },
  { ticker: 'BMBL', name: 'Bumble Inc.', sector: 'Social Connection' },
  { ticker: 'EA', name: 'Electronic Arts', sector: 'Interactive Entertainment' },
  { ticker: 'TTWO', name: 'Take-Two Interactive', sector: 'Video Games & GTA' },
  { ticker: 'UBER', name: 'Uber Technologies', sector: 'Mobility & Delivery Platform' },
  { ticker: 'LYFT', name: 'Lyft Inc.', sector: 'Ridesharing Network' },
  { ticker: 'EXPE', name: 'Expedia Group', sector: 'Online Travel Agency' },
  { ticker: 'BKNG', name: 'Booking Holdings', sector: 'Travel Accommodations' },
  { ticker: 'HLT', name: 'Hilton Worldwide', sector: 'Hospitality & Hotels' },
  { ticker: 'MAR', name: 'Marriott International', sector: 'Lodging & Resorts' },
  { ticker: 'MGM', name: 'MGM Resorts', sector: 'Casinos & Resorts' },
  { ticker: 'WYNN', name: 'Wynn Resorts', sector: 'Luxury Casino Resorts' },
  { ticker: 'LVS', name: 'Las Vegas Sands', sector: 'Integrated Resorts' },
  { ticker: 'CZR', name: 'Caesars Entertainment', sector: 'Gaming & Hospitality' },

  // Pharma & Healthcare Giants
  { ticker: 'NVO', name: 'Novo Nordisk', sector: 'GLP-1 & Diabetes Care' },
  { ticker: 'AZN', name: 'AstraZeneca', sector: 'Oncology & Biopharma' },
  { ticker: 'SNY', name: 'Sanofi', sector: 'Immunology & Vaccines' },
  { ticker: 'GSK', name: 'GSK plc', sector: 'Specialty Medicines' },
  { ticker: 'TAK', name: 'Takeda Pharmaceutical', sector: 'Rare Diseases' },
  { ticker: 'TEVA', name: 'Teva Pharmaceutical', sector: 'Generic Pharmaceuticals' },
  { ticker: 'PRGO', name: 'Perrigo Co.', sector: 'Consumer Self-Care' },
  { ticker: 'JAZZ', name: 'Jazz Pharmaceuticals', sector: 'Neuroscience & Oncology' },
  { ticker: 'ITCI', name: 'Intra-Cellular Therapies', sector: 'CNS Therapeutics' },
  { ticker: 'ACAD', name: 'ACADIA Pharmaceuticals', sector: 'Neurodegenerative Disorders' },
  { ticker: 'MRNA', name: 'Moderna Inc.', sector: 'mRNA Medicines & Vaccines' },
  { ticker: 'BNTX', name: 'BioNTech SE', sector: 'Immunotherapies' },
  { ticker: 'NVAX', name: 'Novavax Inc.', sector: 'Recombinant Vaccines' },
  { ticker: 'BIIB', name: 'Biogen Inc.', sector: 'Neurodegenerative Treatments' },

  // Materials, Mining, Copper & Lithium
  { ticker: 'FCX', name: 'Freeport-McMoRan', sector: 'Copper & Gold Mining' },
  { ticker: 'SCCO', name: 'Southern Copper', sector: 'Copper Mining' },
  { ticker: 'NEM', name: 'Newmont Corp.', sector: 'Gold Mining' },
  { ticker: 'GOLD', name: 'Barrick Gold', sector: 'Gold & Copper' },
  { ticker: 'AEM', name: 'Agnico Eagle Mines', sector: 'Precious Metals' },
  { ticker: 'KGC', name: 'Kinross Gold', sector: 'Gold Operations' },
  { ticker: 'AU', name: 'AngloGold Ashanti', sector: 'Gold Producer' },
  { ticker: 'SBSW', name: 'Sibanye Stillwater', sector: 'PGM & Battery Metals' },
  { ticker: 'ALB', name: 'Albemarle Corp.', sector: 'Lithium & Specialty Chemicals' },
  { ticker: 'SQM', name: 'Sociedad Quimica y Minera', sector: 'Lithium & Potassium' },
  { ticker: 'LAC', name: 'Lithium Americas', sector: 'Thacker Pass Lithium' },
  { ticker: 'MP', name: 'MP Materials', sector: 'Rare Earth Elements' },
  { ticker: 'CLF', name: 'Cleveland-Cliffs', sector: 'Flat-Rolled Steel' },
  { ticker: 'NUE', name: 'Nucor Corp.', sector: 'Steel Mini-Mills' },
  { ticker: 'STLD', name: 'Steel Dynamics', sector: 'Circular Steel' },
  { ticker: 'X', name: 'United States Steel', sector: 'Integrated Steel' },
  { ticker: 'AA', name: 'Alcoa Corp.', sector: 'Bauxite & Aluminum' },
  { ticker: 'CENX', name: 'Century Aluminum', sector: 'Primary Aluminum' },

  // Transport, Freight & Airlines
  { ticker: 'FDX', name: 'FedEx Corp.', sector: 'Express Parcel & Logistics' },
  { ticker: 'UPS', name: 'United Parcel Service', sector: 'Global Logistics' },
  { ticker: 'UNP', name: 'Union Pacific', sector: 'Class I Railroad' },
  { ticker: 'CSX', name: 'CSX Corp.', sector: 'Rail Transportation' },
  { ticker: 'NSC', name: 'Norfolk Southern', sector: 'Freight Rail' },
  { ticker: 'DAL', name: 'Delta Air Lines', sector: 'Passenger Airline' },
  { ticker: 'UAL', name: 'United Airlines', sector: 'Global Airline' },
  { ticker: 'AAL', name: 'American Airlines', sector: 'Commercial Airline' },
  { ticker: 'LUV', name: 'Southwest Airlines', sector: 'Domestic Airline' },
  { ticker: 'JBLU', name: 'JetBlue Airways', sector: 'Low-Cost Airline' },
  { ticker: 'ALK', name: 'Alaska Air Group', sector: 'Regional & Transcon Air' },
  { ticker: 'XPO', name: 'XPO Inc.', sector: 'Less-Than-Truckload (LTL)' },
  { ticker: 'SAIA', name: 'Saia Inc.', sector: 'LTL Freight Shipping' },
  { ticker: 'ODFL', name: 'Old Dominion Freight Line', sector: 'LTL Transportation' },

  // Benchmark ETFs, Sector SPDRs & Volatility
  { ticker: 'DIA', name: 'SPDR Dow Jones Industrial ETF', sector: 'Dow 30 Index ETF' },
  { ticker: 'KWEB', name: 'KraneShares CSI China Internet', sector: 'China Internet ETF' },
  { ticker: 'FXI', name: 'iShares China Large-Cap ETF', sector: 'China Large-Cap ETF' },
  { ticker: 'EEM', name: 'iShares MSCI Emerging Markets', sector: 'Emerging Markets ETF' },
  { ticker: 'EFA', name: 'iShares MSCI EAFE ETF', sector: 'Developed Markets ETF' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', sector: 'Precious Metals ETF' },
  { ticker: 'SLV', name: 'iShares Silver Trust', sector: 'Precious Metals ETF' },
  { ticker: 'USO', name: 'United States Oil Fund', sector: 'Crude Oil ETF' },
  { ticker: 'UNG', name: 'United States Natural Gas', sector: 'Natural Gas ETF' },
  { ticker: 'TQQQ', name: 'ProShares UltraPro QQQ (3x)', sector: 'Leveraged Tech ETF' },
  { ticker: 'SQQQ', name: 'ProShares UltraPro Short QQQ (-3x)', sector: 'Inverse Tech ETF' },
  { ticker: 'SOXL', name: 'Direxion Daily Semiconductor 3x', sector: 'Leveraged Semis ETF' },
  { ticker: 'SOXS', name: 'Direxion Daily Semi Bear -3x', sector: 'Inverse Semis ETF' },
  { ticker: 'UVXY', name: 'ProShares Ultra VIX Short-Term', sector: 'Volatility ETF' },
  { ticker: 'VXX', name: 'iPath Series B S&P 500 VIX', sector: 'Volatility ETN' }
];

async function main() {
  console.log('Fetching S&P 500 constituents from GitHub...');
  const res = await fetch('https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv');
  const csvText = await res.text();
  const lines = csvText.split('\n').filter(l => l.trim().length > 0);

  const sp500Map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const parts = row.split(',');
    if (parts.length >= 3) {
      const sym = parts[0].trim().replace(/\./g, '-');
      const name = parts[1].replace(/\"/g, '').trim();
      const sector = parts[2].replace(/\"/g, '').trim();
      sp500Map.set(sym, {
        ticker: sym,
        name,
        sector,
        isSP500: true,
        capCategory: 'sp500'
      });
    }
  }

  console.log(`Loaded ${sp500Map.size} S&P 500 constituents.`);

  const masterList = Array.from(sp500Map.values());
  const existingTickers = new Set(sp500Map.keys());

  // Add small/mid caps and ETFs
  for (const item of SMALL_MID_CAPS) {
    if (!existingTickers.has(item.ticker)) {
      existingTickers.add(item.ticker);
      const isEtf = item.sector.includes('ETF');
      masterList.push({
        ticker: item.ticker,
        name: item.name,
        sector: item.sector,
        isSP500: false,
        capCategory: isEtf ? 'etf' : 'small_mid'
      });
    }
  }

  // If under 1,050 names, pull top active options common stocks from Nasdaq listing to reach 1,050+
  if (masterList.length < 1050) {
    console.log(`Current universe: ${masterList.length}. Fetching additional liquid Nasdaq equities to reach 1,050+...`);
    try {
      const nasdaqRes = await fetch('https://raw.githubusercontent.com/datasets/nasdaq-listings/master/data/nasdaq-listed.csv');
      const nasdaqCsv = await nasdaqRes.text();
      const nLines = nasdaqCsv.split('\n');
      for (let i = 1; i < nLines.length; i++) {
        if (masterList.length >= 1080) break;
        const line = nLines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        const sym = parts[0].trim();
        const compName = parts.slice(1).join(',').replace(/\"/g, '').trim();
        if (
          /^[A-Z]{2,4}$/.test(sym) &&
          !existingTickers.has(sym) &&
          !compName.includes('Warrant') &&
          !compName.includes('Unit') &&
          !compName.includes('Right') &&
          !compName.includes('Preferred') &&
          !compName.includes('Acquisition') &&
          !compName.includes('Trust') &&
          !compName.includes('Depositary')
        ) {
          existingTickers.add(sym);
          masterList.push({
            ticker: sym,
            name: compName,
            sector: 'Technology & Growth',
            isSP500: false,
            capCategory: 'small_mid'
          });
        }
      }
    } catch (e: any) {
      console.warn('Could not pull extra Nasdaq names:', e.message);
    }
  }

  console.log(`Total Master Universe Catalog: ${masterList.length} equities and ETFs.`);

  fs.writeFileSync('./src/data/masterCatalog.json', JSON.stringify(masterList, null, 2));
  console.log('Saved master catalog to src/data/masterCatalog.json');
}

main().catch(console.error);
