import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pane,
  Heading,
  Button,
  Alert,
  Card,
  Text,
  Table,
  Link,
  IconButton,
  EditIcon,
  ArrowLeftIcon,
  Badge,
  TextInput,
  Textarea,
  Select,
  FormField,
  TrashIcon,
} from 'evergreen-ui';
import { StatusPill } from '../components/StatusPill';
import { CVScoreBadge, parseCVBreakdown, getScoreColor, getScoreLabel } from '../components/CVScoreBadge';
import { ApplicationForm } from './ApplicationForm';
import { CvRefineDialog } from '../components/CvRefineDialog';

// ── Small helpers ──────────────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <Pane marginBottom={12}>
      <Text size={300} color="#888" display="block" marginBottom={2} textTransform="uppercase" letterSpacing="0.04em">
        {label}
      </Text>
      {children}
    </Pane>
  );
}

function FieldText({ label, value, fallback = 'N/A' }) {
  return (
    <Field label={label}>
      <Text size={400} fontWeight="500">{value || fallback}</Text>
    </Field>
  );
}

function Section({ title, children, marginBottom = 16 }) {
  return (
    <Card padding={20} elevation={1} background="#ffffff" marginBottom={marginBottom}>
      <Heading size={500} marginBottom={16}>{title}</Heading>
      {children}
    </Card>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState(null);
  const [refineOpen, setRefineOpen] = useState(false);
  const [genTick, setGenTick] = useState(0);
  // Actions ported from the legacy detail page
  const [actionMsg, setActionMsg] = useState(null); // { intent, text }
  const [scoreLoading, setScoreLoading] = useState(false);
  const [refuseLoading, setRefuseLoading] = useState(false);
  const [offerLoading, setOfferLoading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [scoringTextOpen, setScoringTextOpen] = useState(false);
  const [roundOpen, setRoundOpen] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);
  const emptyRound = { round_type: '', interview_date: '', interviewer: '', outcome: '', notes: '' };
  const [roundForm, setRoundForm] = useState(emptyRound);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/applications/${id}`);
      if (!response.ok) throw new Error('Candidature non trouvée');
      setApplication(await response.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) setCompanies(await response.json());
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  useEffect(() => {
    fetchApplication();
    fetchCompanies();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmitForm = async (formData) => {
    try {
      setFormLoading(true);
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }
      await fetchApplication();
      setFormOpen(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateCv = async () => {
    try {
      setGenLoading(true);
      setGenMsg(null);
      const response = await fetch(`/api/applications/${id}/generate-cv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erreur lors de la génération du CV');
      await fetchApplication();
      setGenMsg({
        intent: 'success',
        text: data.regenerated
          ? 'CV regenerated — PDF refreshed (chat preserved) ✓'
          : data.tailored
          ? "CV généré et adapté à l'offre ✓"
          : 'CV généré depuis le profil maître (adaptation IA indisponible).',
      });
      setGenTick((t) => t + 1); // tell the dialog to reload session + refresh the PDF
      setRefineOpen(true);
    } catch (err) {
      setGenMsg({ intent: 'danger', text: err.message });
    } finally {
      setGenLoading(false);
    }
  };

  // Generic action runner: call the API, surface errors, refresh the app.
  const runAction = async (url, options, okText) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Une erreur est survenue');
    await fetchApplication();
    if (okText) setActionMsg({ intent: 'success', text: okText });
    return data;
  };

  const handleExtractOffer = async () => {
    setOfferLoading(true); setActionMsg(null);
    try {
      await runAction(`/api/applications/${id}/extract-offer`, { method: 'POST' }, 'Annonce ré-extraite ✓');
    } catch (e) { setActionMsg({ intent: 'danger', text: e.message }); }
    finally { setOfferLoading(false); }
  };

  const handlePasteOffer = async () => {
    if (!pasteContent.trim()) { setActionMsg({ intent: 'danger', text: 'Le texte collé est vide.' }); return; }
    setOfferLoading(true); setActionMsg(null);
    try {
      await runAction(
        `/api/applications/${id}/offer-text`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: pasteTitle, content: pasteContent }) },
        "Texte d'annonce enregistré ✓",
      );
      setPasteOpen(false); setPasteTitle(''); setPasteContent('');
    } catch (e) { setActionMsg({ intent: 'danger', text: e.message }); }
    finally { setOfferLoading(false); }
  };

  const handleScoreCv = async () => {
    setScoreLoading(true); setActionMsg(null);
    try {
      const data = await runAction(`/api/applications/${id}/score-cv`, { method: 'POST' }, null);
      setActionMsg({ intent: 'success', text: `Score CV calculé : ${data.score}/10 ✓` });
    } catch (e) { setActionMsg({ intent: 'danger', text: e.message }); }
    finally { setScoreLoading(false); }
  };

  const handleRefuseLowMatch = async () => {
    setRefuseLoading(true); setActionMsg(null);
    try {
      await runAction(`/api/applications/${id}/refuse-low-match`, { method: 'POST' }, 'Candidature archivée ✓');
    } catch (e) { setActionMsg({ intent: 'danger', text: e.message }); }
    finally { setRefuseLoading(false); }
  };

  const handleAddRound = async () => {
    setRoundLoading(true); setActionMsg(null);
    try {
      await runAction(
        `/api/applications/${id}/interviews`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(roundForm) },
        'Entretien ajouté ✓',
      );
      setRoundOpen(false); setRoundForm(emptyRound);
    } catch (e) { setActionMsg({ intent: 'danger', text: e.message }); }
    finally { setRoundLoading(false); }
  };

  const handleDeleteRound = async (roundId) => {
    setActionMsg(null);
    try {
      await runAction(`/api/applications/${id}/interviews/${roundId}`, { method: 'DELETE' }, 'Entretien supprimé ✓');
    } catch (e) { setActionMsg({ intent: 'danger', text: e.message }); }
  };

  if (loading) return <Pane padding={16}>Chargement…</Pane>;

  if (!application) {
    return (
      <Pane>
        <Button appearance="minimal" iconBefore={ArrowLeftIcon} marginBottom={16} onClick={() => navigate('/applications')}>
          Retour
        </Button>
        <Alert intent="danger">Candidature non trouvée</Alert>
      </Pane>
    );
  }

  const app = application;
  const companyName = app.company?.name || 'Entreprise supprimée';
  const breakdown = parseCVBreakdown(app.cv_match_breakdown_json);

  return (
    <Pane maxWidth={960} marginX="auto">
      {/* ── Header ── */}
      <Pane display="flex" justifyContent="space-between" alignItems="center" marginBottom={8}>
        <Button appearance="minimal" iconBefore={ArrowLeftIcon} onClick={() => navigate('/applications')}>
          Retour
        </Button>
        <IconButton icon={EditIcon} height={32} appearance="primary" onClick={() => setFormOpen(true)} title="Modifier" />
      </Pane>

      {error && <Alert intent="danger" marginBottom={16}>Erreur : {error}</Alert>}
      {actionMsg && <Alert intent={actionMsg.intent} marginBottom={16}>{actionMsg.text}</Alert>}

      <Pane marginBottom={24}>
        <Heading size={800}>{app.job_title}</Heading>
        <Text size={500} color="#555">{companyName}</Text>
      </Pane>

      {/* ── Row 1: General info + Stage & Score ── */}
      <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={16} marginBottom={16}>

        <Section title="Informations générales">
          <Field label="Statut">
            <StatusPill status={app.status} />
          </Field>
          <FieldText label="Date d'ajout"
            value={app.created_at ? new Date(app.created_at).toLocaleDateString('fr-FR') : null} />
          {app.status !== 'À postuler' && (
            <FieldText label="Date de candidature"
              value={app.applied_date ? new Date(app.applied_date).toLocaleDateString('fr-FR') : null} />
          )}
          <FieldText label="Localisation" value={app.location} />
          <FieldText label="Télétravail" value={app.remote_type} />
          {app.job_url && (
            <Field label="Lien de l'offre">
              <Link href={app.job_url} target="_blank" size={400}>Consulter l'offre ↗</Link>
            </Field>
          )}
          {app.contact && <FieldText label="Contact" value={app.contact} />}
          {(app.salary_expectation || app.salary_offered) && (
            <Pane display="flex" gap={24}>
              {app.salary_expectation && <FieldText label="Salaire souhaité" value={app.salary_expectation} />}
              {app.salary_offered && <FieldText label="Salaire proposé" value={app.salary_offered} />}
            </Pane>
          )}
        </Section>

        <Section title="Étapes & Entretien">
          <FieldText label="Étape d'entretien actuelle" value={app.interview_stage} fallback="Aucune" />
          <FieldText label="Étape max atteinte" value={app.max_interview_stage} fallback="—" />

          {app.status === 'Refus' && (
            <>
              <FieldText label="Étape du refus" value={app.refusal_stage} />
              <FieldText label="Raison du refus" value={app.refusal_reason} />
            </>
          )}

          <Field label="Score CV">
            <CVScoreBadge score={app.cv_match_score} />
          </Field>

          {app.cv_match_score && (
            <Pane marginTop={4}>
              <Text size={300} color={getScoreColor(app.cv_match_score)} fontWeight="600">
                {getScoreLabel(app.cv_match_score)}
              </Text>
              {app.cv_match_updated_at && (
                <Text size={300} color="#999" display="block" marginTop={2}>
                  Analysé le {new Date(app.cv_match_updated_at).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </Pane>
          )}

          <Pane marginTop={8} marginBottom={12} display="flex" flexDirection="column" gap={8}>
            <Button appearance="default" isLoading={scoreLoading} onClick={handleScoreCv}>
              {app.cv_match_score ? '↻ Recalculer le score CV' : 'Calculer le score CV'}
            </Button>
            {app.cv_refusal_suggested && app.status !== 'Archivé' && (
              <Alert intent="warning" title="Score CV faible (2 évaluations < 7/10)">
                <Text size={300} display="block" marginBottom={8}>
                  Score CV inférieur à 7/10 sur deux évaluations. Tu peux archiver
                  cette candidature (tu n'as jamais postulé).
                </Text>
                <Button intent="warning" appearance="primary" isLoading={refuseLoading} onClick={handleRefuseLowMatch}>
                  Archiver la candidature
                </Button>
              </Alert>
            )}
          </Pane>

          {(app.resume_url || app.resume_missing || app.cv_file_url) && (
            <Field label="CV déposé">
              {app.resume_url ? (
                <Link href={app.resume_url} target="_blank" rel="noopener noreferrer" size={400}>
                  📄 Ouvrir le CV (PDF) ↗
                </Link>
              ) : app.resume_missing ? (
                <Text size={300} color="#D14343" title={app.resume_sent}>
                  ⚠️ Fichier introuvable
                </Text>
              ) : app.cv_file_url ? (
                <Link href={app.cv_file_url} target="_blank" rel="noopener noreferrer" size={400}>
                  📄 Ouvrir le CV (PDF) ↗
                </Link>
              ) : null}
            </Field>
          )}

          <Field label="CV adapté à l'offre">
            <Pane display="flex" gap={8} alignItems="center">
              <Button appearance="primary" isLoading={genLoading} onClick={handleGenerateCv}>
                ✨ Générer le CV adapté
              </Button>
              {app.cv_file_url && app.cv_source === 'generated' && (
                <Button appearance="default" disabled={genLoading} onClick={() => setRefineOpen(true)}>
                  💬 Affiner le CV
                </Button>
              )}
            </Pane>
            {genMsg && (
              <Text
                size={300}
                color={genMsg.intent === 'danger' ? '#D14343' : '#52BD94'}
                display="block"
                marginTop={6}
              >
                {genMsg.text}
              </Text>
            )}
          </Field>
        </Section>
      </Pane>

      {/* ── Notes & Prochaines étapes ── */}
      {(app.notes || app.next_steps) && (
        <Pane display="grid" gridTemplateColumns={app.notes && app.next_steps ? '1fr 1fr' : '1fr'} gap={16} marginBottom={16}>
          {app.notes && (
            <Section title="Notes">
              <Text size={400} whiteSpace="pre-wrap" color="#333">{app.notes}</Text>
            </Section>
          )}
          {app.next_steps && (
            <Section title="Prochaines étapes">
              <Text size={400} whiteSpace="pre-wrap" color="#333">{app.next_steps}</Text>
            </Section>
          )}
        </Pane>
      )}

      {/* ── CV Analysis ── */}
      {(app.cv_match_summary || app.cv_match_explanation) && (
        <Section title="Analyse CV" marginBottom={16}>
          {app.cv_match_summary && (
            <Field label="Résumé">
              <Text size={400} color="#333" whiteSpace="pre-wrap">{app.cv_match_summary}</Text>
            </Field>
          )}
          {breakdown && (
            <Field label="Critères">
              <Pane marginTop={4}>
                {Array.isArray(breakdown)
                  ? breakdown.map((item, i) => (
                      <Pane key={i} marginBottom={10} padding={10} background="#f8f9fa" borderRadius={4} border="1px solid #e4e7eb">
                        <Pane display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
                          <Text size={400} fontWeight="600">{item.criterion ?? `Critère ${i + 1}`}</Text>
                          <Badge color={item.score / (item.max || 10) >= 0.8 ? 'green' : item.score / (item.max || 10) >= 0.6 ? 'yellow' : 'red'}>
                            {item.score}{item.max ? `/${item.max}` : ''}
                          </Badge>
                        </Pane>
                        {item.justification && (
                          <Text size={300} color="#555" whiteSpace="pre-wrap">{item.justification}</Text>
                        )}
                      </Pane>
                    ))
                  : Object.entries(breakdown).map(([key, value]) => {
                      const isObj = value !== null && typeof value === 'object';
                      const score = isObj ? value.score : value;
                      const max = isObj ? value.max : null;
                      const justification = isObj ? value.justification : null;
                      const label = isObj ? (value.criterion ?? key) : key;
                      return (
                        <Pane key={key} marginBottom={10} padding={10} background="#f8f9fa" borderRadius={4} border="1px solid #e4e7eb">
                          <Pane display="flex" justifyContent="space-between" alignItems="center" marginBottom={4}>
                            <Text size={400} fontWeight="600">{label}</Text>
                            <Badge>{max != null ? `${score}/${max}` : `${score}%`}</Badge>
                          </Pane>
                          {justification && (
                            <Text size={300} color="#555" whiteSpace="pre-wrap">{justification}</Text>
                          )}
                        </Pane>
                      );
                    })
                }
              </Pane>
            </Field>
          )}
        </Section>
      )}

      {/* ── Annonce & texte de scoring ── */}
      <Section title="Annonce & texte de scoring" marginBottom={16}>
        <Pane display="flex" gap={8} flexWrap="wrap" marginBottom={12}>
          <Button appearance="default" isLoading={offerLoading} disabled={!app.job_url} onClick={handleExtractOffer}>
            ↻ Re-extraire depuis l'URL
          </Button>
          <Button appearance="minimal" onClick={() => setPasteOpen((v) => !v)}>
            📋 Coller le texte manuellement
          </Button>
        </Pane>

        {pasteOpen && (
          <Pane marginBottom={12} padding={12} background="#f8f9fa" borderRadius={4} border="1px solid #e4e7eb">
            <FormField label="Titre de l'annonce (optionnel)" marginBottom={8}>
              <TextInput width="100%" value={pasteTitle} onChange={(e) => setPasteTitle(e.target.value)} placeholder="ex : Senior Product Manager" />
            </FormField>
            <FormField label="Texte de l'annonce">
              <Textarea value={pasteContent} onChange={(e) => setPasteContent(e.target.value)} placeholder="Colle ici le contenu complet de l'offre…" rows={8} />
            </FormField>
            <Pane display="flex" gap={8} marginTop={8}>
              <Button appearance="primary" isLoading={offerLoading} onClick={handlePasteOffer}>Enregistrer le texte</Button>
              <Button appearance="minimal" onClick={() => setPasteOpen(false)}>Annuler</Button>
            </Pane>
          </Pane>
        )}

        {app.extracted_offer && (app.extracted_offer.content || app.extracted_offer.title) ? (
          <Pane marginBottom={8}>
            <Text size={300} color="#888" display="block" marginBottom={4}>
              {app.extracted_offer.is_manual_paste ? 'Source : texte collé manuellement' : `Source : ${app.extracted_offer.source_url || '—'}`}
              {app.extracted_offer.updated_at && <> · maj {new Date(app.extracted_offer.updated_at).toLocaleDateString('fr-FR')}</>}
            </Text>
            {app.extracted_offer.title && (
              <Text size={400} fontWeight="600" display="block" marginBottom={4}>{app.extracted_offer.title}</Text>
            )}
            {app.extracted_offer.content && (
              <>
                <Button appearance="minimal" onClick={() => setOfferOpen((v) => !v)}>
                  {offerOpen ? '▾ Masquer le contenu extrait' : '▸ Voir le contenu extrait'}
                </Button>
                {offerOpen && (
                  <Text size={300} color="#333" whiteSpace="pre-wrap" display="block" marginTop={8} maxHeight={320} overflow="auto">
                    {app.extracted_offer.content}
                  </Text>
                )}
              </>
            )}
          </Pane>
        ) : (
          <Text size={300} color="#999" display="block" marginBottom={8}>Aucune annonce extraite pour l'instant.</Text>
        )}

        {app.scoring_offer_text && (
          <Pane marginTop={8}>
            <Button appearance="minimal" onClick={() => setScoringTextOpen((v) => !v)}>
              {scoringTextOpen ? '▾ Masquer le texte de scoring' : '▸ Texte exact utilisé pour le scoring'}
            </Button>
            {scoringTextOpen && (
              <Text size={300} color="#555" whiteSpace="pre-wrap" display="block" marginTop={8} maxHeight={320} overflow="auto" background="#f8f9fa" padding={10} borderRadius={4}>
                {app.scoring_offer_text}
              </Text>
            )}
          </Pane>
        )}
      </Section>

      {/* ── Interview rounds ── */}
      <Section title={`Entretiens${app.interview_rounds?.length ? ` (${app.interview_rounds.length})` : ''}`} marginBottom={16}>
        {app.interview_rounds && app.interview_rounds.length > 0 ? (
          <Table width="100%">
            <Table.Head>
              <Table.TextHeaderCell>Étape</Table.TextHeaderCell>
              <Table.TextHeaderCell>Date</Table.TextHeaderCell>
              <Table.TextHeaderCell>Interlocuteur</Table.TextHeaderCell>
              <Table.TextHeaderCell>Résultat</Table.TextHeaderCell>
              <Table.TextHeaderCell>Notes</Table.TextHeaderCell>
              <Table.TextHeaderCell flexBasis={64} flexGrow={0} flexShrink={0}> </Table.TextHeaderCell>
            </Table.Head>
            <Table.Body>
              {app.interview_rounds.map((round) => (
                <Table.Row key={round.id}>
                  <Table.TextCell fontWeight="500">{round.stage || 'N/A'}</Table.TextCell>
                  <Table.TextCell>
                    {round.scheduled_at
                      ? new Date(round.scheduled_at).toLocaleDateString('fr-FR')
                      : '—'}
                  </Table.TextCell>
                  <Table.TextCell>{round.interviewer || '—'}</Table.TextCell>
                  <Table.TextCell>{round.outcome || '—'}</Table.TextCell>
                  <Table.TextCell>{round.notes || '—'}</Table.TextCell>
                  <Table.Cell flexBasis={64} flexGrow={0} flexShrink={0} justifyContent="flex-end">
                    <IconButton icon={TrashIcon} intent="danger" appearance="minimal" title="Supprimer l'entretien" onClick={() => handleDeleteRound(round.id)} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <Text size={300} color="#999">Aucun entretien enregistré.</Text>
        )}

        {roundOpen ? (
          <Pane marginTop={12} padding={12} background="#f8f9fa" borderRadius={4} border="1px solid #e4e7eb">
            <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={12}>
              <FormField label="Étape">
                <Select width="100%" value={roundForm.round_type} onChange={(e) => setRoundForm({ ...roundForm, round_type: e.target.value })}>
                  <option value="">Entretien</option>
                  <option value="Filtre RH">Filtre RH</option>
                  <option value="Product match">Product match</option>
                  <option value="Case">Case</option>
                  <option value="Final">Final</option>
                </Select>
              </FormField>
              <FormField label="Date">
                <TextInput type="date" width="100%" value={roundForm.interview_date} onChange={(e) => setRoundForm({ ...roundForm, interview_date: e.target.value })} />
              </FormField>
              <FormField label="Interlocuteur">
                <TextInput width="100%" value={roundForm.interviewer} onChange={(e) => setRoundForm({ ...roundForm, interviewer: e.target.value })} />
              </FormField>
              <FormField label="Résultat">
                <TextInput width="100%" value={roundForm.outcome} onChange={(e) => setRoundForm({ ...roundForm, outcome: e.target.value })} placeholder="ex : Passé, En attente…" />
              </FormField>
            </Pane>
            <FormField label="Notes" marginTop={4}>
              <Textarea value={roundForm.notes} onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })} />
            </FormField>
            <Pane display="flex" gap={8} marginTop={8}>
              <Button appearance="primary" isLoading={roundLoading} onClick={handleAddRound}>Ajouter l'entretien</Button>
              <Button appearance="minimal" onClick={() => { setRoundOpen(false); setRoundForm(emptyRound); }}>Annuler</Button>
            </Pane>
          </Pane>
        ) : (
          <Button marginTop={12} appearance="default" onClick={() => setRoundOpen(true)}>+ Ajouter un entretien</Button>
        )}
      </Section>

      {/* ── Footer metadata ── */}
      <Card padding={12} elevation={0} background="#f9f9f9" marginBottom={24}>
        <Text size={300} color="#aaa">
          {app.updated_at && <>Mis à jour le {new Date(app.updated_at).toLocaleDateString('fr-FR')}</>}
          {app.source && <> · Source : {app.source}</>}
        </Text>
      </Card>

      <ApplicationForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={app}
        isLoading={formLoading}
        companies={companies}
      />

      <CvRefineDialog
        applicationId={id}
        isShown={refineOpen}
        refreshTick={genTick}
        onClose={() => setRefineOpen(false)}
        onSaved={fetchApplication}
      />
    </Pane>
  );
}
