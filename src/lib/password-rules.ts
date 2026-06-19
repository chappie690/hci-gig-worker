export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: "At least 10 characters",
    test: (password) => password.length >= 10
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password)
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (password) => /[a-z]/.test(password)
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /\d/.test(password)
  },
  {
    id: "special",
    label: "One special character",
    test: (password) => /[^A-Za-z0-9]/.test(password)
  },
  {
    id: "trimmed",
    label: "No leading or trailing spaces",
    test: (password) => password.length > 0 && password.trim() === password
  }
];

export function getPasswordRuleResults(password: string) {
  return passwordRules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: rule.test(password)
  }));
}

export function isStrongPassword(password: string) {
  return getPasswordRuleResults(password).every((rule) => rule.passed);
}

export function strongPasswordMessage() {
  return "Password must be at least 10 characters and include uppercase, lowercase, number, special character, with no leading or trailing spaces.";
}
