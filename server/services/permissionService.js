const PERMISSIONS = [
  { key: 'view_reports', label: 'View reports' },
  { key: 'create_vouchers', label: 'Create vouchers' },
  { key: 'edit_vouchers', label: 'Edit vouchers' },
  { key: 'cancel_vouchers', label: 'Cancel vouchers' },
  { key: 'approve_vouchers', label: 'Approve vouchers' },
  { key: 'manage_users', label: 'Manage users' },
  { key: 'manage_company_settings', label: 'Manage company settings' },
  { key: 'export_data', label: 'Export data' },
];

const ALL_PERMISSIONS = PERMISSIONS.map((permission) => permission.key);

const ROLE_PERMISSIONS = {
  owner: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  accountant: ['view_reports', 'create_vouchers', 'edit_vouchers', 'export_data'],
  viewer: ['view_reports'],
};

const uniquePermissions = (permissions = []) => [
  ...new Set(permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))),
];

const permissionsForRole = (role = 'viewer') => ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;

const memberPermissions = (company, userId) => {
  if (!company || !userId) return [];
  if (company.owner?.equals?.(userId) || String(company.owner) === String(userId)) return ROLE_PERMISSIONS.owner;
  const member = company.members?.find((item) => (
    String(item.user?._id || item.user) === String(userId) && item.status === 'active'
  ));
  if (!member) return [];
  return uniquePermissions(member.permissions?.length ? member.permissions : permissionsForRole(member.role));
};

const can = (company, userId, permission) => memberPermissions(company, userId).includes(permission);

module.exports = {
  ALL_PERMISSIONS,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  can,
  memberPermissions,
  permissionsForRole,
  uniquePermissions,
};
