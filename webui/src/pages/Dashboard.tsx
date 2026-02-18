import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Snackbar,
} from '@mui/material';
import { useSystemInfo, useDaemonStatus, useRestartDaemon, useReloadConfig } from '../services/hooks';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useState } from 'react';

export default function Dashboard() {
  const { data: status } = useDaemonStatus();
  const { data: systemInfo } = useSystemInfo();
  const restartDaemon = useRestartDaemon();
  const reloadConfig = useReloadConfig();

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const handleRestartDaemon = () => {
    restartDaemon.mutate(undefined, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: 'Daemon restarted successfully',
          severity: 'success',
        });
      },
      onError: () => {
        setSnackbar({
          open: true,
          message: 'Failed to restart daemon',
          severity: 'error',
        });
      },
    });
  };

  const handleReloadConfig = () => {
    reloadConfig.mutate(undefined, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: 'Configuration reloaded successfully',
          severity: 'success',
        });
      },
      onError: () => {
        setSnackbar({
          open: true,
          message: 'Failed to reload configuration',
          severity: 'error',
        });
      },
    });
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Status
              </Typography>
              <Typography variant="h5" component="div">
                {status?.status || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Version
              </Typography>
              <Typography variant="h5" component="div">
                {systemInfo?.version || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Platform
              </Typography>
              <Typography variant="h5" component="div">
                {systemInfo?.platform || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Paired
              </Typography>
              <Typography variant="h5" component="div">
                {status?.paired ? 'Yes' : 'No'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Architecture
              </Typography>
              <Typography variant="h5" component="div">
                {systemInfo?.arch || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Uptime
              </Typography>
              <Typography variant="h5" component="div">
                {formatUptime(status?.uptime_seconds)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline">
                Rust Version
              </Typography>
              <Typography variant="body2" component="div">
                {systemInfo?.rust_version || 'Unknown'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={handleRestartDaemon}
                  disabled={restartDaemon.isPending}
                >
                  Restart Daemon
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleReloadConfig}
                  disabled={reloadConfig.isPending}
                >
                  Reload Config
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
