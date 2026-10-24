export type AppRole =
  | 'super_administrator'
  | 'asset_manager'
  | 'supervisor'
  | 'admin_clerk'
  | 'chief_director';

export const APP_ROLES: AppRole[] = [
  'super_administrator',
  'asset_manager',
  'supervisor',
  'admin_clerk',
  'chief_director',
];

export const ROLE_DETAILS: Record<
  AppRole,
  { label: string; description: string }
> = {
  super_administrator: {
    label: 'Super Administrator',
    description:
      'Full system access across every district, including user accounts, assets, and disposal actions.',
  },
  asset_manager: {
    label: 'Asset Manager',
    description:
      'Full operational access within the assigned district: register, update, and remove eligible assets, and submit or review disposal requests. Cannot manage user accounts.',
  },
  supervisor: {
    label: 'Supervisor',
    description:
      'Full operational access within the assigned district, including disposal review and approval. Cannot manage user accounts.',
  },
  admin_clerk: {
    label: 'Admin Clerk',
    description:
      'Can register and update assets and submit disposal requests within the assigned district. Cannot delete assets, approve disposals, or manage users; a Supervisor must review and decide disposal requests.',
  },
  chief_director: {
    label: 'Chief Director',
    description:
      'Full operational access within the assigned district: register, update, and remove eligible assets, and submit or review disposal requests. Cannot manage user accounts.',
  },
};
