import {
  Box,
  Typography,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
} from '@mui/material';

export default function Logs() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Logs
      </Typography>
      <Card>
        <CardContent>
          <FormControlLabel
            control={<Switch defaultChecked />}
            label="Auto-scroll"
          />
          <Box
            sx={{
              mt: 2,
              p: 2,
              bgcolor: 'background.default',
              borderRadius: 1,
              height: 500,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          >
            <Typography component="div">
              <Typography color="primary" component="span">
                [INFO]
              </Typography>{' '}
              2025-02-18 12:00:00 - Starting ZeroClaw daemon...
              <br />
              <Typography color="primary" component="span">
                [INFO]
              </Typography>{' '}
              2025-02-18 12:00:01 - Loaded configuration from config.toml
              <br />
              <Typography color="success.main" component="span">
                [INFO]
              </Typography>{' '}
              2025-02-18 12:00:02 - Gateway listening on 127.0.0.1:3000
              <br />
              <Typography color="warning.main" component="span">
                [WARN]
              </Typography>{' '}
              2025-02-18 12:00:03 - No channels configured
              <br />
              <Typography component="span" sx={{ color: 'text.secondary' }}>
                Waiting for log events...
              </Typography>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
