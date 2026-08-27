import { Badge, Tooltip, Pane, Text } from 'evergreen-ui';

/**
 * CVScoreBadge Component
 * Displays CV match score with color-coding and optional tooltip with details
 */
export function CVScoreBadge({ score, summary = null, breakdown = null }) {
  // If no score, show N/A
  if (score === null || score === undefined) {
    return <Badge>Pas de score</Badge>;
  }

  // Scores are stored /10 in the DB. Clamp to [0, 10] to be safe.
  const scoreOn10 = Math.min(10, Math.max(0, typeof score === 'number' ? score : parseFloat(score)));
  const scoreDisplay = Number.isInteger(scoreOn10) ? `${scoreOn10}/10` : `${scoreOn10.toFixed(1)}/10`;

  // Color thresholds on the /10 scale
  const getScoreColor = (s) => {
    if (s >= 8) return 'green';
    if (s >= 6) return 'yellow';
    if (s >= 4) return 'orange';
    return 'red';
  };

  // Tooltip content with score details
  const tooltipContent = (
    <Pane padding={12} background="#ffffff" borderRadius={4} maxWidth="300px">
      <Text size={400} fontWeight="bold" display="block" marginBottom={8}>
        Score CV : {scoreDisplay}
      </Text>
      {summary && (
        <Text size={300} display="block" marginBottom={8} color="#666">
          {summary}
        </Text>
      )}
      {breakdown && (
        <Pane marginTop={8} paddingTop={8} borderTop="1px solid #e0e0e0">
          <Text size={300} fontWeight="bold" display="block" marginBottom={6}>
            Détails:
          </Text>
          {typeof breakdown === 'string' ? (
            <Text size={300} color="#666">{breakdown}</Text>
          ) : Array.isArray(breakdown) ? (
            // Array of { criterion, score, max, justification } objects
            <Pane>
              {breakdown.map((item, i) => (
                <Pane key={i} marginBottom={6}>
                  <Pane display="flex" justifyContent="space-between">
                    <Text size={300} color="#666">{item.criterion ?? `Critère ${i + 1}`}:</Text>
                    <Text size={300} fontWeight="500">
                      {item.max ? `${item.score}/${item.max}` : `${item.score}%`}
                    </Text>
                  </Pane>
                  {item.justification && (
                    <Text size={200} color="#999" display="block" marginTop={2}>
                      {item.justification}
                    </Text>
                  )}
                </Pane>
              ))}
            </Pane>
          ) : (
            // Object — values may be plain numbers or { criterion, score, max, justification }
            <Pane>
              {Object.entries(breakdown).map(([key, value]) => {
                const isObj = value !== null && typeof value === 'object';
                const score = isObj ? value.score : value;
                const max = isObj ? value.max : null;
                const justification = isObj ? value.justification : null;
                const label = isObj ? (value.criterion ?? key) : key;
                const scoreText = max != null ? `${score}/${max}` : `${score}%`;
                return (
                  <Pane key={key} marginBottom={6}>
                    <Pane display="flex" justifyContent="space-between">
                      <Text size={300} color="#666">{label}:</Text>
                      <Text size={300} fontWeight="500">{scoreText}</Text>
                    </Pane>
                    {justification && (
                      <Text size={200} color="#999" display="block" marginTop={2}>
                        {justification}
                      </Text>
                    )}
                  </Pane>
                );
              })}
            </Pane>
          )}
        </Pane>
      )}
    </Pane>
  );

  const badge = (
    <Badge
      color={getScoreColor(scoreOn10)}
      cursor={summary || breakdown ? 'help' : 'default'}
    >
      {scoreDisplay}
    </Badge>
  );

  // Show tooltip only if there's additional info
  if (summary || breakdown) {
    return (
      <Tooltip content={tooltipContent} position="bottom">
        {badge}
      </Tooltip>
    );
  }

  return badge;
}

/**
 * Format CV score breakdown from JSON
 */
// eslint-disable-next-line react-refresh/only-export-components
export function parseCVBreakdown(breakdownJson) {
  if (!breakdownJson) return null;
  try {
    if (typeof breakdownJson === 'string') {
      return JSON.parse(breakdownJson);
    }
    return breakdownJson;
  } catch {
    return null;
  }
}

/**
 * Get color for a CV score (for styling, not badge display)
 */
// score is on the /10 scale (as stored in DB)
// eslint-disable-next-line react-refresh/only-export-components
export function getScoreColor(score) {
  const s = typeof score === 'number' ? score : parseFloat(score);
  if (s >= 8) return '#34D399'; // green
  if (s >= 6) return '#FBBF24'; // yellow
  if (s >= 4) return '#FB923C'; // orange
  return '#EF4444'; // red
}

/**
 * Get score label with interpretation
 */
// score is on the /10 scale (as stored in DB)
// eslint-disable-next-line react-refresh/only-export-components
export function getScoreLabel(score) {
  const s = typeof score === 'number' ? score : parseFloat(score);
  if (s >= 8) return 'Excellent';
  if (s >= 6) return 'Bon';
  if (s >= 4) return 'Acceptable';
  return 'Faible';
}
