import { useState, useEffect, useRef } from 'react';
import { useTasks } from '../context/TaskContext';
import {
  Pane,
  Heading,
  Button,
  TextInput,
  Textarea,
  Card,
  Text,
  Alert,
  Badge,
  Switch,
  FormField,
  Spinner,
  TickCircleIcon,
  BanCircleIcon,
  UploadIcon,
  TrashIcon,
  FlashIcon,
} from 'evergreen-ui';

function SettingSection({ title, description, children }) {
  return (
    <Card padding={20} elevation={1} background="#ffffff" marginBottom={16}>
      <Pane marginBottom={16} paddingBottom={12} borderBottom="1px solid #f0f0f0">
        <Text size={500} fontWeight="bold" display="block">
          {title}
        </Text>
        {description && (
          <Text size={300} color="#999" display="block" marginTop={4}>
            {description}
          </Text>
        )}
      </Pane>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Section-level loading / messages
  const [savingKey, setSavingKey] = useState(false);
  const [removingKey, setRemovingKey] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [removingCv, setRemovingCv] = useState(false);
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const { addTask } = useTasks();
  const [runningScan, setRunningScan] = useState(false);

  // Local field states (dirty if changed)
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [batchSize, setBatchSize] = useState(5);
  const [keywords, setKeywords] = useState('');
  const [cronExpr, setCronExpr] = useState('0 8 * * 1');
  const [cronEnabled, setCronEnabled] = useState(false);

  // Messages per section
  const [sectionMsg, setSectionMsg] = useState({});

  const cvFileRef = useRef(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setSettings(data);
      setBatchSize(data.cv_batch_size ?? 5);
      setKeywords(data.pm_role_keywords ?? '');
      setCronExpr(data.scan_schedule_cron ?? '0 8 * * 1');
      setCronEnabled(data.scan_schedule_enabled ?? false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const setMsg = (section, intent, text) => {
    setSectionMsg((prev) => ({ ...prev, [section]: { intent, text } }));
    if (intent === 'success') {
      setTimeout(() => setSectionMsg((prev) => ({ ...prev, [section]: null })), 4000);
    }
  };

  // --- OpenAI Key ---
  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) {
      setMsg('key', 'danger', 'La clé ne peut pas être vide');
      return;
    }
    try {
      setSavingKey(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: apiKeyInput.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      setApiKeyInput('');
      await fetchSettings();
      setMsg('key', 'success', 'Clé OpenAI enregistrée');
    } catch (err) {
      setMsg('key', 'danger', err.message);
    } finally {
      setSavingKey(false);
    }
  };

  const handleRemoveKey = async () => {
    try {
      setRemovingKey(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: '' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      await fetchSettings();
      setMsg('key', 'success', 'Clé OpenAI supprimée');
    } catch (err) {
      setMsg('key', 'danger', err.message);
    } finally {
      setRemovingKey(false);
    }
  };

  // --- Global CV ---
  const handleUploadCv = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMsg('cv', 'danger', 'Le CV doit être un fichier PDF');
      return;
    }
    const formData = new FormData();
    formData.append('global_cv_file', file);
    try {
      setUploadingCv(true);
      const res = await fetch('/api/settings/upload-cv', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur upload');
      await fetchSettings();
      setMsg('cv', 'success', `CV "${data.filename}" enregistré`);
    } catch (err) {
      setMsg('cv', 'danger', err.message);
    } finally {
      setUploadingCv(false);
      if (cvFileRef.current) cvFileRef.current.value = '';
    }
  };

  const handleRemoveCv = async () => {
    try {
      setRemovingCv(true);
      const res = await fetch('/api/settings/cv', { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      await fetchSettings();
      setMsg('cv', 'success', 'CV global supprimé');
    } catch (err) {
      setMsg('cv', 'danger', err.message);
    } finally {
      setRemovingCv(false);
    }
  };

  // --- Batch size ---
  const handleSaveBatchSize = async () => {
    try {
      setSavingBatch(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_batch_size: parseInt(batchSize, 10) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      await fetchSettings();
      setMsg('batch', 'success', 'Taille de batch mise à jour');
    } catch (err) {
      setMsg('batch', 'danger', err.message);
    } finally {
      setSavingBatch(false);
    }
  };

  // --- Keywords ---
  const handleSaveKeywords = async () => {
    if (!keywords.trim()) {
      setMsg('keywords', 'danger', 'Les mots-clés ne peuvent pas être vides');
      return;
    }
    try {
      setSavingKeywords(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pm_role_keywords: keywords.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      await fetchSettings();
      setMsg('keywords', 'success', 'Mots-clés enregistrés');
    } catch (err) {
      setMsg('keywords', 'danger', err.message);
    } finally {
      setSavingKeywords(false);
    }
  };

  // --- Scan schedule ---
  const handleSaveSchedule = async () => {
    try {
      setSavingSchedule(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scan_schedule_cron: cronExpr.trim(),
          scan_schedule_enabled: cronEnabled,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
      await fetchSettings();
      setMsg('schedule', 'success', 'Planification enregistrée');
    } catch (err) {
      setMsg('schedule', 'danger', err.message);
    } finally {
      setSavingSchedule(false);
    }
  };

  // --- Job board scan ---
  const handleRunScan = async () => {
    try {
      setRunningScan(true);
      const res = await fetch('/api/scan/jobs/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      addTask({
        id: 'scan-jobs',
        label: 'Analyse des job boards',
        status: 'running',
        message: `Scan de ${data.companies_count} entreprises…`,
        navigateTo: '/applications',
      });
    } catch (err) {
      addTask({
        id: 'scan-jobs',
        label: 'Analyse des job boards',
        status: 'error',
        message: err.message,
        navigateTo: '/applications',
      });
    } finally {
      setRunningScan(false);
    }
  };

  // --- Batch scoring ---
  const handleRunBatchScore = async () => {
    try {
      setRunningBatch(true);
      setMsg('batchscore', 'none', 'Scoring en cours, veuillez patienter...');
      const res = await fetch('/api/settings/batch-score', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setMsg('batchscore', 'success', data.message);
    } catch (err) {
      setMsg('batchscore', 'danger', err.message);
    } finally {
      setRunningBatch(false);
    }
  };

  if (loading) {
    return (
      <Pane display="flex" alignItems="center" gap={12} padding={32}>
        <Spinner size={24} />
        <Text>Chargement de la configuration...</Text>
      </Pane>
    );
  }

  if (error) {
    return (
      <Pane>
        <Heading size={800} marginBottom={24}>Configuration</Heading>
        <Alert intent="danger">{error}</Alert>
      </Pane>
    );
  }

  const msg = (section) => sectionMsg[section];

  return (
    <Pane maxWidth={720}>
      <Heading size={800} marginBottom={24}>
        Configuration
      </Heading>

      {/* --- OpenAI API Key --- */}
      <SettingSection
        title="Clé OpenAI API"
        description="Nécessaire pour le scoring CV et le pré-remplissage des candidatures"
      >
        {msg('key') && (
          <Alert intent={msg('key').intent} marginBottom={12}>
            {msg('key').text}
          </Alert>
        )}
        <Pane display="flex" alignItems="center" gap={12} marginBottom={16}>
          <Text size={400}>Statut :</Text>
          {settings.openai_api_key ? (
            <Badge color="green" display="flex" alignItems="center" gap={4}>
              <TickCircleIcon size={12} />
              Clé configurée
            </Badge>
          ) : (
            <Badge color="red" display="flex" alignItems="center" gap={4}>
              <BanCircleIcon size={12} />
              Aucune clé
            </Badge>
          )}
        </Pane>
        <FormField label="Nouvelle clé API" marginBottom={12}>
          <TextInput
            type="password"
            placeholder="sk-..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            width="100%"
          />
        </FormField>
        <Pane display="flex" gap={8}>
          <Button
            appearance="primary"
            iconBefore={TickCircleIcon}
            onClick={handleSaveKey}
            isLoading={savingKey}
            disabled={!apiKeyInput.trim()}
          >
            Enregistrer la clé
          </Button>
          {settings.openai_api_key && (
            <Button
              intent="danger"
              appearance="minimal"
              iconBefore={BanCircleIcon}
              onClick={handleRemoveKey}
              isLoading={removingKey}
            >
              Supprimer la clé
            </Button>
          )}
        </Pane>
      </SettingSection>

      {/* --- Global CV --- */}
      <SettingSection
        title="CV Global"
        description="Le CV utilisé pour scorer toutes les candidatures lors du batch scoring"
      >
        {msg('cv') && (
          <Alert intent={msg('cv').intent} marginBottom={12}>
            {msg('cv').text}
          </Alert>
        )}
        <Pane display="flex" alignItems="center" gap={12} marginBottom={16}>
          <Text size={400}>Statut :</Text>
          {settings.global_cv_uploaded ? (
            <Pane display="flex" alignItems="center" gap={8}>
              <Badge color="green">
                <TickCircleIcon size={12} />
                {' '}CV chargé
              </Badge>
              {settings.global_cv_filename && (
                <Text size={300} color="#666">
                  {settings.global_cv_filename}
                </Text>
              )}
              {settings.global_cv_uploaded_at && (
                <Text size={300} color="#999">
                  uploadé le{' '}
                  {new Date(settings.global_cv_uploaded_at).toLocaleDateString('fr-FR')}
                </Text>
              )}
            </Pane>
          ) : (
            <Badge color="neutral">Aucun CV</Badge>
          )}
        </Pane>
        <input
          type="file"
          accept=".pdf"
          ref={cvFileRef}
          style={{ display: 'none' }}
          onChange={handleUploadCv}
        />
        <Pane display="flex" gap={8}>
          <Button
            iconBefore={UploadIcon}
            onClick={() => cvFileRef.current?.click()}
            isLoading={uploadingCv}
          >
            {settings.global_cv_uploaded ? 'Remplacer le CV' : 'Uploader un CV (PDF)'}
          </Button>
          {settings.global_cv_uploaded && (
            <Button
              intent="danger"
              appearance="minimal"
              iconBefore={TrashIcon}
              onClick={handleRemoveCv}
              isLoading={removingCv}
            >
              Supprimer le CV
            </Button>
          )}
        </Pane>
      </SettingSection>

      {/* --- CV Batch Scoring --- */}
      <SettingSection
        title="Scoring CV en masse"
        description="Score le CV sur toutes les candidatures actives en utilisant le CV global"
      >
        {msg('batch') && (
          <Alert intent={msg('batch').intent} marginBottom={12}>
            {msg('batch').text}
          </Alert>
        )}
        {msg('batchscore') && (
          <Alert intent={msg('batchscore').intent} marginBottom={12}>
            {msg('batchscore').text}
          </Alert>
        )}
        <Pane display="flex" alignItems="flex-end" gap={16} marginBottom={16}>
          <FormField label="Taille du batch (candidatures par appel API)" flex={1}>
            <TextInput
              type="number"
              min={1}
              max={50}
              value={batchSize}
              onChange={(e) => setBatchSize(e.target.value)}
              width={100}
            />
          </FormField>
          <Button
            appearance="primary"
            onClick={handleSaveBatchSize}
            isLoading={savingBatch}
            marginBottom={1}
          >
            Sauvegarder
          </Button>
        </Pane>
        <Button
          appearance="primary"
          intent="warning"
          iconBefore={FlashIcon}
          onClick={handleRunBatchScore}
          isLoading={runningBatch}
          disabled={!settings.openai_api_key || !settings.global_cv_uploaded}
        >
          Lancer le scoring pour toutes les candidatures actives
        </Button>
        {(!settings.openai_api_key || !settings.global_cv_uploaded) && (
          <Text size={300} color="#e17055" display="block" marginTop={8}>
            Clé OpenAI et CV global requis pour lancer le scoring
          </Text>
        )}
      </SettingSection>

      {/* --- PM Keywords --- */}
      <SettingSection
        title="Mots-clés rôles PM"
        description="Termes utilisés pour filtrer les offres lors du scan automatique LinkedIn/JobBoards"
      >
        {msg('keywords') && (
          <Alert intent={msg('keywords').intent} marginBottom={12}>
            {msg('keywords').text}
          </Alert>
        )}
        <FormField
          label="Mots-clés (séparés par des virgules)"
          marginBottom={12}
          hint="Exemple : product manager,chef de produit,product owner,pm"
        >
          <Textarea
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="product manager,chef de produit,product owner,pm"
            height={80}
          />
        </FormField>
        <Button
          appearance="primary"
          onClick={handleSaveKeywords}
          isLoading={savingKeywords}
        >
          Sauvegarder les mots-clés
        </Button>
      </SettingSection>

      {/* --- Manual Job Board Scan --- */}
      <SettingSection
        title="Scan des job boards"
        description="Analyse immédiate de toutes les pages carrières des entreprises pour trouver des offres PM"
      >
        <Text size={300} color="#666" display="block" marginBottom={12}>
          Lance un scan en arrière-plan sur toutes les entreprises ayant un lien job board configuré.
          Les nouvelles candidatures trouvées apparaîtront automatiquement dans la liste.
        </Text>
        <Button
          appearance="primary"
          iconBefore={FlashIcon}
          onClick={handleRunScan}
          isLoading={runningScan}
        >
          Lancer le scan maintenant
        </Button>
      </SettingSection>

      {/* --- Scan Schedule --- */}
      <SettingSection
        title="Planification du scan"
        description="Scan automatique des offres d'emploi selon un calendrier cron"
      >
        {msg('schedule') && (
          <Alert intent={msg('schedule').intent} marginBottom={12}>
            {msg('schedule').text}
          </Alert>
        )}
        <Pane display="flex" alignItems="center" gap={12} marginBottom={16}>
          <Switch
            checked={cronEnabled}
            onChange={(e) => setCronEnabled(e.target.checked)}
          />
          <Text size={400}>{cronEnabled ? 'Scan automatique activé' : 'Scan automatique désactivé'}</Text>
        </Pane>
        <FormField
          label="Expression cron"
          marginBottom={12}
          hint="Format : minute heure jour-mois mois jour-semaine (ex: 0 8 * * 1 = tous les lundis à 8h)"
        >
          <TextInput
            value={cronExpr}
            onChange={(e) => setCronExpr(e.target.value)}
            placeholder="0 8 * * 1"
            width="100%"
            fontFamily="monospace"
          />
        </FormField>
        <Button
          appearance="primary"
          onClick={handleSaveSchedule}
          isLoading={savingSchedule}
        >
          Sauvegarder la planification
        </Button>
      </SettingSection>
    </Pane>
  );
}
