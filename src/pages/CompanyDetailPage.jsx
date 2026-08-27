import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Pane,
  Heading,
  Button,
  Alert,
  Badge,
  Card,
  Text,
  Table,
  Link,
  IconButton,
  EditIcon,
  ArrowLeftIcon,
} from 'evergreen-ui';
import { CompanyForm } from './CompanyForm';

export function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchCompanyAndApplications = async () => {
    try {
      setLoading(true);

      // Fetch company details
      const companyRes = await fetch(`/api/companies/${id}`);
      if (!companyRes.ok) throw new Error('Entreprise non trouvée');
      const companyData = await companyRes.json();
      setCompany(companyData);

      // Fetch applications for this company
      const appRes = await fetch(`/api/applications?company_id=${id}`);
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplications(appData);
      }

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyAndApplications();
  }, [id]);

  const handleSubmitForm = async (formData) => {
    try {
      setFormLoading(true);
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      await fetchCompanyAndApplications();
      setFormOpen(false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const getSizeColor = (size) => {
    const colors = {
      startup: 'blue',
      small: 'green',
      medium: 'yellow',
      large: 'orange',
    };
    return colors[size] || 'neutral';
  };

  const getSizeLabel = (size) => {
    const labels = {
      startup: 'Startup',
      small: 'Petite',
      medium: 'Moyenne',
      large: 'Grande',
    };
    return labels[size] || 'N/A';
  };

  if (loading) {
    return <Pane padding={16}>Chargement des détails de l'entreprise...</Pane>;
  }

  if (!company) {
    return (
      <Pane>
        <Button
          appearance="minimal"
          iconBefore={ArrowLeftIcon}
          marginBottom={16}
          onClick={() => navigate('/companies')}
        >
          Retour
        </Button>
        <Alert intent="danger">Entreprise non trouvée</Alert>
      </Pane>
    );
  }

  return (
    <Pane>
      <Button
        appearance="minimal"
        iconBefore={ArrowLeftIcon}
        marginBottom={16}
        onClick={() => navigate('/companies')}
      >
        Retour
      </Button>

      {error && (
        <Alert intent="danger" marginBottom={16}>
          Erreur: {error}
        </Alert>
      )}

      <Pane display="flex" justifyContent="space-between" alignItems="flex-start" marginBottom={24}>
        <Heading size={800}>{company.name}</Heading>
        <IconButton
          icon={EditIcon}
          height={32}
          appearance="primary"
          onClick={() => setFormOpen(true)}
          title="Modifier"
        />
      </Pane>

      <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={16} marginBottom={24}>
        <Card padding={16} elevation={1} background="#ffffff">
          <Text size={500} fontWeight="bold" display="block" marginBottom={12}>
            Informations générales
          </Text>

          <Pane marginBottom={12}>
            <Text size={400} color="#666" display="block" marginBottom={4}>
              Localisation
            </Text>
            <Text size={500} fontWeight="500">
              {company.location || 'N/A'}
            </Text>
          </Pane>

          <Pane marginBottom={12}>
            <Text size={400} color="#666" display="block" marginBottom={4}>
              Taille
            </Text>
            <Pane display="flex" alignItems="center" gap={8}>
              {company.size ? (
                <>
                  <Badge color={getSizeColor(company.size)}>
                    {getSizeLabel(company.size)}
                  </Badge>
                </>
              ) : (
                <Text size={500}>N/A</Text>
              )}
            </Pane>
          </Pane>

          <Pane marginBottom={12}>
            <Text size={400} color="#666" display="block" marginBottom={4}>
              Télétravail
            </Text>
            <Badge color={company.open_to_remote ? 'green' : 'neutral'}>
              {company.open_to_remote ? 'Accepté' : 'Non accepté'}
            </Badge>
          </Pane>

          <Pane marginBottom={12}>
            <Text size={400} color="#666" display="block" marginBottom={4}>
              Site web
            </Text>
            {company.website ? (
              <Link href={company.website} target="_blank">
                {company.website} ↗
              </Link>
            ) : (
              <Text size={500}>N/A</Text>
            )}
          </Pane>
        </Card>

        <Card padding={16} elevation={1} background="#ffffff">
          <Text size={500} fontWeight="bold" display="block" marginBottom={12}>
            Liens
          </Text>

          <Pane marginBottom={12}>
            <Text size={400} color="#666" display="block" marginBottom={4}>
              Offres d'emploi
            </Text>
            {company.jobs_link ? (
              <Link href={company.jobs_link} target="_blank">
                Consulter ↗
              </Link>
            ) : (
              <Text size={500} color="#999">
                Non disponible
              </Text>
            )}
          </Pane>

          <Pane marginBottom={12}>
            <Text size={400} color="#666" display="block" marginBottom={4}>
              Page Carrières (supposée)
            </Text>
            {company.career_link_guess ? (
              <Link href={company.career_link_guess} target="_blank">
                Consulter ↗
              </Link>
            ) : (
              <Text size={500} color="#999">
                Non disponible
              </Text>
            )}
          </Pane>
        </Card>
      </Pane>

      {company.notes && (
        <Card padding={16} elevation={1} background="#f5f5f5" marginBottom={24}>
          <Text size={500} fontWeight="bold" display="block" marginBottom={12}>
            Notes
          </Text>
          <Text size={400} whiteSpace="pre-wrap">
            {company.notes}
          </Text>
        </Card>
      )}

      <Heading size={700} marginBottom={16}>
        Candidatures pour cette entreprise ({applications.length})
      </Heading>

      {applications.length === 0 ? (
        <Alert intent="none" marginBottom={16}>
          Aucune candidature pour cette entreprise
        </Alert>
      ) : (
        <Table width="100%">
          <Table.Head>
            <Table.TextHeaderCell>Titre du poste</Table.TextHeaderCell>
            <Table.TextHeaderCell>Statut</Table.TextHeaderCell>
            <Table.TextHeaderCell>Date de candidature</Table.TextHeaderCell>
            <Table.TextHeaderCell>Actions</Table.TextHeaderCell>
          </Table.Head>
          <Table.Body>
            {applications.map((app) => (
              <Table.Row key={app.id}>
                <Table.TextCell>{app.job_title}</Table.TextCell>
                <Table.TextCell>
                  <Badge>{app.status}</Badge>
                </Table.TextCell>
                <Table.TextCell>
                  {app.applied_date
                    ? new Date(app.applied_date).toLocaleDateString('fr-FR')
                    : 'N/A'}
                </Table.TextCell>
                <Table.TextCell>
                  <Button
                    size="small"
                    appearance="minimal"
                    onClick={() => navigate(`/applications/${app.id}`)}
                  >
                    Voir détails
                  </Button>
                </Table.TextCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <CompanyForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={company}
        isLoading={formLoading}
      />
    </Pane>
  );
}
