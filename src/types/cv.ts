export type Density = 'compact' | 'standard' | 'spacious';
export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type SectionKey = 'summary' | 'location' | 'experiences' | 'education' | 'certifications' | 'skills' | 'hobbies' | 'references' | 'projects';
export type PortfolioSectionKey = 'hero' | 'about' | 'services' | 'projects' | 'testimonials' | 'contact';
export type PortfolioEditorSection = 'overview' | 'images' | 'about' | 'services' | 'projects' | 'testimonials' | 'contact';

export interface PersonalInfo {
  fullName: string; email: string; phone: string; secondaryPhone?: string;
  nationality?: string; maritalStatus?: string; linkedIn?: string;
  portfolio?: string; whatsapp?: string; github?: string; website?: string;
  instagram?: string; twitter?: string; facebook?: string;
}
export interface Experience { id: string; jobTitle: string; employmentType?: string; organization: string; location?: string; startDate: string; endDate?: string; current: boolean; description: string; achievements: string[]; technologies: string[]; website?: string; order: number; keepTogether?: boolean; }
export interface Education { id: string; qualification: string; fieldOfStudy?: string; institution: string; location?: string; startYear?: string; endYear?: string; description?: string; grade?: string; current?: boolean; order: number; }
export interface Certification { id: string; name: string; issuer?: string; date?: string; expiryDate?: string; credentialId?: string; credentialUrl?: string; description?: string; items?: string[]; order: number; }
export interface Skill { id: string; name: string; level?: SkillLevel; category?: string; proficiency?: number; featured?: boolean; order: number; }
export interface Hobby { id: string; name: string; order: number; }
export interface Reference { id: string; name: string; phone?: string; email?: string; jobTitle?: string; organization?: string; address?: string; relationship?: string; order: number; }
export interface LinkPreview { title?: string; description?: string; imageUrl?: string; siteName?: string; fetchedAt?: string; }
export interface Project { id: string; title: string; subtitle?: string; date?: string; body?: string; bullets?: string[]; url?: string; sector?: string; tags?: string[]; image?: string; linkPreview?: LinkPreview; featured?: boolean; order: number; }
export interface PortfolioService { id: string; title: string; description: string; icon: 'layout' | 'code' | 'smartphone' | 'chart'; order: number; }
export interface Testimonial { id: string; name: string; role?: string; company?: string; quote: string; avatar?: string; visible: boolean; order: number; }
export interface PortfolioSettings {
  slug: string; published: boolean; publishedAt?: string;
  heroImage?: string; heroImageAlt: string; aboutImage?: string; aboutImageAlt: string;
  heroSummary?: string; aboutSummary?: string;
  servicesIntro?: string; projectsIntro?: string; testimonialsIntro?: string;
  contactHeading: string; contactBody: string; footerNote?: string;
  sections: Record<PortfolioSectionKey, boolean>;
  services: PortfolioService[]; testimonials: Testimonial[];
}
export interface SectionSetting { key: SectionKey; label: string; enabled: boolean; startNewPage?: boolean; }
export interface CVSettings {
  primary: string; heading: string; text: string; muted: string; skillBackground: string;
  headingFont: string; bodyFont: string; oneFont: boolean; bodySize: number; density: Density;
  sectionSpacing: number;
  atsMode: boolean; showSkillLevels: boolean; alphabeticalSkills: boolean; referencesOnRequest: boolean;
  fileName: string; sections: SectionSetting[];
}
export interface CVData {
  schemaVersion: 2; version: number; id: string; profileName: string; updatedAt: string;
  personal: PersonalInfo; summary: { headline?: string; text?: string };
  location: { state?: string; region?: string; lga?: string; address?: string; country?: string };
  experiences: Experience[]; education: Education[]; certifications: Certification[];
  skills: Skill[]; hobbies: Hobby[]; references: Reference[]; projects: Project[]; settings: CVSettings;
  portfolio: PortfolioSettings;
}
