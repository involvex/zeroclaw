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
  Divider,
  Alert,
  Snackbar,
} from '@mui/material';
import { useConfig, useSaveConfig } from '../services/hooks';
import { useThemeMode } from '../contexts/ThemeContext';

interface WebUIConfig {
  enabled?: boolean;
  host?: string;
  port?: number;
}

interface GatewayConfig {
  host?: string;
  port?: number;
  allow_public_bind?: boolean;
  require_pairing?: boolean;
}

export default function Settings() {
  const { data: config, isLoading } = useConfig();
  const saveConfig = useSaveConfig();
  const { mode, toggleTheme } = useThemeMode();

  const [webuiSettings, setWebuiSettings] = useState<WebUIConfig>({
    enabled: true,
    host: '0.0.0.0',
    port: 8080,
  });

  const [gatewaySettings, setGatewaySettings] = useState<GatewayConfig>({
    host: '127.0.0.1',
    port: 3000,
    allow_public_bind: false,
    require_pairing: true,
  });

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (config?.webui) {
      setWebuiSettings({
        enabled: (config.webui as WebUIConfig).enabled ?? true,
        host: (config.webui as WebUIConfig).host ?? '0.0.0.0',
        port: (config.webui as WebUIConfig).port ?? 8080,
      });
    }
    if (config?.gateway) {
      setGatewaySettings({
        host: (config.gateway as GatewayConfig).host ?? '127.0.0.1',
        port: (config.gateway as GatewayConfig).port ?? 3000,
        allow_public_bind: (config.gateway as GatewayConfig).allow_public_bind ?? false,
        require_pairing: (config.gateway as GatewayConfig).require_pairing ?? true,
      });
    }
  }, [config]);

  const handleSaveWebUISettings = () => {
    saveConfig.mutate(
      { webui: webuiSettings },
      {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: 'WebUI settings saved. Restart may be required.',
            severity: 'success',
          });
        },
        onError: () => {
          setSnackbar({
            open: true,
            message: 'Failed to save WebUI settings',
            severity: 'error',
          });
        },
      }
    );
  };

  const handleSaveGatewaySettings = () => {
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
            message: 'Failed to save Gateway settings',
            severity: 'error',
          });
        },
      }
    );
  };

  if (isLoading) {
    return <Typography>Loading settings...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            WebUI Configuration
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={webuiSettings.enabled ?? false}
                  onChange={(e) =>
                    setWebuiSettings({ ...webuiSettings, enabled: e.target.checked })
                  }
                />
              }
              label="Enable WebUI"
            />
            <TextField
              label="Host"
              value={webuiSettings.host}
              onChange={(e) =>
                setWebuiSettings({ ...webuiSettings, host: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Port"
              type="number"
              value={webuiSettings.port}
              onChange={(e) =>
                setWebuiSettings({
                  ...webuiSettings,
                  port: parseInt(e.target.value) || 8080,
                })
              }
              fullWidth
            />
            <Button
              variant="contained"
              onClick={handleSaveWebUISettings}
              disabled={saveConfig.isPending}
            >
              Save WebUI Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Gateway Configuration
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Host"
              value={gatewaySettings.host}
              onChange={(e) =>
                setGatewaySettings({ ...gatewaySettings, host: e.target.value })
              }
              fullWidth
            />
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
            <Button
              variant="contained"
              onClick={handleSaveGatewaySettings}
              disabled={saveConfig.isPending}
            >
              Save Gateway Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <FormControlLabel
            control={
              <Switch checked={mode === 'dark'} onChange={toggleTheme} />
            }
            label="Dark Mode"
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ZeroClaw v0.1.0 - Zero overhead. Zero compromise. 100% Rust. The
            fastest, smallest AI assistant.
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="textSecondary">
            &copy; 2025 ZeroClaw Labs
          </Typography>
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
