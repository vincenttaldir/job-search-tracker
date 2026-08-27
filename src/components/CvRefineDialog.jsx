import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, Pane, Textarea, Button, Text, Spinner, RadioGroup, Checkbox } from 'evergreen-ui';

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

const fmtScore = (s) => (typeof s === 'number' ? `${s}/10` : '—');
const scoreColor = (s) =>
  typeof s !== 'number' ? '#8f95b2' : s >= 7 ? '#317159' : s >= 5 ? '#996A13' : '#7D2828';
const scoreBg = (s) =>
  typeof s !== 'number' ? '#EDEFF5' : s >= 7 ? '#DCF2EA' : s >= 5 ? '#FCEED3' : '#F9DADA';

/**
 * Full-size Refine-CV workspace:
 *  - left  : live PDF preview (refreshed on every CV change / regeneration)
 *  - right : CV score, the initial HITL questions, improvement suggestions, and a PERSISTENT
 *            chat (history stored per application; the AI may ask follow-up questions agentically)
 * The chat history is loaded from / saved to the backend so it survives close/reopen and a
 * regeneration (which only refreshes the PDF, never the chat).
 */
export function CvRefineDialog({ applicationId, isShown, refreshTick = 0, onClose, onSaved }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewTs, setPreviewTs] = useState(0);
  const [pendingQuestions, setPendingQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [qBusy, setQBusy] = useState(false);
  const [curScore, setCurScore] = useState(null);
  const [curScoreSummary, setCurScoreSummary] = useState('');
  const [pendingSuggestions, setPendingSuggestions] = useState([]);
  const [selected, setSelected] = useState({});
  const [sBusy, setSBusy] = useState(false);
  const [jsonEditorShown, setJsonEditorShown] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [jsonBusy, setJsonBusy] = useState(false);
  const scrollRef = useRef(null);

  const persist = useCallback(
    (msgs, qs) => {
      const body = { messages: msgs };
      if (qs !== undefined) body.questions = qs;
      fetch(`/api/applications/${applicationId}/cv-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).catch(() => {});
    },
    [applicationId]
  );

  // Load the persisted session whenever the dialog opens or the CV is (re)generated.
  useEffect(() => {
    if (!isShown) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/applications/${applicationId}/cv-session`);
        const data = await res.json();
        if (cancelled) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setPendingQuestions(normalizeQuestions(data.questions));
        setCurScore(typeof data.score === 'number' ? data.score : null);
        setCurScoreSummary(data.score_summary || '');
        setPendingSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
        setAnswers({});
        setSelected({});
        setInput('');
        setPreviewTs(Date.now()); // refresh the PDF preview
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isShown, refreshTick, applicationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy, qBusy, sBusy]);

  // Effective answer for a question (handles the "Other…" free-text branch).
  const answerFor = (q) => {
    const v = answers[q.id];
    if (q.allow_other && v === OTHER) return (answers[`${q.id}__text`] || '').trim();
    return (v || '').trim();
  };

  const submitAnswers = async () => {
    const payload = pendingQuestions
      .map((q) => ({ id: q.id, question: q.question, answer: answerFor(q) }))
      .filter((a) => a.answer);
    if (payload.length === 0 || qBusy) return;
    setQBusy(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/answer-cv-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error while sending the answers');
      const msgs = [
        ...messages,
        { role: 'user', text: payload.map((a) => `${a.question}\n→ ${a.answer}`).join('\n\n') },
        { role: 'assistant', text: data.reply || 'CV updated.' },
      ];
      setMessages(msgs);
      setPendingQuestions([]);
      setAnswers({});
      if (typeof data.score === 'number') setCurScore(data.score);
      if (data.score_summary) setCurScoreSummary(data.score_summary);
      setPendingSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setPreviewTs(Date.now());
      persist(msgs, []); // questions resolved
      if (onSaved) onSaved();
    } catch (err) {
      const msgs = [...messages, { role: 'assistant', text: '⚠️ ' + err.message }];
      setMessages(msgs);
      persist(msgs);
    } finally {
      setQBusy(false);
    }
  };

  const applySuggestions = async () => {
    const chosen = pendingSuggestions.filter((s) => selected[s.id]);
    if (chosen.length === 0 || sBusy) return;
    setSBusy(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/apply-cv-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggestions: chosen.map((s) => ({ bullet: s.bullet, target: s.target, rationale: s.rationale })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error while applying the suggestions');
      const msgs = [
        ...messages,
        { role: 'user', text: 'Applied suggestions:\n' + chosen.map((s) => `• ${s.bullet}`).join('\n') },
        { role: 'assistant', text: data.reply || 'CV updated.' },
      ];
      setMessages(msgs);
      if (typeof data.score === 'number') setCurScore(data.score);
      if (data.score_summary) setCurScoreSummary(data.score_summary);
      setPendingSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setSelected({});
      setPreviewTs(Date.now());
      persist(msgs);
      if (onSaved) onSaved();
    } catch (err) {
      const msgs = [...messages, { role: 'assistant', text: '⚠️ ' + err.message }];
      setMessages(msgs);
      persist(msgs);
    } finally {
      setSBusy(false);
    }
  };

  const openJsonEditor = async () => {
    setJsonError('');
    setJsonEditorShown(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/cv-profile`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error while loading the CV JSON');
      setJsonText(JSON.stringify(data.profile ?? {}, null, 2));
    } catch (err) {
      setJsonError(err.message);
    }
  };

  const saveJsonEdit = async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setJsonError('Invalid JSON: ' + err.message);
      return;
    }
    setJsonBusy(true);
    setJsonError('');
    try {
      const res = await fetch(`/api/applications/${applicationId}/cv-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: parsed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error while saving');
      setJsonEditorShown(false);
      setPreviewTs(Date.now());
      const note = data.trimmed_note
        ? `Manual JSON edit saved. ⚠️ To keep the CV on 1 page, ${data.trimmed_note} had to be trimmed.`
        : 'Manual JSON edit saved and the CV was re-rendered.';
      const msgs = [...messages, { role: 'assistant', text: note }];
      setMessages(msgs);
      persist(msgs);
      if (onSaved) onSaved();
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setJsonBusy(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const history = messages.slice(-8);
    const msgs1 = [...messages, { role: 'user', text }];
    setMessages(msgs1);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/refine-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: text, history }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error while refining');
      const msgs2 = [...msgs1, { role: 'assistant', text: data.reply || 'CV updated.' }];
      setMessages(msgs2);
      // Agentic: when the assistant asks a clarifying question, the CV/PDF is left unchanged
      // and we simply wait for the user's next message.
      if (!data.needs_input) {
        setPreviewTs(Date.now());
        if (onSaved) onSaved();
      }
      persist(msgs2);
    } catch (err) {
      const msgs2 = [...msgs1, { role: 'assistant', text: '⚠️ ' + err.message }];
      setMessages(msgs2);
      persist(msgs2);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const selectedCount = pendingSuggestions.filter((s) => selected[s.id]).length;

  return (
    <Dialog
      isShown={isShown}
      title="Refine the CV"
      onCloseComplete={onClose}
      hasFooter={false}
      width="96vw"
      topOffset="3vh"
      preventBodyScrolling
    >
      <Pane display="flex" gap={16} height="86vh">
        {/* Left: live CV preview */}
        <Pane flex={1.6} minWidth={0} border="muted" borderRadius={6} overflow="hidden" background="#f4f5f7" display="flex" flexDirection="column">
          <iframe
            // key forces a full remount on every refresh: Chrome's PDF viewer ignores a
            // query-string-only src change and keeps showing the stale document otherwise.
            key={previewTs}
            title="CV preview"
            src={`/api/applications/${applicationId}/cv?t=${previewTs}`}
            style={{ width: '100%', flex: 1, border: 0 }}
          />
          <Pane paddingX={10} paddingY={6} background="#f4f5f7" borderTop="muted" display="flex" justifyContent="flex-end">
            <Text
              is="a"
              size={300}
              color="#3366FF"
              href={`/api/applications/${applicationId}/cv?t=${previewTs}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the rendered PDF ↗
            </Text>
          </Pane>
        </Pane>

        {/* Right: score + questions + suggestions + persistent chat */}
        <Pane flex={1} minWidth={360} display="flex" flexDirection="column">
          <Pane display="flex" alignItems="center" gap={8} marginBottom={10}>
            <Pane
              flex={1}
              paddingX={12}
              paddingY={8}
              borderRadius={8}
              background={scoreBg(curScore)}
            >
              <Text size={300} fontWeight={600} color={scoreColor(curScore)}>
                CV score vs offer: {fmtScore(curScore)}
              </Text>
            </Pane>
            <Button size="small" onClick={openJsonEditor}>
              Edit JSON
            </Button>
          </Pane>
          {curScoreSummary ? (
            <Text size={300} color="#696f8c" marginBottom={10} whiteSpace="pre-wrap">
              {curScoreSummary}
            </Text>
          ) : null}

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingRight: 4, marginBottom: 10 }}>
            {/* Initial HITL questions */}
            {pendingQuestions.length > 0 && (
              <Pane marginBottom={12} padding={10} background="#FFFAF1" border="muted" borderRadius={8}>
                <Text size={300} fontWeight={600} color="#101840" display="block" marginBottom={8}>
                  🤔 A few questions for a perfect CV:
                </Text>
                {pendingQuestions.map((q) => (
                  <Pane key={q.id} marginBottom={12}>
                    <Text size={300} color="#101840" display="block" marginBottom={4} whiteSpace="pre-wrap">
                      {q.question}
                    </Text>
                    {q.type === 'choice' ? (
                      <>
                        <RadioGroup
                          size={16}
                          value={answers[q.id] || ''}
                          options={[
                            ...q.options.map((o) => ({ label: o, value: o })),
                            ...(q.allow_other ? [{ label: 'Other…', value: OTHER }] : []),
                          ]}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                        {q.allow_other && answers[q.id] === OTHER && (
                          <Textarea
                            value={answers[`${q.id}__text`] || ''}
                            onChange={(e) => setAnswers((a) => ({ ...a, [`${q.id}__text`]: e.target.value }))}
                            placeholder="Type your custom title…"
                            rows={1}
                            resize="none"
                            marginTop={6}
                          />
                        )}
                      </>
                    ) : (
                      <Textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        placeholder="Your answer…"
                        rows={2}
                        resize="none"
                      />
                    )}
                  </Pane>
                ))}
                <Button appearance="primary" isLoading={qBusy} onClick={submitAnswers}>
                  Send my answers
                </Button>
              </Pane>
            )}

            {/* Improvement suggestions — only once all initial questions are answered. */}
            {pendingQuestions.length === 0 && pendingSuggestions.length > 0 && (
              <Pane marginBottom={12} padding={10} background="#F3F6FF" border="muted" borderRadius={8}>
                <Text size={300} fontWeight={600} color="#101840" display="block" marginBottom={8}>
                  💡 Suggestions to better match the offer:
                </Text>
                {pendingSuggestions.map((s) => (
                  <Pane key={s.id} marginBottom={10} paddingBottom={8} borderBottom="muted">
                    <Checkbox
                      label={s.bullet}
                      checked={!!selected[s.id]}
                      onChange={(e) => setSelected((sel) => ({ ...sel, [s.id]: e.target.checked }))}
                    />
                    {s.rationale ? (
                      <Text size={300} color="#696f8c" display="block" marginLeft={24} whiteSpace="pre-wrap">
                        {s.rationale}
                      </Text>
                    ) : null}
                    <Text size={300} color="#3366FF" display="block" marginLeft={24} marginTop={2}>
                      Score before {fmtScore(s.score_before ?? curScore)} → after {fmtScore(s.score_after)}
                    </Text>
                  </Pane>
                ))}
                <Button appearance="primary" isLoading={sBusy} disabled={selectedCount === 0} onClick={applySuggestions}>
                  Apply selected suggestions{selectedCount ? ` (${selectedCount})` : ''}
                </Button>
              </Pane>
            )}

            {messages.map((m, i) => (
              <Pane
                key={i}
                marginBottom={8}
                display="flex"
                justifyContent={m.role === 'user' ? 'flex-end' : 'flex-start'}
              >
                <Pane
                  background={m.role === 'user' ? '#3366FF' : '#EDEFF5'}
                  paddingX={10}
                  paddingY={7}
                  borderRadius={8}
                  maxWidth="90%"
                >
                  <Text size={300} color={m.role === 'user' ? 'white' : '#101840'} whiteSpace="pre-wrap">
                    {m.text}
                  </Text>
                </Pane>
              </Pane>
            ))}
            {(busy || qBusy || sBusy) && (
              <Pane display="flex" alignItems="center" gap={8} marginTop={4}>
                <Spinner size={16} />
                <Text size={300} color="#696f8c">Working…</Text>
              </Pane>
            )}
          </div>

          <Pane>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Change request or answer…  (Enter = send, Shift+Enter = new line)"
              rows={3}
              disabled={busy}
              resize="none"
            />
            <Pane display="flex" justifyContent="space-between" alignItems="center" marginTop={8}>
              <Text size={300} color="#8f95b2">Chat history is saved for this application.</Text>
              <Button appearance="primary" isLoading={busy} onClick={send}>
                Send
              </Button>
            </Pane>
          </Pane>
        </Pane>
      </Pane>

      <Dialog
        isShown={jsonEditorShown}
        title="Edit CV JSON manually"
        onCloseComplete={() => setJsonEditorShown(false)}
        hasFooter={false}
        width="70vw"
        preventBodyScrolling
      >
        <Text size={300} color="#696f8c" display="block" marginBottom={8}>
          Edit the CV profile JSON directly — no AI involved. It's re-rendered as-is and only
          auto-trimmed if it doesn't fit on 1 page.
        </Text>
        {jsonError ? (
          <Text size={300} color="#BF0E08" display="block" marginBottom={8} whiteSpace="pre-wrap">
            {jsonError}
          </Text>
        ) : null}
        <Textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={26}
          spellCheck={false}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
        <Pane display="flex" justifyContent="flex-end" gap={8} marginTop={12}>
          <Button onClick={() => setJsonEditorShown(false)} disabled={jsonBusy}>
            Cancel
          </Button>
          <Button appearance="primary" isLoading={jsonBusy} onClick={saveJsonEdit}>
            Save &amp; re-render
          </Button>
        </Pane>
      </Dialog>
    </Dialog>
  );
}
