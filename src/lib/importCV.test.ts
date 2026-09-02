import { describe, expect, it } from 'vitest';
import { sampleCV } from '../data/sampleCV';
import { parseCVText } from './importCV';

const uploadedCV = `
Ada Lovelace
Platform Engineer
ada@analytical.engine
+44 20 7946 0958 | linkedin.com/in/ada-lovelace

PROFESSIONAL SUMMARY
Engineer building reliable analytical systems and developer tools.

WORK EXPERIENCE
Senior Platform Engineer
Analytical Engines Ltd
Jan 2021 - Present
• Built a distributed computation platform.
• Led a team of six engineers.
Developer
Difference Systems
2018 - 2020
• Shipped automation used by the research team.

EDUCATION
BSc Mathematics
University of London
2014 - 2017

TECHNICAL SKILLS
TypeScript, Python, PostgreSQL, Kubernetes

CERTIFICATIONS
Cloud Architecture - Example Institute, 2023

PROJECTS
Open Engine: An open-source calculation toolkit

INTERESTS
Computing, Music
`;

describe('parseCVText', () => {
  it('creates a clean profile from the uploaded document instead of retaining sample data', () => {
    const result = parseCVText(uploadedCV, sampleCV);
    const draft = result.draft;

    expect(draft.personal.fullName).toBe('Ada Lovelace');
    expect(draft.personal.email).toBe('ada@analytical.engine');
    expect(draft.personal.phone).toContain('7946');
    expect(draft.summary.headline).toBe('Platform Engineer');
    expect(draft.summary.text).toContain('reliable analytical systems');
    expect(draft.experiences).toHaveLength(2);
    expect(draft.experiences[0]).toMatchObject({
      jobTitle: 'Senior Platform Engineer', organization: 'Analytical Engines Ltd', startDate: 'Jan 2021', current: true,
    });
    expect(draft.education[0]).toMatchObject({ qualification: 'BSc Mathematics', institution: 'University of London' });
    expect(draft.skills.map((skill) => skill.name)).toEqual(['TypeScript', 'Python', 'PostgreSQL', 'Kubernetes']);
    expect(draft.certifications[0].name).toBe('Cloud Architecture');
    expect(draft.projects[0].title).toBe('Open Engine');
    expect(draft.hobbies.map((hobby) => hobby.name)).toEqual(['Computing', 'Music']);

    expect(JSON.stringify(draft)).not.toContain('Joshua Gabriel');
    expect(JSON.stringify(draft)).not.toContain('MicroBiz Microfinance Bank');
    expect(JSON.stringify(draft)).not.toContain('Power BI');
  });

  it('rejects documents without readable text instead of returning sample content', () => {
    expect(() => parseCVText('   ', sampleCV)).toThrow(/No readable text/);
  });
});
