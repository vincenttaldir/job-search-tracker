import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pane,
  Heading,
  Text,
  Button,
  Badge,
  Alert,
  Spinner,
  Card,
  IconButton,
  TickCircleIcon,
  CrossIcon,
  LinkIcon,
  MapMarkerIcon,
  Select,
} from 'evergreen-ui';

const REJECTION_REASONS = [
  'Pas de fit produit',
  'Pas assez d\'expérience',
  'Niveau technique insuffisant',
  'Rémunération',
  'Localisation / remote',
  'Stage/Alternance/CDD',
  'Doublon ou déjà traité',
  'Autre',
];

function OfferCard({ offer, onAccept, onReject, isProcessing }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [reason, setReason] = useState('Autre');

  return (
    <Card
      elevation={1}
      background="#fff"
      padding={20}
      borderRadius={8}
      display="flex"
      flexDirection="column"
      gap={12}
      opacity={isProcessing ? 0.5 : 1}
      style={{ transition: 'opacity 0.2s' }}
    >
      {/* Header */}
      <Pane display="flex" justifyContent="space-between" alignItems="flex-start" gap={12}>
        <Pane flex={1}>
          <Text size={500} fontWeight={700} display="block" marginBottom={4}>
            {offer.job_title}
          </Text>
          <Pane display="flex" alignItems="center" gap={8} flexWrap="wrap">
            <Badge color="blue">{offer.company_name}</Badge>
            {offer.location && (
              <Pane display="flex" alignItems="center" gap={4}>
                <MapMarkerIcon color="#999" size={12} />
                <Text size={300} color="#666">{offer.location}</Text>
              </Pane>
            )}
          </Pane>
        </Pane>
        {offer.job_link && (
          <a href={offer.job_link} target="_blank" rel="noreferrer">
            <IconButton icon={LinkIcon} appearance="minimal" title="Voir l'offre" />
          </a>
        )}
      </Pane>

      {/* Reject reason selector */}
      {rejectMode && (
        <Pane
          background="#fff5f5"
          border="1px solid #ffd0d0"
          borderRadius={6}
          padding={12}
          display="flex"
          alignItems="center"
          gap={10}
        >
          <Text size={300} color="#666" flexShrink={0}>Raison :</Text>
          <Select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            flex={1}
            height={32}
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
          <Button
            intent="danger"
            size="small"
            onClick={() => { onReject(offer.key, reason); setRejectMode(false); }}
            disabled={isProcessing}
          >
            Confirmer
          </Button>
          <Button
            appearance="minimal"
            size="small"
            onClick={() => setRejectMode(false)}
          >
            Annuler
          </Button>
        </Pane>
      )}

      {/* Actions */}
      {!rejectMode && (
        <Pane display="flex" gap={8} justifyContent="flex-end">
          <Button
            iconBefore={CrossIcon}
            intent="danger"
            appearance="minimal"
            onClick={() => setRejectMode(true)}
            disabled={isProcessing}
          >
            Refuser
          </Button>
          <Button
            iconBefore={TickCircleIcon}
            intent="success"
            appearance="primary"
            onClick={() => onAccept(offer.key)}
            disabled={isProcessing}
            isLoading={isProcessing}
          >
            Valider
          </Button>
        </Pane>
      )}
    </Card>
  );
}

export function ScanReviewPage() {
  const navigate = useNavigate();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({}); // key → bool
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // {intent, text}

  const fetchPending = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/scan/pending');
      const data = await res.json();
      setOffers(data.offers || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleAccept = async (key) => {
    setProcessing((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch('/api/scan/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setOffers((prev) => prev.filter((o) => o.key !== key));
      if (data.skipped) {
        setToast({ intent: 'warning', text: 'Offre déjà existante en base — retirée de la liste.' });
      } else if (data.description_found === false) {
        setToast({
          intent: 'warning',
          text: "Candidature ajoutée, mais la description de l'offre n'a pas pu être récupérée — le score CV sera basé sur le titre seul. Ouvre la fiche et utilise « Re-extraire » ou colle le texte manuellement.",
        });
      } else {
        setToast({ intent: 'success', text: 'Candidature ajoutée — description récupérée, scoring CV en cours.' });
      }
    } catch (e) {
      setToast({ intent: 'danger', text: e.message });
    } finally {
      setProcessing((p) => ({ ...p, [key]: false }));
    }
  };

  const handleReject = async (key, reason) => {
    setProcessing((p) => ({ ...p, [key]: true }));
    try {
      const res = await fetch('/api/scan/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, reason }),
      });
      if (!res.ok) throw new Error('Erreur');
      setOffers((prev) => prev.filter((o) => o.key !== key));
    } catch (e) {
      setToast({ intent: 'danger', text: e.message });
    } finally {
      setProcessing((p) => ({ ...p, [key]: false }));
    }
  };

  const handleAcceptAll = async () => {
    for (const offer of offers) {
      await handleAccept(offer.key);
    }
  };

  const handleClearAll = async () => {
    await fetch('/api/scan/clear', { method: 'POST' });
    setOffers([]);
  };

  return (
    <Pane maxWidth={760} margin="0 auto">
      {/* Header */}
      <Pane
        marginBottom={24}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={12}
      >
        <Pane>
          <Heading size={800}>Revue des offres scannées</Heading>
          {!loading && (
            <Text size={400} color="#666" display="block" marginTop={4}>
              {offers.length > 0
                ? `${offers.length} offre${offers.length > 1 ? 's' : ''} en attente de validation`
                : 'Aucune offre en attente'}
            </Text>
          )}
        </Pane>
        {offers.length > 0 && (
          <Pane display="flex" gap={8}>
            <Button appearance="minimal" intent="danger" onClick={handleClearAll}>
              Tout ignorer
            </Button>
            <Button appearance="primary" intent="success" iconBefore={TickCircleIcon} onClick={handleAcceptAll}>
              Tout valider
            </Button>
          </Pane>
        )}
      </Pane>

      {/* Toast */}
      {toast && (
        <Alert
          intent={toast.intent}
          marginBottom={16}
          isRemoveable
          onRemove={() => setToast(null)}
        >
          {toast.text}
        </Alert>
      )}

      {error && (
        <Alert intent="danger" marginBottom={16}>Erreur : {error}</Alert>
      )}

      {loading && (
        <Pane display="flex" alignItems="center" gap={12} padding={32}>
          <Spinner size={20} />
          <Text color="#999">Chargement des offres en attente…</Text>
        </Pane>
      )}

      {!loading && offers.length === 0 && !error && (
        <Pane
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          padding={64}
          gap={16}
          background="#f8f9fb"
          borderRadius={8}
          border="1px dashed #d0d5e0"
        >
          <TickCircleIcon color="#52BD94" size={40} />
          <Heading size={500} color="#474d66">Tout est à jour !</Heading>
          <Text size={400} color="#8f95b2" textAlign="center">
            Aucune offre en attente de validation.<br />
            Lancez un scan depuis le menu Candidatures pour en trouver de nouvelles.
          </Text>
          <Button onClick={() => navigate('/applications')}>
            Retour aux candidatures
          </Button>
        </Pane>
      )}

      {/* Offer list */}
      {!loading && offers.length > 0 && (
        <Pane display="flex" flexDirection="column" gap={12}>
          {offers.map((offer) => (
            <OfferCard
              key={offer.key}
              offer={offer}
              onAccept={handleAccept}
              onReject={handleReject}
              isProcessing={!!processing[offer.key]}
            />
          ))}
        </Pane>
      )}
    </Pane>
  );
}
