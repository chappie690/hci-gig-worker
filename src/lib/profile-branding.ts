export const profileStorageKey = "skillpilot-profile-overrides";
export const profileEventName = "skillpilot-profile-updated";

export type ProfileBrandingOverride = {
  fullName?: string;
  email?: string;
  avatarUrl?: string;
  activeLogoUrl?: string;
  logoSource?: string;
  brandName?: string;
  tagline?: string;
  updatedAt?: string;
  brandingPreview?: unknown;
};

export function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getDisplayLogo(override?: ProfileBrandingOverride) {
  return override?.activeLogoUrl || override?.avatarUrl || "";
}

export function readProfileOverrides() {
  if (typeof window === "undefined") {
    return {} as Record<string, ProfileBrandingOverride>;
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(profileStorageKey) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed as Record<string, ProfileBrandingOverride> : {};
  } catch {
    window.localStorage.removeItem(profileStorageKey);
    return {};
  }
}

export function getStoredProfileBranding(email?: string) {
  if (!email) {
    return {};
  }

  return readProfileOverrides()[email] ?? {};
}

export function findStoredProfileBranding(identifier?: string) {
  if (!identifier) {
    return {};
  }

  const normalized = identifier.toLowerCase();
  const overrides = readProfileOverrides();

  return Object.values(overrides).find((item) => {
    return [item.email, item.fullName, item.brandName].some((value) => value?.toLowerCase() === normalized);
  }) ?? {};
}

export function saveProfileBranding(email: string, patch: ProfileBrandingOverride) {
  const overrides = readProfileOverrides();
  const existing = overrides[email] ?? {};
  overrides[email] = {
    ...existing,
    ...patch,
    email: patch.email ?? existing.email ?? email,
    updatedAt: new Date().toISOString()
  };
  window.localStorage.setItem(profileStorageKey, JSON.stringify(overrides));
  window.dispatchEvent(new Event(profileEventName));
}
