import { config } from './env' 

// ============================================
// STATIC CONTENT CONFIGURATION
// ============================================
// All text content and data for the portal
// ============================================

// Hero Section
export const heroContent = {
  title: "Enterprise Architecture Portal",
  description: "The Enterprise Architecture (EA) portal of Grenada is designed as a centralized platform to support the digital transformation initiatives of the government. It provides an accessible resource for Ministries, Departments, and Agencies (MDAs) by disseminating digital architecture information and standardizing system architecture designs across government entities. The portal aims to accommodate the natural evolution of architectural frameworks and foster a collaborative environment for managing shared infrastructure and interoperable solutions. This approach enables the alignment of digital initiatives with national priorities, facilitating seamless service delivery and governance efficiency."
};

// Strategic Focus Areas
export interface StrategyCard {
  id: string;
  title: string;
  description: string;
  image: string;
}

export const strategicFocusAreas: StrategyCard[] = [
  {
    id: 'build-people',
    title: 'Build Our People',
    description: 'Investing in our people through strategic campaigns and skill development programs.',
    image: '/images/build-our-people.jpg'
  },
  {
    id: 'simplify-life',
    title: 'Simplify Life',
    description: 'Simplify the lives of our citizens and business users by transforming GoG services.',
    image: '/images/simplify-life.jpg'
  },
  {
    id: 'boost-resilience',
    title: 'Boost Resilience & Sustainability',
    description: 'Encourage long-term sustainable and resilient initiatives planning across all MDAs.',
    image: '/images/boost-resilience.jpg'
  }
];

// Vision & Strategy
export const visionStrategy = {
  title: "Vision & Strategy",
  description: "Grenada's national vision is the guiding principle for the country's development and progress. Supporting this vision is the digital strategy, which outlines the use of technology and streamlined processes to improve government services and engage citizens effectively.\n\nThe Enterprise Architecture (EA) framework plays a critical role in realizing both the national vision and the digital strategy. By aligning various government initiatives with these overarching goals, the EA ensures that all digital initiatives and systems actively contribute to shared national public sectors and participate in the nation's digital future."
};

// EA News and Updates
export interface NewsCard {
  id: string;
  title: string;
  description: string;
}

export const newsUpdates: NewsCard[] = [
  {
    id: 'governance',
    title: 'Governance',
    description: 'GoG is launching the Digital Transformation Agency (DTA) to support digital transformations.'
  },
  {
    id: 'policy',
    title: 'Policy',
    description: 'Draft GEA policy has been introduced to promote the age of digital transformation.'
  },
  {
    id: 'survey',
    title: 'Survey',
    description: 'GoG has launched the citizen survey to understand your requirements for digital future.'
  }
];

// About Page Content
export const aboutContent = {
  title: "About",
  dta: {
    title: "Digital Transformation Agency (DTA)",
    description: "The Digital Transformation Agency (DTA) is a key entity established by the Government of Grenada to spearhead the nation's digital transformation initiatives. Its primary role is to guide and facilitate the development of innovative and sustainable digital solutions across GoG. The DTA aims to enhance the efficiency and effectiveness of public service delivery while promoting a citizen-centered approach to governance."
  },
  gea: {
    title: "Grenada Enterprise Architecture (GEA)",
    description: "The DTA is also responsible for developing and implementing the overall digital strategy for Grenada, ensuring that all digital initiatives align with the national vision for a Digital Nation by 2030. It plays a crucial role in establishing and managing the Grenada's Enterprise Architecture (GEA), which serves as a framework to standardize digital services and improve interoperability among government entities."
  },
  governance: {
    title: "EA Governance",
    description: "The DTA has EA Governance teams to support the various GoG entities in the digital transformation journey. Feel free to reach out to DTA - EA Governance team using the service request option on this portal."
  },
  contact: {
    title: "Contact Information",
    email: config.ABOUT_CONTACT_EMAIL,
    description: "The team can be reached at eservices@gov.gd"
  }
};

// Footer Links
export interface FooterLink {
  label: string;
  url: string;
}

export const footerLinks = {
  quickLinks: [
    { label: 'GoG', url: 'https://www.gov.gd/' },
    { label: 'eServices', url: 'https://eservice.gov.gd/' },
    { label: 'Constitution', url: 'https://grenadaparliament.gd/ova_doc/' }
  ],
  generalInfo: [
    { label: 'About Grenada', url: '/about' },
    { label: 'Facts', url: 'https://www.gov.gd/' }
  ]
};
