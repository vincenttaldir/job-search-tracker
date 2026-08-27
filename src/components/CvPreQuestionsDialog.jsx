import { useState, useEffect } from 'react';
import { Dialog, Pane, Textarea, Button, Text, RadioGroup } from 'evergreen-ui';

const OTHER = '__other__';

/** Normalise questions into {id,type,question,options,allow_other}. */
function normalizeQuestions(questions) {
  return (Array.isArray(questions) ? questions : [])
    .map((q, i) =>
      typeof q === 'string'
        ? { id: `q${i + 1}`, type: 'text', question: q, options: [], allow_other: false }
        : {
            id: q.id || `q${i + 1}`,
            type: q.type || (q.options && q.options.length ? 'choice' : 'text'),
            question: q.question || '',
            options: Array.isArray(q.options) ? q.options : [],
            allow_other: !!q.allow_other,
          }
    )
    .filter((q) => q.question);
}

/**
 * Pre-generation questions dialog.
 *
 * Shown BEFORE the first CV draft: the answers are baked into the very first tailored CV
 * (and distilled into the durable memory). Mirrors the answer widgets of CvRefineDialog.
 * Two actions: "Generate with my answers" and "Generate directly" (skip). Answering is
 * optional per-question — empty answers are dropped.
 */
export function CvPreQuestionsDialog({ isShown, questions, isGenerating, onGenerate, onSkip, onClose }) {
  const [answers, setAnswers] = useState({});
  const norm = normalizeQuestions(questions);

  // Reset the collected answers whenever a fresh set of questions is shown.
  useEffect(() => {
    if (isShown) setAnswers({});
  }, [isShown, questions]);

  const answerFor = (q) => {
    const v = answers[q.id] || '';
    if (q.allow_other && v === OTHER) return (answers[`${q.id}__text`] || '').trim();
    return typeof v === 'string' ? v.trim() : v;
  };

  const buildPayload = () =>
    norm
      .map((q) => ({ id: q.id, question: q.question, answer: answerFor(q) }))
      .filter((a) => a.answer);

  return (
    <Dialog
      isShown={isShown}
      title="Quelques questions avant de générer le CV"
      onCloseComplete={onClose}
      hasFooter={false}
      width="640px"
      preventBodyScrolling
    >
      <Pane paddingBottom={8}>
        <Text size={300} color="#696f8c" display="block" marginBottom={16}>
          Réponds à ce que tu peux — tes réponses sont intégrées dès le premier jet du CV et
          mémorisées pour tes prochaines offres. Tu peux aussi générer directement.
        </Text>

        {norm.map((q) => (
          <Pane key={q.id} marginBottom={14}>
            <Text size={400} fontWeight={500} display="block" marginBottom={6}>
              {q.question}
            </Text>
            {q.type === 'choice' ? (
              <>
                <RadioGroup
                  size={16}
                  value={answers[q.id] || ''}
                  options={[
                    ...q.options.map((o) => ({ label: o, value: o })),
                    ...(q.allow_other ? [{ label: 'Autre…', value: OTHER }] : []),
                  ]}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
                {q.allow_other && answers[q.id] === OTHER && (
                  <Textarea
                    value={answers[`${q.id}__text`] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [`${q.id}__text`]: e.target.value }))}
                    placeholder="Ta réponse…"
                    rows={2}
                    resize="none"
                  />
                )}
              </>
            ) : (
              <Textarea
                value={answers[q.id] || ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Ta réponse…"
                rows={2}
                resize="none"
              />
            )}
          </Pane>
        ))}

        <Pane display="flex" gap={8} alignItems="center" marginTop={8}>
          <Button appearance="primary" isLoading={isGenerating} onClick={() => onGenerate(buildPayload())}>
            ✨ Générer avec mes réponses
          </Button>
          <Button appearance="default" disabled={isGenerating} onClick={onSkip}>
            Générer directement
          </Button>
        </Pane>
      </Pane>
    </Dialog>
  );
}
