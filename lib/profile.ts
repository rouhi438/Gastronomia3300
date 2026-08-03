export type ProfileFields = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ProfileCheckResult = {
  profile: ProfileFields | null;
  isComplete: boolean;
  error: Error | null;
};

type ProfileQueryResponse = {
  data: ProfileFields | null;
  error: unknown;
};

export function isProfileComplete(
  profile: ProfileFields | null | undefined,
): boolean {
  const fullName = profile?.full_name?.trim() ?? "";
  const email = profile?.email?.trim() ?? "";
  const phone = profile?.phone?.trim() ?? "";

  return Boolean(fullName && email && phone);
}

export async function getProfileCompletionStatus(
  supabase: unknown,
  userId: string,
): Promise<ProfileCheckResult> {
  const queryClient = supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          maybeSingle: () =>
            | PromiseLike<ProfileQueryResponse>
            | ProfileQueryResponse;
        };
      };
    };
  };

  const { data, error } = await queryClient
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof (error as { message?: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Unknown profile query error";

    console.error("Profile completion query failed:", message);

    return {
      profile: null,
      isComplete: false,
      error: new Error(message),
    };
  }

  return {
    profile: data ?? null,
    isComplete: isProfileComplete(data),
    error: null,
  };
}

export function getProfileDestination(isComplete: boolean): string {
  return isComplete ? "/profile" : "/complete-profile";
}
