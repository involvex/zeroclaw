import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import { useConfig, useSaveConfig } from '../services/hooks';

interface GatewayConfig {
  host?: string;
  port?: number;
  require_pairing?: boolean;
  allow_public_bind?: boolean;
  pair_rate_limit?: number;
  webhook_rate_limit?: number;
}

export default function Gateway() {
  const { data: config, isLoading } = useConfig();
  const saveConfig = useSaveConfig();

  const [gatewaySettings, setGatewaySettings] = useState<GatewayConfig>({
    host: '127.0.0.1',
    port: 3000,
    require_pairing: true,
    allow_public_bind: false,
    pair_rate_limit: 10,
    webhook_rate_limit: 60,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (config?.gateway) {
      const gw = config.gateway as GatewayConfig;
      setGatewaySettings({
        host: gw.host ?? '127.0.0.1',
        port: gw.port ?? 3000,
        require_pairing: gw.require_pairing ?? true,
        allow_public_bind: gw.allow_public_bind ?? false,
        pair_rate_limit: gw.pair_rate_limit ?? 10,
        webhook_rate_limit: gw.webhook_rate_limit ?? 60,
      });
    }
  }, [config]);

  const handleSave = () => {
    saveConfig.mutate(
      { gateway: gatewaySettings },
      {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: 'Gateway settings saved. Restart may be required.',
            severity: 'success',
          });
        },
        onError: () => {
          setSnackbar({
            open: true,
            message: 'Failed to save gateway settings',
            severity: 'error',
          });
        },
      }
    );
  };

  if (isLoading) {
    return <Typography>Loading gateway settings...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Gateway Settings
      </Typography>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Port"
              type="number"
              value={gatewaySettings.port}
              onChange={(e) =>
                setGatewaySettings({
                  ...gatewaySettings,
                  port: parseInt(e.target.value) || 3000,
                })
              }
              fullWidth
            />
            <TextField
              label="Host"
              value={gatewaySettings.host}
              onChange={(e) =>
                setGatewaySettings({ ...gatewaySettings, host: e.target.value })
              }
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={gatewaySettings.require_pairing ?? true}
                  onChange={(e) =>
                    setGatewaySettings({
                      ...gatewaySettings,
                      require_pairing: e.target.checked,
                    })
                  }
                />
              }
              label="Require Pairing"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={gatewaySettings.allow_public_bind ?? false}
                  onChange={(e) =>
                    setGatewaySettings({
                      ...gatewaySettings,
                      allow_public_bind: e.target.checked,
                    })
                  }
                />
              }
              label="Allow Public Bind"
            />
            <TextField
              label="Pair Rate Limit (per minute)"
              type="number"
              value={gatewaySettings.pair_rate_limit}
              onChange={(e) =>
                setGatewaySettings({
                  ...gatewaySettings,
                  pair_rate_limit: parseInt(e.target.value) || 10,
                })
              }
              fullWidth
            />
            <TextField
              label="Webhook Rate Limit (per minute)"
              type="number"
              value={gatewaySettings.webhook_rate_limit}
              onChange={(e) =>
                setGatewaySettings({
                  ...gatewaySettings,
                  webhook_rate_limit: parseInt(e.target.value) || 60,
                })
              }
              fullWidth
            />
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              onClick={handleSave}
              disabled={saveConfig.isPending}
            >
              Save Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

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
