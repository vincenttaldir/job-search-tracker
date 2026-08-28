import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pane,
  Heading,
  Button,
  TextInput,
  Select,
  Table,
  Alert,
  Dialog,
  Badge,
  IconButton,
  EditIcon,
  TrashIcon,
  SearchIcon,
  EyeOpenIcon,
} from 'evergreen-ui';
import { PlusIcon } from 'evergreen-ui';
import { CompanyForm } from './CompanyForm';

export function CompaniesPage() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [jobsFilter, setJobsFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, company: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      let url = '/api/companies';
      if (search) url += '?q=' + encodeURIComponent(search);

      const response = await fetch(url);
      if (!response.ok) throw new Error('Erreur lors du chargement des entreprises');
      const data = await response.json();
      setCompanies(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const handleOpenForm = (company = null) => {
    setEditingCompany(company);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingCompany(null);
  };

  const handleSubmitForm = async (formData) => {
    try {
      setFormLoading(true);
      const method = editingCompany ? 'PUT' : 'POST';
      const url = editingCompany
        ? `/api/companies/${editingCompany.id}`
        : '/api/companies';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde');
      }

      await fetchCompanies();
      handleCloseForm();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleOpenDeleteDialog = (company) => {
    setDeleteDialog({ isOpen: true, company });
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, company: null });
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.company) return;

    try {
      setDeleteLoading(true);
      const response = await fetch(`/api/companies/${deleteDialog.company.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la suppression');
      }

      await fetchCompanies();
      handleCloseDeleteDialog();
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const hasJobsLink = (company) => Boolean(company.jobs_link && company.jobs_link.trim());

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = company.name.toLowerCase().includes(search.toLowerCase());
    const matchesJobs =
      jobsFilter === 'all' ||
      (jobsFilter === 'without' && !hasJobsLink(company)) ||
      (jobsFilter === 'with' && hasJobsLink(company));
    return matchesSearch && matchesJobs;
  });

  const missingJobsCount = companies.filter((company) => !hasJobsLink(company)).length;

  // Number of job offers identified during the last career-page scan:
  // PM-matched offers over the total job links detected (e.g. "3 / 25").
  const formatJobOffers = (company) => {
    const pm = company.last_scan_pm_offers;
    const total = company.last_scan_job_links_detected;
    if (pm == null && total == null) return 'N/A';
    return `${pm ?? 0} / ${total ?? 0}`;
  };

  return (
    <Pane>
      <Pane marginBottom={24} display="flex" justifyContent="space-between" alignItems="center">
        <Heading size={800}>Entreprises</Heading>
        <Button
          appearance="primary"
          intent="success"
          iconBefore={PlusIcon}
          onClick={() => handleOpenForm()}
        >
          Ajouter une entreprise
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
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            width="100%"
            paddingLeft="36px"
          />
        </Pane>
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          width="200px"
        >
          <option value="all">Tous les statuts</option>
          <option value="startup">Startups</option>
          <option value="small">Petites</option>
          <option value="medium">Moyennes</option>
          <option value="large">Grandes</option>
        </Select>
        <Select
          value={jobsFilter}
          onChange={(e) => setJobsFilter(e.target.value)}
          width="220px"
        >
          <option value="all">Offres d'emploi : toutes</option>
          <option value="without">Sans lien offres{missingJobsCount ? ` (${missingJobsCount})` : ''}</option>
          <option value="with">Avec lien offres</option>
        </Select>
      </Pane>

      {error && (
        <Alert intent="danger" marginBottom={16}>
          Erreur: {error}
        </Alert>
      )}

      {loading && <Pane padding={16}>Chargement des entreprises...</Pane>}

      {!loading && !error && filteredCompanies.length === 0 && (
        <Alert intent="none" marginBottom={16}>
          {search ? 'Aucune entreprise ne correspond à votre recherche' : 'Aucune entreprise trouvée'}
        </Alert>
      )}

      {!loading && !error && filteredCompanies.length > 0 && (
        <Table width="100%">
          <Table.Head>
            <Table.TextHeaderCell>Nom</Table.TextHeaderCell>
            <Table.TextHeaderCell>Localisation</Table.TextHeaderCell>
            <Table.TextHeaderCell>Nbre offre emploi</Table.TextHeaderCell>
            <Table.TextHeaderCell>Site web</Table.TextHeaderCell>
            <Table.TextHeaderCell>Offres d'emploi</Table.TextHeaderCell>
            <Table.TextHeaderCell>Télétravail</Table.TextHeaderCell>
            <Table.TextHeaderCell width="120px">Actions</Table.TextHeaderCell>
          </Table.Head>
          <Table.Body>
            {filteredCompanies.map((company) => (
              <Table.Row key={company.id}>
                <Table.TextCell fontWeight="500">{company.name}</Table.TextCell>
                <Table.TextCell>{company.location || 'N/A'}</Table.TextCell>
                <Table.TextCell>{formatJobOffers(company)}</Table.TextCell>
                <Table.TextCell>
                  {company.website ? (
                    <a href={company.website} target="_blank" rel="noreferrer">
                      Lien
                    </a>
                  ) : (
                    'N/A'
                  )}
                </Table.TextCell>
                <Table.TextCell>
                  {hasJobsLink(company) ? (
                    <a href={company.jobs_link} target="_blank" rel="noreferrer">
                      Lien
                    </a>
                  ) : (
                    <Badge color="orange">Sans lien</Badge>
                  )}
                </Table.TextCell>
                <Table.TextCell>
                  {company.open_to_remote ? (
                    <Badge color="green">Oui</Badge>
                  ) : (
                    <Badge color="neutral">Non</Badge>
                  )}
                </Table.TextCell>
                <Table.TextCell display="flex" gap={4}>
                  <IconButton
                    icon={EyeOpenIcon}
                    height={32}
                    onClick={() => navigate(`/companies/${company.id}`)}
                    title="Voir détails"
                  />
                  <IconButton
                    icon={EditIcon}
                    height={32}
                    intent="info"
                    onClick={() => handleOpenForm(company)}
                    title="Modifier"
                  />
                  <IconButton
                    icon={TrashIcon}
                    height={32}
                    intent="danger"
                    onClick={() => handleOpenDeleteDialog(company)}
                    title="Supprimer"
                  />
                </Table.TextCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <CompanyForm
        isOpen={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        initialData={editingCompany}
        isLoading={formLoading}
      />

      <Dialog
        isShown={deleteDialog.isOpen}
        title="Supprimer l'entreprise"
        intent="danger"
        onCloseComplete={handleCloseDeleteDialog}
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        onConfirm={handleConfirmDelete}
        isConfirmLoading={deleteLoading}
      >
        <Pane>
          {deleteDialog.company ? (
            <>
              <p>Êtes-vous sûr de vouloir supprimer <strong>{deleteDialog.company.name}</strong> ?</p>
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
