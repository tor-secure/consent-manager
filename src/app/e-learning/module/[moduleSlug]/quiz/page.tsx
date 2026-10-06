import { AssessmentRunner } from "@/components/learning/assessment-runner";

export default async function ModuleQuizPage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  return (
    <div className="page-wrap">
      <AssessmentRunner
        title="Module quiz"
        startPath={`/api/learning/modules/${moduleSlug}/quiz`}
        submitPath={(attemptId) => `/api/learning/quizzes/${attemptId}`}
        onPassedHref="/e-learning"
      />
    </div>
  );
}
