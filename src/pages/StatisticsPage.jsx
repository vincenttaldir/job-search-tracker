import { useState, useEffect } from 'react';
import {
  Pane,
  Heading,
  Card,
  Text,
  Alert,
  Badge,
} from 'evergreen-ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

function KpiCard({ title, value, color = '#1a73e8', subtitle }) {
  return (
    <Card
      padding={20}
      elevation={1}
      background="#ffffff"
      display="flex"
      flexDirection="column"
      gap={8}
    >
      <Text size={400} color="#666">
        {title}
      </Text>
      <Text size={700} fontWeight="bold" color={color}>
        {value}
      </Text>
      {subtitle && (
        <Text size={300} color="#999">
          {subtitle}
        </Text>
      )}
    </Card>
  );
}

function FunnelRow({ label, count, pct, maxCount, isFirst }) {
  const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const barColor = isFirst ? '#4a90e2' : '#7c4dff';

  return (
    <Pane marginBottom={10}>
      <Pane display="flex" justifyContent="space-between" marginBottom={4}>
        <Text size={400}>{label}</Text>
        <Pane display="flex" gap={8} alignItems="center">
          <Text size={400} fontWeight="500">
            {count}
          </Text>
          <Badge color="neutral" paddingX={6}>
            {pct}%
          </Badge>
        </Pane>
      </Pane>
      <Pane background="#f0f0f0" borderRadius={3} height={8} width="100%">
        <Pane
          background={barColor}
          borderRadius={3}
          height={8}
          width={`${barWidth}%`}
          transition="width 0.3s ease"
        />
      </Pane>
    </Pane>
  );
}

const WEEK_COLORS = [
  '#c5dcf5', '#aecff2', '#98c1ef', '#7fb4eb', '#66a6e7',
  '#4d99e3', '#348be0', '#1e7ddb', '#1470c4', '#1062ac',
  '#0d5496', '#0a4680',
];

export function StatisticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/statistics');
      if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  if (loading) {
    return <Pane padding={16}>Chargement des statistiques...</Pane>;
  }

  if (error) {
    return (
      <Pane>
        <Heading size={800} marginBottom={24}>Statistiques</Heading>
        <Alert intent="danger">{error}</Alert>
      </Pane>
    );
  }

  const funnelMax = stats.funnel?.[0]?.count || 1;

  return (
    <Pane>
      <Heading size={800} marginBottom={24}>
        Statistiques
      </Heading>

      {/* KPI cards */}
      <Pane
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(180px, 1fr))"
        gap={16}
        marginBottom={32}
      >
        <KpiCard
          title="Total candidatures"
          value={stats.total_applications ?? 0}
          color="#1a73e8"
          subtitle="dans la base"
        />
        <KpiCard
          title="En attente"
          value={stats.pending ?? 0}
          color="#f5a623"
          subtitle="statut En attente"
        />
        <KpiCard
          title="Avec entretien"
          value={stats.interviews ?? 0}
          color="#7c4dff"
          subtitle="au moins un entretien RH"
        />
        <KpiCard
          title="Offres reçues"
          value={stats.offers ?? 0}
          color="#00b894"
          subtitle="statut Offre"
        />
        <KpiCard
          title="Taux de conversion"
          value={`${stats.completion_rate ?? 0}%`}
          color={
            stats.completion_rate >= 10
              ? '#00b894'
              : stats.completion_rate >= 5
              ? '#f5a623'
              : '#e17055'
          }
          subtitle="candidatures → offre"
        />
      </Pane>

      <Pane display="grid" gridTemplateColumns="1fr 1fr" gap={24} marginBottom={32}>
        {/* Weekly velocity chart */}
        <Card padding={20} elevation={1} background="#ffffff">
          <Text size={500} fontWeight="bold" display="block" marginBottom={4}>
            Candidatures par semaine
          </Text>
          <Text size={300} color="#999" display="block" marginBottom={16}>
            12 dernières semaines
          </Text>
          {stats.weekly_data && stats.weekly_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={stats.weekly_data}
                margin={{ top: 0, right: 8, left: -20, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#999' }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [value, 'Candidatures']}
                  contentStyle={{ fontSize: '13px', borderRadius: '4px' }}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {stats.weekly_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={WEEK_COLORS[index] || '#4a90e2'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Pane padding={32} textAlign="center">
              <Text color="#ccc">Aucune donnée disponible</Text>
            </Pane>
          )}
        </Card>

        {/* Funnel */}
        <Card padding={20} elevation={1} background="#ffffff">
          <Text size={500} fontWeight="bold" display="block" marginBottom={4}>
            Entonnoir de conversion
          </Text>
          <Text size={300} color="#999" display="block" marginBottom={20}>
            Progression dans le processus de recrutement
          </Text>
          {stats.funnel && stats.funnel.length > 0 ? (
            <Pane>
              {stats.funnel.map((row, index) => (
                <FunnelRow
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  pct={row.pct}
                  maxCount={funnelMax}
                  isFirst={index === 0}
                />
              ))}
            </Pane>
          ) : (
            <Pane padding={32} textAlign="center">
              <Text color="#ccc">Aucune donnée disponible</Text>
            </Pane>
          )}
        </Card>
      </Pane>
    </Pane>
  );
}
