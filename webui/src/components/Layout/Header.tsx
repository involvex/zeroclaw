import { Typography } from '@mui/material';
import ThemeToggle from './ThemeToggle';

export default function Header() {
  return (
    <>
      <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
        Web Dashboard
      </Typography>
      <ThemeToggle />
    </>
  );
}
