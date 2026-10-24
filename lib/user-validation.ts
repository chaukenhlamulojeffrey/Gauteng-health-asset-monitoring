export type UserProfileData = {
  display_name: string;
  surname: string;
  email: string;
  contact_number: string;
};

export function parseUserProfile(input: unknown): UserProfileData | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return null;
  }
  const value = input as Record<string, unknown>;
  if (
    typeof value.display_name !== 'string' ||
    typeof value.surname !== 'string' ||
    typeof value.email !== 'string' ||
    typeof value.contact_number !== 'string'
  ) {
    return null;
  }

  const displayName = value.display_name.trim();
  const surname = value.surname.trim();
  const email = value.email.trim().toLowerCase();
  const contactNumber = value.contact_number.trim();
  const digitCount = contactNumber.replace(/\D/g, '').length;

  if (
    displayName.length < 2 ||
    displayName.length > 150 ||
    surname.length < 2 ||
    surname.length > 100 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    contactNumber.length < 7 ||
    contactNumber.length > 30 ||
    digitCount < 7 ||
    !/^[+0-9() -]+$/.test(contactNumber)
  ) {
    return null;
  }

  return {
    display_name: displayName,
    surname,
    email,
    contact_number: contactNumber,
  };
}
