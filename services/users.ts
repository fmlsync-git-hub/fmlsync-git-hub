
import { UserRole } from '../types';

// This is the definitive list of default administrative users.
// Demo accounts (guest, client-spie, etc.) have been removed to prevent reseeding.
export const DEFAULT_USERS: { username: string; password: string; role: UserRole; email: string; }[] = [
  {
    username: 'fmlsync',
    password: 'password123',
    role: 'developer',
    email: 'fmlsync@gmail.com',
  },
  {
    username: 'developer',
    password: 'developer*',
    role: 'developer',
    email: 'developer@fmlsync.com',
  },
  {
    username: 'appmanager',
    password: 'appmanager*',
    role: 'app_manager',
    email: 'appmanager@fmlsync.com',
  },
  {
    username: 'admin',
    password: 'admin*',
    role: 'admin',
    email: 'admin@fmlsync.com',
  },
  {
    username: 'admin_lumen',
    password: 'password',
    role: 'admin',
    email: 'lumenadvisoryinfo@gmail.com',
  },
  {
    username: 'dashboard',
    password: 'dashboard*',
    role: 'dashboard_only',
    email: 'dashboard@fmlsync.com',
  },
  {
    username: 'appbuilder',
    password: 'appbuilder*',
    role: 'designer',
    email: 'appbuilder@fmlsync.com',
  },
];
