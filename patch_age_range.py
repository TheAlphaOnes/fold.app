with open('src/utils/dob.ts', 'r') as f:
    content = f.read()

addition = """
/** Returns age demographic bucket for analytics */
export function getAgeRange(dob: string | undefined | null): string | null {
  const year = dobYear(dob);
  if (!year) return null;
  const age = new Date().getFullYear() - year;
  
  if (age < 13) return '<13';
  if (age <= 17) return '13-17';
  if (age <= 24) return '18-24';
  if (age <= 34) return '25-34';
  if (age <= 44) return '35-44';
  if (age <= 54) return '45-54';
  if (age <= 64) return '55-64';
  return '65+';
}
"""

if "getAgeRange" not in content:
    content += addition

with open('src/utils/dob.ts', 'w') as f:
    f.write(content)
