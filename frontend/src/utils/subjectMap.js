export const SUBJECT_MAP = {
  "24CSH-206": "Design and Analysis of Algorithms",
  "24CSH-207": "Object Oriented Programming using Java",
  "24CSP-209": "Competitive Coding-I",
  "24CSP-210": "Full Stack Development-I",
  "24CSR-208": "Semester Mini Project",
  "24CST-205": "Operating Systems",
  "24CST-208": "Software Engineering",
  "24CST-211": "Introduction to Machine Learning (Through SWAYAM)",
  "24TDP-291": "SOFT SKILLS - II",
  "24TDT-292": "APTITUDE - II"
};

export const getSubjectDisplayName = (subjectCode) => {
  if (!subjectCode) return '';
  const title = SUBJECT_MAP[subjectCode];
  return title ? `${subjectCode} — ${title}` : subjectCode;
};
