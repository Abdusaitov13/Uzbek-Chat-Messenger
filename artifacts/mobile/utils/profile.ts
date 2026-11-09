export function isValidBirthDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isFutureBirthDate(value: string): boolean {
  if (!isValidBirthDate(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const today = new Date();
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return Date.UTC(year!, month! - 1, day!) > todayUtc;
}

export function calculateAge(value: string): number | null {
  if (!isValidBirthDate(value) || isFutureBirthDate(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - year!;
  if (
    today.getMonth() + 1 < month! ||
    (today.getMonth() + 1 === month! && today.getDate() < day!)
  ) {
    age -= 1;
  }
  return age;
}
