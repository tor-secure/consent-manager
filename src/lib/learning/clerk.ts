export function learningClerkKeys() {
  const secretKey = process.env.LEARNING_CLERK_SECRET_KEY?.trim() ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_LEARNING_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  return { secretKey, publishableKey, configured: Boolean(secretKey && publishableKey) };
}

export function safeLearningPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/e-learning/sign-")) return "/e-learning";
  if (value.startsWith("/e-learning") || value.startsWith("/api/learning")) return value;
  return "/e-learning";
}
