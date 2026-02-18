import { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Switch,
  Button,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useConfig, useTestProvider, useSaveConfig } from '../services/hooks';

const ALL_PROVIDERS = [
  'anthropic',
  'openai',
  'ollama',
  'openrouter',
  'zai',
  'glm',
  'groq',
  'cohere',
  'mistral',
  'huggingface',
  'replicate',
  'together',
  'forefront',
  'alephalpha',
  'palm',
  'azure',
  'bedrock',
  'deepinfra',
  'bananadev',
  'nlpcloud',
  'ai21',
  'xai',
  'briandearch',
  'novita',
  'voyageai',
  'jina',
  'perplexity',
  'anyscale',
  'fireworks',
  'cloudflare',
  'deepseek',
  'lmstudio',
  'litellm',
];

export default function Providers() {
  const { data: config, isLoading } = useConfig();
  const saveConfig = useSaveConfig();
  const testProvider = useTestProvider();

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const [configureDialog, setConfigureDialog] = useState<{
    open: boolean;
    provider: string;
  }>({ open: false, provider: '' });

  const [providerConfig, setProviderConfig] = useState({
    api_key: '',
    base_url: '',
    model: '',
  });

  const providers = (config?.providers as Record<string, unknown>) || {};
  const enabledProviders = new Set(
    Object.entries(providers)
      .filter(([_, cfg]) => {
        const c = cfg as Record<string, unknown>;
        return c.enabled === true;
      })
      .map(([name]) => name)
  );

  const handleToggleProvider = (provider: string, enabled: boolean) => {
    const updatedProviders = {
      ...providers,
      [provider]: {
        ...(providers[provider] as Record<string, unknown> || {}),
        enabled,
      },
    };

    saveConfig.mutate(
      { providers: updatedProviders },
      {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: `${provider} ${enabled ? 'enabled' : 'disabled'}`,
            severity: 'success',
          });
        },
        onError: () => {
          setSnackbar({
            open: true,
            message: `Failed to update ${provider}`,
            severity: 'error',
          });
        },
      }
    );
  };

  const handleConfigure = (provider: string) => {
    const currentConfig = providers[provider] as Record<string, unknown> || {};
    setProviderConfig({
      api_key: (currentConfig.api_key as string) || '',
      base_url: (currentConfig.base_url as string) || '',
      model: (currentConfig.model as string) || '',
    });
    setConfigureDialog({ open: true, provider });
  };

  const handleSaveConfig = () => {
    const updatedProviders = {
      ...providers,
      [configureDialog.provider]: {
        ...(providers[configureDialog.provider] as Record<string, unknown> || {}),
        api_key: providerConfig.api_key,
        base_url: providerConfig.base_url || undefined,
        model: providerConfig.model || undefined,
      },
    };

    saveConfig.mutate(
      { providers: updatedProviders },
      {
        onSuccess: () => {
          setConfigureDialog({ open: false, provider: '' });
          setSnackbar({
            open: true,
            message: `${configureDialog.provider} configuration saved`,
            severity: 'success',
          });
        },
        onError: () => {
          setSnackbar({
            open: true,
            message: `Failed to save ${configureDialog.provider} configuration`,
            severity: 'error',
          });
        },
      }
    );
  };

  const handleTest = async (provider: string) => {
    testProvider.mutate(provider, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: `${provider} connection test passed`,
          severity: 'success',
        });
      },
      onError: () => {
        setSnackbar({
          open: true,
          message: `${provider} connection test failed`,
          severity: 'error',
        });
      },
    });
  };

  if (isLoading) {
    return <Typography>Loading providers...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        AI Providers
      </Typography>
      <Grid container spacing={2}>
        {ALL_PROVIDERS.map((provider) => {
          const isEnabled = enabledProviders.has(provider);
          const hasConfig = !!(providers[provider] as Record<string, unknown>)?.api_key;

          return (
            <Grid item xs={12} sm={6} md={4} key={provider}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="h6">{provider}</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {hasConfig && (
                          <Chip
                            label="Configured"
                            size="small"
                            color="success"
                            sx={{ mr: 0.5 }}
                          />
                        )}
                        {isEnabled && (
                          <Chip
                            label="Enabled"
                            size="small"
                            color="primary"
                          />
                        )}
                      </Box>
                    </Box>
                    <Switch
                      checked={isEnabled}
                      onChange={(e) => handleToggleProvider(provider, e.target.checked)}
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleConfigure(provider)}
                    >
                      Configure
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                      onClick={() => handleTest(provider)}
                      disabled={!hasConfig || testProvider.isPending}
                    >
                      Test
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog
        open={configureDialog.open}
        onClose={() => setConfigureDialog({ open: false, provider: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure {configureDialog.provider}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="API Key"
              type="password"
              fullWidth
              value={providerConfig.api_key}
              onChange={(e) => setProviderConfig({ ...providerConfig, api_key: e.target.value })}
              placeholder="Enter API key"
            />
            <TextField
              label="Base URL (optional)"
              fullWidth
              value={providerConfig.base_url}
              onChange={(e) => setProviderConfig({ ...providerConfig, base_url: e.target.value })}
              placeholder="https://api.example.com"
            />
            <TextField
              label="Default Model (optional)"
              fullWidth
              value={providerConfig.model}
              onChange={(e) => setProviderConfig({ ...providerConfig, model: e.target.value })}
              placeholder="model-name"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigureDialog({ open: false, provider: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveConfig}
            variant="contained"
            disabled={saveConfig.isPending}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
