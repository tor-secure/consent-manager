"use server";

import { revalidatePath } from "next/cache";

import { learnerPageContext } from "@/lib/learning/page-context";
import { enrollInCourse } from "@/lib/learning/service";

export async function enrollInDpdpCourse(): Promise<{ error: string | null }> {
  try {
    const learner = await learnerPageContext();
    await enrollInCourse(learner);
    revalidatePath("/e-learning");
    return { error: null };
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: "Enrollment could not be saved. Try again." };
  }
}
