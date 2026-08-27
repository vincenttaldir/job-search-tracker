import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Pane,
  TextInput,
  Textarea,
  Button,
  Select,
  FormField,
  Text,
  Alert,
  Badge,
  UploadIcon,
  DocumentIcon,
  CrossIcon,
  LinkIcon,
  IconButton,
} from 'evergreen-ui';
import { getAllStatuses } from '../components/StatusPill';

const INTERVIEW_STAGES = ['Filtre RH', 'Product match', 'Case', 'Final'];
const REFUSAL_STAGE_OPTIONS = ['Avant Entretien RH', ...INTERVIEW_STAGES];
const REFUSAL_REASONS = [
  "Pas de fit produit",
  "Pas assez d'expérience",
  "Niveau technique insuffisant",
  "Rémunération",
  "Localisation / remote",
  "Process stoppé",
  "No response / ghosting",
  "Score CV insuffisant",
  "Autre",
];

const EMPTY_FORM = {
  company_id: '',
  job_title: '',
  job_url: '',
  location: '',
  status: 'À postuler',
  applied_date: '',
  interview_stage: '',
  refusal_reason: '',
  refusal_stage: '',
  notes: '',
  next_steps: '',
  resume_sent: '',
};

export function ApplicationForm({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  isLoading = false,
  companies = [],
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // CV upload state
  const [cvFile, setCvFile] = useState(null);
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadDone, setCvUploadDone] = useState(false);
  const [cvUploadError, setCvUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const statuses = getAllStatuses();

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const appliedDate = initialData.applied_date
          ? new Date(initialData.applied_date).toISOString().split('T')[0]
          : '';
        setFormData({
          company_id: initialData.company_id || '',
          job_title: initialData.job_title || '',
          job_url: initialData.job_url || initialData.job_link || '',
          location: initialData.location || '',
          status: initialData.status || 'Brouillon',
          applied_date: appliedDate,
          interview_stage: initialData.interview_stage || '',
          refusal_reason: initialData.refusal_reason || '',
          refusal_stage: initialData.refusal_stage || '',
          notes: initialData.notes || '',
          next_steps: initialData.next_steps || '',
          resume_sent: initialData.resume_sent || '',
        });
      } else {
        setFormData(EMPTY_FORM);
      }
      setErrors({});
      setCvFile(null);
      setCvUploadDone(false);
      setCvUploadError(null);
    }
  }, [isOpen, initialData]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.company_id) newErrors.company_id = "L'entreprise est requise";
    if (!formData.job_title.trim()) newErrors.job_title = 'Le titre du poste est requis';
    if (!formData.job_url.trim()) newErrors.job_url = "L'URL de l'offre est requise";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
    setCvUploadDone(false);
    setCvUploadError(null);
  };

  const handleCvUpload = async () => {
    if (!cvFile || !initialData?.id) return;
    try {
      setCvUploading(true);
      setCvUploadError(null);
      const fd = new FormData();
      fd.append('cv', cvFile);
      const res = await fetch(`/api/applications/${initialData.id}/cv-upload`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      setCvUploadDone(true);
      setCvFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setCvUploadError(err.message);
    } finally {
      setCvUploading(false);
    }
  };

  const handleRemoveCvFile = () => {
    setCvFile(null);
    setCvUploadDone(false);
    setCvUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = () => {
    if (validateForm()) onSubmit(formData);
  };

  const showInterview = formData.status === 'Entretien';
  const showRefusal = formData.status === 'Refus';
  const isEdit = !!initialData?.id;

  return (
    <Dialog
      isShown={isOpen}
      title={initialData ? 'Modifier la candidature' : 'Ajouter une candidature'}
      onCloseComplete={onClose}
      hasFooter={false}
      width={680}
    >
      {/* Hidden native file input — triggered via ref */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        aria-hidden
      />

      <Pane display="flex" flexDirection="column" gap={20}>
        {/* ── Row 1 : Entreprise + Titre ──────────────────── */}
        <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={16}>
          <FormField label="Entreprise *" validationMessage={errors.company_id}>
            <Select
              value={formData.company_id}
              onChange={(e) => handleChange('company_id', e.target.value)}
              isInvalid={!!errors.company_id}
              width="100%"
            >
              <option value="">— Sélectionner —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Titre du poste *" validationMessage={errors.job_title}>
            <TextInput
              placeholder="ex : Senior Product Manager"
              value={formData.job_title}
              onChange={(e) => handleChange('job_title', e.target.value)}
              isInvalid={!!errors.job_title}
              width="100%"
            />
          </FormField>
        </Pane>

        {/* ── Row 2 : URL ─────────────────────────────────── */}
        <FormField label="URL de l'offre *" validationMessage={errors.job_url}>
          <TextInput
            placeholder="https://example.com/jobs/123"
            value={formData.job_url}
            onChange={(e) => handleChange('job_url', e.target.value)}
            type="url"
            isInvalid={!!errors.job_url}
            width="100%"
          />
        </FormField>

        {/* ── Row 3 : Localisation + Statut ───────────────── */}
        <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={16}>
          <FormField label="Localisation">
            <TextInput
              placeholder="ex : Paris, France"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              width="100%"
            />
          </FormField>

          <FormField label="Statut">
            <Select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              width="100%"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </FormField>
        </Pane>

        {/* ── Row 4 : Date + Étape entretien ──────────────── */}
        <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={16}>
          <FormField label="Date de candidature">
            <TextInput
              type="date"
              value={formData.applied_date}
              onChange={(e) => handleChange('applied_date', e.target.value)}
              width="100%"
            />
          </FormField>

          {showInterview && (
            <FormField label="Étape d'entretien">
              <Select
                value={formData.interview_stage}
                onChange={(e) => handleChange('interview_stage', e.target.value)}
                width="100%"
              >
                <option value="">— Sélectionner —</option>
                {INTERVIEW_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormField>
          )}
        </Pane>

        {/* ── Row 5 : Refus ───────────────────────────────── */}
        {showRefusal && (
          <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={16}>
            <FormField label="Raison du refus">
              <Select
                value={formData.refusal_reason}
                onChange={(e) => handleChange('refusal_reason', e.target.value)}
                width="100%"
              >
                <option value="">— Sélectionner —</option>
                {REFUSAL_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Étape du refus">
              <Select
                value={formData.refusal_stage}
                onChange={(e) => handleChange('refusal_stage', e.target.value)}
                width="100%"
              >
                <option value="">— Sélectionner —</option>
                {REFUSAL_STAGE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormField>
          </Pane>
        )}

        {/* ── Section CV ──────────────────────────────────── */}
        <Pane
          background="#f8f9fb"
          border="1px solid #e6e8f0"
          borderRadius={6}
          padding={16}
          display="flex"
          flexDirection="column"
          gap={12}
        >
          <Text size={400} fontWeight={600} color="#474d66">CV déposé</Text>

          {isEdit ? (
            <>
              {/* File picker row */}
              {!cvFile && !cvUploadDone && (
                <Pane display="flex" alignItems="center" gap={10}>
                  <Button
                    iconBefore={UploadIcon}
                    onClick={() => fileInputRef.current?.click()}
                    size="medium"
                  >
                    Choisir un fichier PDF…
                  </Button>
                  {initialData?.cv_file_url && (
                    <a href={initialData.cv_file_url} target="_blank" rel="noreferrer">
                      <Button iconBefore={DocumentIcon} appearance="minimal" size="medium">
                        CV actuel
                      </Button>
                    </a>
                  )}
                </Pane>
              )}

              {/* Selected file preview + upload button */}
              {cvFile && !cvUploadDone && (
                <Pane
                  display="flex"
                  alignItems="center"
                  gap={10}
                  background="#fff"
                  border="1px solid #d6e4ff"
                  borderRadius={5}
                  padding="8px 12px"
                >
                  <DocumentIcon color="#3366ff" size={16} flexShrink={0} />
                  <Text size={300} flex={1} overflow="hidden" style={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cvFile.name}
                  </Text>
                  <Badge color="blue" marginRight={4}>
                    {(cvFile.size / 1024).toFixed(0)} Ko
                  </Badge>
                  <Button
                    appearance="primary"
                    iconBefore={UploadIcon}
                    size="small"
                    isLoading={cvUploading}
                    onClick={handleCvUpload}
                  >
                    Envoyer
                  </Button>
                  <IconButton
                    icon={CrossIcon}
                    appearance="minimal"
                    size="small"
                    onClick={handleRemoveCvFile}
                  />
                </Pane>
              )}

              {/* Success state */}
              {cvUploadDone && (
                <Alert intent="success" marginBottom={0}>
                  CV mis à jour avec succès.{' '}
                  <Button
                    appearance="minimal"
                    size="small"
                    onClick={() => { setCvUploadDone(false); }}
                  >
                    Changer
                  </Button>
                </Alert>
              )}

              {cvUploadError && (
                <Alert intent="danger" marginBottom={0}>
                  {cvUploadError}
                </Alert>
              )}

              {/* Resume sent link */}
              <FormField
                label="Lien / chemin du CV envoyé à l'entreprise"
                hint="URL ou chemin local vers le CV transmis"
              >
                <TextInput
                  placeholder="ex : https://… ou /Users/.../mon_cv.pdf"
                  value={formData.resume_sent}
                  onChange={(e) => handleChange('resume_sent', e.target.value)}
                  width="100%"
                  iconBefore={LinkIcon}
                />
              </FormField>
            </>
          ) : (
            <FormField
              label="Lien / chemin du CV"
              hint="Vous pourrez uploader un fichier PDF après la création"
            >
              <TextInput
                placeholder="ex : https://… ou /Users/.../mon_cv.pdf"
                value={formData.resume_sent}
                onChange={(e) => handleChange('resume_sent', e.target.value)}
                width="100%"
              />
            </FormField>
          )}
        </Pane>

        {/* ── Notes ───────────────────────────────────────── */}
        <FormField label="Prochaines étapes">
          <Textarea
            placeholder="Actions à prendre..."
            value={formData.next_steps}
            onChange={(e) => handleChange('next_steps', e.target.value)}
            height={80}
          />
        </FormField>

        <FormField label="Notes">
          <Textarea
            placeholder="Ajouter des notes sur cette candidature..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            height={100}
          />
        </FormField>

        {/* ── Footer ──────────────────────────────────────── */}
        <Pane
          display="flex"
          gap={8}
          justifyContent="flex-end"
          paddingTop={4}
          borderTop="1px solid #f0f0f0"
          marginTop={4}
        >
          <Button onClick={onClose} appearance="minimal">Annuler</Button>
          <Button
            appearance="primary"
            intent="success"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            {initialData ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </Pane>
      </Pane>
    </Dialog>
  );
}
