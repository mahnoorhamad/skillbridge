const authErrorMessages: Record<string, string> = {
  "auth/email-already-in-use":
    "Unable to complete registration.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-email": "Enter your email address.",
  "auth/missing-password": "Enter your password.",
  "auth/network-request-failed":
    "A network error occurred. Check your connection and try again.",
  "auth/operation-not-allowed":
    "Email and password sign-in is currently unavailable.",
  "auth/too-many-requests": "Too many attempts. Wait a while and try again.",
  "auth/user-disabled": "This account is disabled. Contact support.",
  "auth/weak-password": "Choose a stronger password.",
};

export function getFirebaseAuthErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return authErrorMessages[error.code] ?? fallback;
  }

  return fallback;
}
