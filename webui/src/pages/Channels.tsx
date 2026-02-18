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
import { useConfig, useTestChannel, useSaveConfig } from '../services/hooks';

const ALL_CHANNELS = [
  'telegram',
  'discord',
  'slack',
  'webhook',
  'matrix',
  'signal',
  'whatsapp',
  'email',
  'twilio',
  'zulip',
  'irc',
  'rocket',
  'revolt',
];

export default function Channels() {
  const { data: config, isLoading } = useConfig();
  const saveConfig = useSaveConfig();
  const testChannel = useTestChannel();

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const [configureDialog, setConfigureDialog] = useState<{
    open: boolean;
    channel: string;
  }>({ open: false, channel: '' });

  const [channelConfig, setChannelConfig] = useState<Record<string, unknown>>({});

  const channels = (config?.channels as Record<string, unknown>) || {};
  const enabledChannels = new Set(
    Object.entries(channels)
      .filter(([_, cfg]) => {
        const c = cfg as Record<string, unknown>;
        return c.enabled === true;
      })
      .map(([name]) => name)
  );

  const handleToggleChannel = (channel: string, enabled: boolean) => {
    const updatedChannels = {
      ...channels,
      [channel]: {
        ...(channels[channel] as Record<string, unknown> || {}),
        enabled,
      },
    };

    saveConfig.mutate(
      { channels: updatedChannels },
      {
        onSuccess: () => {
          setSnackbar({
            open: true,
            message: `${channel} ${enabled ? 'enabled' : 'disabled'}`,
            severity: 'success',
          });
        },
        onError: () => {
          setSnackbar({
            open: true,
            message: `Failed to update ${channel}`,
            severity: 'error',
          });
        },
      }
    );
  };

  const handleConfigure = (channel: string) => {
    const currentConfig = (channels[channel] as Record<string, unknown>) || {};
    setChannelConfig(currentConfig);
    setConfigureDialog({ open: true, channel });
  };

  const handleSaveChannelConfig = () => {
    const updatedChannels = {
      ...channels,
      [configureDialog.channel]: {
        ...(channels[configureDialog.channel] as Record<string, unknown> || {}),
        ...channelConfig,
      },
    };

    saveConfig.mutate(
      { channels: updatedChannels },
      {
        onSuccess: () => {
          setConfigureDialog({ open: false, channel: '' });
          setSnackbar({
            open: true,
            message: `${configureDialog.channel} configuration saved`,
            severity: 'success',
          });
        },
        onError: () => {
          setSnackbar({
            open: true,
            message: `Failed to save ${configureDialog.channel} configuration`,
            severity: 'error',
          });
        },
      }
    );
  };

  const handleTest = async (channel: string) => {
    testChannel.mutate(channel, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: `${channel} connection test passed`,
          severity: 'success',
        });
      },
      onError: () => {
        setSnackbar({
          open: true,
          message: `${channel} connection test failed`,
          severity: 'error',
        });
      },
    });
  };

  const getChannelConfigFields = (channel: string) => {
    const channelFields: Record<string, Array<{ key: string; label: string; type: string; placeholder?: string }>> = {
      telegram: [
        { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Enter bot token from BotFather' },
        { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: 'Target chat ID' },
      ],
      discord: [
        { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'Enter bot token from Discord Developer Portal' },
        { key: 'channel_id', label: 'Channel ID', type: 'text', placeholder: 'Target channel ID' },
      ],
      slack: [
        { key: 'bot_token', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...' },
        { key: 'channel', label: 'Channel', type: 'text', placeholder: '#channel-name' },
      ],
      webhook: [
        { key: 'url', label: 'Webhook URL', type: 'text', placeholder: 'https://example.com/webhook' },
        { key: 'secret', label: 'Secret (optional)', type: 'password', placeholder: 'Webhook secret for verification' },
      ],
      email: [
        { key: 'smtp_server', label: 'SMTP Server', type: 'text', placeholder: 'smtp.gmail.com' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'number', placeholder: '587' },
        { key: 'username', label: 'Username', type: 'text', placeholder: 'your-email@example.com' },
        { key: 'password', label: 'Password', type: 'password' },
        { key: 'from', label: 'From Address', type: 'text', placeholder: 'noreply@example.com' },
        { key: 'to', label: 'To Address', type: 'text', placeholder: 'recipient@example.com' },
      ],
    };

    return channelFields[channel] || [];
  };

  const renderConfigField = (field: { key: string; label: string; type: string; placeholder?: string }) => {
    const value = (channelConfig[field.key] as string | number | boolean) || '';

    if (field.type === 'boolean') {
      return null; // Skip enabled field, it's handled by the toggle
    }

    return (
      <TextField
        key={field.key}
        label={field.label}
        type={field.type === 'password' ? 'password' : field.type === 'number' ? 'number' : 'text'}
        fullWidth
        value={value}
        onChange={(e) =>
          setChannelConfig({
            ...channelConfig,
            [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value,
          })
        }
        placeholder={field.placeholder}
        sx={{ mt: 1 }}
      />
    );
  };

  if (isLoading) {
    return <Typography>Loading channels...</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Channels
      </Typography>
      <Grid container spacing={2}>
        {ALL_CHANNELS.map((channel) => {
          const isEnabled = enabledChannels.has(channel);
          const hasConfig = !!(channels[channel] as Record<string, unknown>);
          const isConfigured = hasConfig && Object.keys(channels[channel] as Record<string, unknown>).length > 1;

          return (
            <Grid item xs={12} sm={6} md={4} key={channel}>
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
                      <Typography variant="h6">{channel}</Typography>
                      <Box sx={{ mt: 0.5 }}>
                        {isConfigured && (
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
                      onChange={(e) => handleToggleChannel(channel, e.target.checked)}
                    />
                  </Box>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleConfigure(channel)}
                    >
                      Configure
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ ml: 1 }}
                      onClick={() => handleTest(channel)}
                      disabled={!isConfigured || testChannel.isPending}
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
        onClose={() => setConfigureDialog({ open: false, channel: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Configure {configureDialog.channel}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {getChannelConfigFields(configureDialog.channel).map(renderConfigField)}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigureDialog({ open: false, channel: '' })}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveChannelConfig}
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
