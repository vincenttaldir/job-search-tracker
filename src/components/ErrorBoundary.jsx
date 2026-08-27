import { Component } from 'react';
import { Pane, Heading, Text, Button, Alert } from 'evergreen-ui';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Pane
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="40vh"
          padding={32}
          gap={16}
        >
          <Heading size={600} color="#e17055">
            Une erreur inattendue est survenue
          </Heading>
          <Alert intent="danger" maxWidth={520}>
            {this.state.error?.message || 'Erreur inconnue'}
          </Alert>
          <Text size={300} color="#999" textAlign="center" maxWidth={400}>
            Cette erreur a été journalisée. Vous pouvez recharger la page ou
            réessayer l'action précédente.
          </Text>
          <Pane display="flex" gap={8}>
            <Button appearance="primary" onClick={this.handleReset}>
              Réessayer
            </Button>
            <Button appearance="minimal" onClick={() => window.location.reload()}>
              Recharger la page
            </Button>
          </Pane>
        </Pane>
      );
    }

    return this.props.children;
  }
}
