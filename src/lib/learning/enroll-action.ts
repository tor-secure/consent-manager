"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getLearningSession } from "@/lib/learning/auth";
import { enrollInCourse } from "@/lib/learning/service";

const SIGN_IN_FOR_ENROLL = `/e-learning/sign-in?redirect_url=${encodeURIComponent("/e-learning?intent=enroll")}`;

export async function enrollInDpdpCourse(): Promise<{ error: string | null }> {
  const learner = await getLearningSession();
  if (!learner) {
    redirect(SIGN_IN_FOR_ENROLL);
  }

  try {
    await enrollInCourse(learner);
    revalidatePath("/e-learning");
    return { error: null };
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: "Enrollment could not be saved. Try again." };
  }
}
