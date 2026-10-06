import { notFound } from "next/navigation";

import { ModuleEditor } from "@/components/learning/module-editor";
import { QuestionEditor } from "@/components/learning/question-editor";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getModuleEditor } from "@/lib/learning/service";

export default async function EditModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  const learner = await learnerPageContext();
  const result = await getModuleEditor(learner, moduleSlug);
  if (result.error) notFound();
  return (
    <div className="space-y-6 text-[#0B2C4A]">
      <h1 className="page-title">Edit module {result.module.moduleNumber}</h1>
      <ModuleEditor
        module={{
          slug: result.module.slug,
          summary: result.module.summary,
          lessonContent: result.module.lessonContent,
          videoUrl: result.module.videoUrl,
          videoProvider: result.module.videoProvider,
          status: result.module.status,
        }}
      />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Questions</h2>
        {result.questions.map((question) => (
          <QuestionEditor
            key={question.id}
            question={{
              id: question.id,
              prompt: question.prompt,
              explanation: question.explanation,
              questionType: question.questionType,
              bank: question.bank,
              options: question.options.map((option) => ({ id: option.id, label: option.label, isCorrect: option.isCorrect })),
            }}
          />
        ))}
      </section>
    </div>
  );
}
