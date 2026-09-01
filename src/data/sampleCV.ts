import type { CVData } from '../types/cv';
import { createPortfolioDefaults } from './portfolioDefaults';

export const sampleCV: CVData = {
  schemaVersion: 2, version: 1, id: 'joshua-general', profileName: 'Joshua Gabriel — General', updatedAt: new Date().toISOString(),
  personal: {
    fullName: 'Joshua Gabriel', email: 'joshgabadams@gmail.com', phone: '0815 790 3044', secondaryPhone: '0911 414 3793',
    nationality: 'Nigerian', maritalStatus: 'Single', linkedIn: 'https://linkedin.com/in/joshua-gabriel',
    portfolio: 'https://joshua-gabriel.dev', whatsapp: 'https://wa.me/2348157903044', github: 'https://github.com/joshuagabriel',
  },
  summary: {
    headline: 'Data Analyst | Web Developer',
    text: 'I design and build data-driven digital solutions that power smarter financial decisions. Skilled in Python, SQL, Excel, and Power BI, specialized in developing interactive dashboards, performance analytics, and business intelligence systems within banking and fintech environments.\n\nWith hands-on experience in core banking operations and reporting, I combine analytical thinking with modern UI/UX and web development skills to create scalable, user-focused products.',
  },
  location: { state: 'Federal Capital Territory', region: 'North Central', lga: 'Municipal Area Council (AMAC)', address: 'A10 Gishiri, Nicon Junction, Katampe Ext.', country: 'Nigeria' },
  experiences: [
    { id: 'exp-1', jobTitle: 'DATA ANALYST', organization: 'MICROBIZ MICROFINANCE BANK', startDate: 'Jan 2025', current: true, description: 'Prepare periodic business reporting and analysis (monthly, weekly, and daily), develop live performance dashboards, data entry & migration, design staff incentive calculators, analyze client and customer traffic, and deliver business trend insights to drive growth and expansion.', achievements: [], technologies: ['Power BI', 'SQL', 'Excel'], order: 0, keepTogether: true },
    { id: 'exp-2', jobTitle: 'DATA ANALYST INTERN', employmentType: 'Hybrid', organization: 'Nigerian Education Data Initiative (NEDI) | Federal Ministry of Education', startDate: 'Feb 2026', current: true, description: 'Selected through a UNDP-supported Graduate Programme and placed with the Nigerian Education Data Initiative under the Federal Ministry of Education. I support onboarding, validation, management, analysis, and reporting of educational data within a national School Database Management System.', achievements: [], technologies: ['Data validation', 'Reporting'], order: 1, keepTogether: true },
    { id: 'exp-3', jobTitle: 'IT / FIELD OFFICER', employmentType: 'Volunteer', organization: 'ACCEL AFRICA – Rural Empowerment Development and Intervention Foundation (RENDIF)', startDate: 'Sep 2025', current: true, description: 'Supported a digital education intervention in Niger State by implementing the PezuAfrica Student Database Management System, training teachers on digital attendance tracking, sensitizing parents and community stakeholders, and collaborating to improve school participation and educational outcomes.', achievements: [], technologies: [], order: 2, keepTogether: true },
    { id: 'exp-4', jobTitle: 'CUSTOMER SERVICE / OPERATIONS OFFICER', organization: 'MicroBiz Microfinance Bank', startDate: 'Mar 2023', endDate: 'Dec 2024', current: false, description: 'Managed customer onboarding, account documentation, transaction support, and operational reporting while maintaining excellent service standards and data accuracy.', achievements: ['Improved daily reporting consistency and turnaround time.'], technologies: ['Excel', 'Core banking'], order: 3, keepTogether: true },
  ],
  education: [
    { id: 'edu-1', qualification: 'B.Sc. Computer Science', institution: 'National Open University of Nigeria', startYear: '2022', current: true, description: 'Coursework focused on software engineering, databases, algorithms, and information systems.', order: 0 },
    { id: 'edu-2', qualification: 'National Diploma', fieldOfStudy: 'Computer Science', institution: 'Federal Polytechnic Bida', startYear: '2017', endYear: '2019', order: 1 },
  ],
  certifications: [
    { id: 'cert-1', name: 'Certificate of Completion', issuer: 'Digital Skills Program', date: '2024', items: ['Product Design | UI/UX', 'Python Programming', 'National Directorate of Employment'], order: 0 },
    { id: 'cert-2', name: 'Data Analysis and Business Intelligence', issuer: 'Professional Learning Programme', date: '2025', order: 1 },
  ],
  skills: ['Data Analysis & Reporting','Power BI','Microsoft Excel','SQL','Python','Web Development','UI/UX Design','Business Intelligence','Data Visualization','Communication'].map((name, order) => ({ id: `skill-${order}`, name, level: order < 5 ? 'Advanced' : 'Intermediate', category: order < 5 ? 'Analytics' : 'Professional', order })),
  hobbies: ['Reading','Technology','Volunteering','Problem solving'].map((name, order) => ({ id: `hobby-${order}`, name, order })),
  references: [
    { id: 'ref-1', name: 'Available on request', order: 0 },
  ],
  projects: [
    { id: 'project-1', title: 'Financial Performance Dashboard', subtitle: 'Power BI / SQL', date: '2025', body: 'Interactive portfolio and transaction dashboard supporting management reporting and operational decisions.', order: 0 },
  ],
  settings: {
    primary: '#1639B7', heading: '#071334', text: '#424242', muted: '#707070', skillBackground: '#E9EAED',
    headingFont: 'Poppins', bodyFont: 'Poppins', oneFont: true, bodySize: 11, density: 'standard', sectionSpacing: 10, atsMode: false,
    showSkillLevels: true, alphabeticalSkills: false, referencesOnRequest: true, fileName: 'Joshua_Gabriel_CV',
    sections: [
      { key: 'summary', label: 'Professional Summary', enabled: true }, { key: 'location', label: 'Location', enabled: true },
      { key: 'experiences', label: 'Work Experience', enabled: true }, { key: 'education', label: 'Education', enabled: true },
      { key: 'certifications', label: 'Certifications', enabled: true }, { key: 'skills', label: 'Skills', enabled: true },
      { key: 'projects', label: 'Projects', enabled: false }, { key: 'hobbies', label: 'Hobbies / Interests', enabled: true },
      { key: 'references', label: 'References', enabled: true },
    ],
  },
  portfolio: createPortfolioDefaults(),
};
