import { useState, useEffect, useMemo } from 'react';
import { useTasks } from '../context/TaskContext';
import { useNavigate } from 'react-router-dom';
import {
  Pane,
  Heading,
  Button,
  TextInput,
  Select,
  Alert,
  Dialog,
  IconButton,
  EditIcon,
  TrashIcon,
  SearchIcon,
  EyeOpenIcon,
  Table,
  Text,
  Popover,
  Menu,
  Position,
  FlashIcon,
  MoreIcon,
} from 'evergreen-ui';
import { PlusIcon } from 'evergreen-ui';
import { Badge } from 'evergreen-ui';
import { StatusPill, getAllStatuses, statusCode } from '../components/StatusPill';
import { CVScoreBadge } from '../components/CVScoreBadge';
import { ApplicationForm } from './ApplicationForm';
import { KanbanBoard } from './KanbanBoard';

const HIDDEN_BY_DEFAULT = ['Refus', 'Offre', 'Inconnu', 'Archivé'];

export function ApplicationsPage() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [applications, setApplications] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'kanban'
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, application: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [dragLoading, setDragLoading] = useState(false);
  const [sortKey, setSortKey] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const statuses = getAllStatuses();

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const STATUS_ORDER = ['À postuler', 'Postulé', 'Entretien', 'Offre', 'Refus', 'Archivé', 'Inconnu'];

  const visibleApplications = useMemo(() => {
    if (filterStatus === 'scan') {
      return applications.filter((a) => a.source === 'scan');
    }
    if (filterStatus === 'no_desc') {
      return applications.filter((a) => !a.has_description);
    }
    if (filterStatus === 'active') {
      return applications.filter((a) => !HIDDEN_BY_DEFAULT.includes(a.status));
    }
    return applications;
  }, [applications, filterStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const sortedApplications = useMemo(() => {
    const sorted = [...visibleApplications].sort((a, b) => {
      let valA, valB;
      switch (sortKey) {
        case 'job_title':
          valA = (a.job_title || '').toLowerCase();
          valB = (b.job_title || '').toLowerCase();
          break;
        case 'company':
          valA = (a.company?.name || '').toLowerCase();
          valB = (b.company?.name || '').toLowerCase();
          break;
        case 'status':
          valA = STATUS_ORDER.indexOf(a.status);
          valB = STATUS_ORDER.indexOf(b.status);
          break;
        case 'applied_date':
          valA = a.applied_date || '';
          valB = b.applied_date || '';
          break;
        case 'created_at':
          valA = a.created_at || '';
          valB = b.created_at || '';
          break;
        case 'cv_match_score':
          valA = a.cv_match_score ?? -1;
          valB = b.cv_match_score ?? -1;
          break;
        case 'has_description':
          valA = a.has_description ? 1 : 0;
          valB = b.has_description ? 1 : 0;
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [visibleApplications, sortKey, sortDir]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    // If dropped outside a droppable area
    if (!destination) {
      return;
    }

    // If dropped in same position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Extract application ID from draggableId (format: "app-123")
    const applicationId = parseInt(draggableId.replace('app-', ''), 10);
    // droppableId is the STABLE numeric status code (rename-safe).
    const newStatusCode = parseInt(destination.droppableId, 10);

    // Find the application
    const application = applications.find((app) => app.id === applicationId);
    if (!application || statusCode(application) === newStatusCode) {
      return;
    }

    try {
      setDragLoading(true);

      // Update via the numeric code — the backend maps code → canonical label.
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatusCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      // Refresh applications list
      await fetchApplications();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDragLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      let url = '/api/applications';
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      // 'active'/'all' fetch everything; a specific status filters via API. In KANBAN view we
      // always fetch every status so all columns populate (the board is not a single-status list).
      if (view !== 'kanban' && !['all', 'active', 'scan', 'no_desc'].includes(filterStatus)) {
        params.append('status', filterStatus);
      }
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors du chargement des candidatures');
      const data = await response.json();
      setApplications(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies');
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [search, filterStatus, view]);

  // Persistent entry point to the scan-review queue: staged offers from a
  // scheduled (cron) scan produce no notification, so surface the count here.
  // Runs on mount (and thus on every navigation back to this page).
  useEffect(() => {
    let cancelled = false;
    fetch('/api/scan/pending')
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => { if (!cancelled) setPendingCount(d.count || 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleOpenForm = (application = null) => {
    setEditingApplication(application);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingApplication(null);
  };

  const handleSubmitForm = async (formData) => {
    try {
      setFormLoading(true);
      const method = editingApplication ? 'PUT' : 'POST';
      const url = editingApplication
        ? `/api/applications/${editingApplication.id}`
        : '/api/applications';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await fetchApplications();
      handleCloseForm();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDeleteDialog = (application) => {
    setDeleteDialog({ isOpen: true, application });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, application: null });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.application) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/applications/${deleteDialog.application.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      await fetchApplications();
      handleCloseDeleteDialog();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const { addTask } = useTasks();
  const [scanLoading, setScanLoading] = useState(false);

  const handleRunScan = async () => {
    try {
      setScanLoading(true);
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
      setScanLoading(false);
    }
  };

  return (
    <Pane>
      <Pane marginBottom={24} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size={800}>Candidatures</Heading>
        <Pane display="flex" gap={8} alignItems="center">
          {pendingCount > 0 && (
            <Button appearance="primary" onClick={() => navigate('/scan-review')}>
              🔍 {pendingCount} offre{pendingCount > 1 ? 's' : ''} à valider
            </Button>
          )}
          <Button
            appearance="primary"
            intent="success"
            iconBefore={PlusIcon}
            onClick={() => handleOpenForm()}
          >
            Ajouter une candidature
          </Button>
          <Popover
            position={Position.BOTTOM_RIGHT}
            content={
              <Menu>
                <Menu.Group>
                  <Menu.Item
                    icon={FlashIcon}
                    onSelect={handleRunScan}
                    disabled={scanLoading}
                  >
                    {scanLoading ? 'Scan en cours…' : 'Analyser les job boards'}
                  </Menu.Item>
                </Menu.Group>
              </Menu>
            }
          >
            <IconButton icon={MoreIcon} appearance="minimal" height={32} />
          </Popover>
        </Pane>
      </Pane>

      <Pane marginBottom={20} display="flex" gap={12}>
        <Button
          appearance={view === 'list' ? 'default' : 'minimal'}
          onClick={() => setView('list')}
        >
          Liste
        </Button>
        <Button
          appearance={view === 'kanban' ? 'default' : 'minimal'}
          onClick={() => setView('kanban')}
        >
          Kanban
        </Button>
      </Pane>

      <Pane marginBottom={20} display="flex" gap={12}>
        <Pane flex={1} display="flex" alignItems="center" position="relative">
          <SearchIcon
            position="absolute"
            left={12}
            color="#999"
            size={16}
            pointerEvents="none"
          />
          <TextInput
            placeholder="Rechercher par titre, entreprise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width="100%"
            paddingLeft="36px"
          />
        </Pane>
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          width="200px"
        >
          <option value="active">En cours (défaut)</option>
          <option value="scan">🔍 Nouvelles offres (scan)</option>
          <option value="no_desc">⚠️ Sans description</option>
          <option value="all">Tous les statuts</option>
          <option disabled>──────────</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
      </Pane>

      {error && (
        <Alert intent="danger" marginBottom={16}>
          Erreur: {error}
        </Alert>
      )}

      {loading && <Pane padding={16}>Chargement des candidatures...</Pane>}

      {!loading && !error && visibleApplications.length === 0 && (
        <Alert intent="none" marginBottom={16}>
          {search ? 'Aucune candidature ne correspond à votre recherche' : 'Aucune candidature trouvée'}
        </Alert>
      )}

      {!loading && !error && view === 'list' && visibleApplications.length > 0 && (
        <Table width="100%">
          <Table.Head>
            {[
              { key: 'job_title', label: 'Titre du poste' },
              { key: 'company', label: 'Entreprise' },
              { key: 'status', label: 'Statut' },
              { key: 'applied_date', label: 'Date postulé' },
              { key: 'created_at', label: 'Date ajout' },
              { key: 'cv_match_score', label: 'Score CV' },
              { key: 'has_description', label: 'Description' },
            ].map(({ key, label }) => (
              <Table.TextHeaderCell
                key={key}
                onClick={() => handleSort(key)}
                cursor="pointer"
                userSelect="none"
                title={`Trier par ${label}`}
              >
                {label}{' '}
                {sortKey === key ? (sortDir === 'asc' ? '↑' : '↓') : <Text color="#ccc">↕</Text>}
              </Table.TextHeaderCell>
            ))}
            <Table.TextHeaderCell width="120px">Actions</Table.TextHeaderCell>
          </Table.Head>
          <Table.Body>
            {sortedApplications.map((app) => (
              <Table.Row key={app.id}>
                <Table.TextCell>
                  <Pane display="flex" alignItems="center" gap={6}>
                    <Text fontWeight="500">{app.job_title}</Text>
                    {app.source === 'scan' && (
                      <Badge color="purple" title="Offre trouvée par scan automatique">Scan</Badge>
                    )}
                  </Pane>
                </Table.TextCell>
                <Table.TextCell>{app.company?.name || 'N/A'}</Table.TextCell>
                <Table.TextCell>
                  <StatusPill status={app.status} />
                </Table.TextCell>
                <Table.TextCell>
                  {app.status !== 'À postuler' && app.applied_date
                    ? new Date(app.applied_date).toLocaleDateString('fr-FR')
                    : '—'}
                </Table.TextCell>
                <Table.TextCell>
                  {app.created_at
                    ? new Date(app.created_at).toLocaleDateString('fr-FR')
                    : '—'}
                </Table.TextCell>
                <Table.TextCell>
                  <CVScoreBadge score={app.cv_match_score} />
                </Table.TextCell>
                <Table.TextCell>
                  {app.has_description ? (
                    <Badge color="green" title={`Description présente (${app.description_char_count} caractères)`}>OK</Badge>
                  ) : (
                    <Badge color="red" title={`Description manquante (${app.description_char_count ?? 0} caractères < 200)`}>Manquante</Badge>
                  )}
                </Table.TextCell>
                <Table.TextCell display="flex" gap={4}>
                  <IconButton
                    icon={EyeOpenIcon}
                    height={32}
                    onClick={() => navigate(`/applications/${app.id}`)}
                    title="Voir détails"
                  />
                  <IconButton
                    icon={EditIcon}
                    height={32}
                    intent="info"
                    onClick={() => handleOpenForm(app)}
                    title="Modifier"
                  />
                  <IconButton
                    icon={TrashIcon}
                    height={32}
                    intent="danger"
                    onClick={() => handleOpenDeleteDialog(app)}
                    title="Supprimer"
                  />
                </Table.TextCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      {!loading && !error && view === 'kanban' && (
        <Pane>
          <Alert intent="none" marginBottom={16}>
            Vue Kanban - {applications.length} candidatures
            <br />
            <Text size={300} color="#666">
              Glissez-déposez les cartes pour changer le statut des candidatures
            </Text>
          </Alert>
          {dragLoading && (
            <Alert intent="info" marginBottom={16}>
              Mise à jour du statut en cours...
            </Alert>
          )}
          <KanbanBoard
            applications={view === 'kanban' ? applications : visibleApplications}
            onDragEnd={handleDragEnd}
            isLoading={dragLoading || loading}
          />
        </Pane>
      )}

      <ApplicationForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        initialData={editingApplication}
        isLoading={formLoading}
        companies={companies}
      />

      <Dialog
        isShown={deleteDialog.isOpen}
        title="Supprimer la candidature"
        intent="danger"
        onCloseComplete={handleCloseDeleteDialog}
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        isConfirmLoading={deleteLoading}
      >
        <Pane>
          {deleteDialog.application ? (
            <>
              <p>
                Êtes-vous sûr de vouloir supprimer la candidature pour{' '}
                <strong>{deleteDialog.application.job_title}</strong> chez{' '}
                <strong>{deleteDialog.application.company?.name || 'cette entreprise'}</strong> ?
              </p>
              <p>Cette action ne peut pas être annulée.</p>
            </>
          ) : (
            <p>Confirmer la suppression ?</p>
          )}
        </Pane>
      </Dialog>
    </Pane>
  );
}
