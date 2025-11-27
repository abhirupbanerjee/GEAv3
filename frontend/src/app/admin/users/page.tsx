/**
 * @pageContext
 * @title Users
 * @purpose Manage and administer authorized system users, their roles, entity assignments, and access permissions across the portal
 * @audience admin
 * @features
 *   - User list table with email, name, role, entity, status, and last login
 *   - Search users by email, name, or entity
 *   - Add new users with email, name, role, and entity assignment
 *   - Edit existing user details (name, role, entity)
 *   - Activate/deactivate user accounts (toggle button)
 *   - Role-based access: Admin vs Staff roles
 *   - Entity assignment for staff users (required)
 *   - Statistics cards showing total, active, admin, and staff user counts
 * @steps
 *   - Review the user list and statistics
 *   - Use search box to find specific users
 *   - Click "Add User" to create new user account
 *   - Enter email (must match Google/Microsoft account), name, role, and entity (if staff)
 *   - Click edit icon to modify user details
 *   - Toggle status button to activate/deactivate accounts
 * @tips
 *   - Email must match the user's Google or Microsoft account for SSO authentication
 *   - Staff users require entity assignment - they can only access data for their entity
 *   - Admin users have system-wide access and don't require entity assignment
 *   - Email addresses cannot be changed after creation
 *   - Inactive users cannot sign in but their data is preserved
 *   - Role types: admin (full system access) vs staff (entity-scoped access)
 * @relatedPages
 *   - /admin/home: Return to admin dashboard
 *   - /admin/managedata: Manage entities that users are assigned to
 * @permissions
 *   - admin: Full access to view, create, edit, and manage all users
 *   - staff: No access to user management
 * @troubleshooting
 *   - Issue: User can't sign in | Solution: Verify email matches their Google/Microsoft account and account is active
 *   - Issue: Staff user sees no data | Solution: Ensure they are assigned to correct entity
 *   - Issue: Can't add user | Solution: Verify email is unique and role/entity are properly selected
 */

'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { FiUserPlus, FiEdit2, FiCheckCircle, FiXCircle, FiTrash2, FiSearch } from 'react-icons/fi';
import { useChatContext } from '@/hooks/useChatContext';

interface User {
  id: string;
  email: string;
  name: string;
  role_id: number;
  role_name: string;
  role_code: string;
  role_type: string;
  entity_id: string | null;
  entity_name: string | null;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

interface Role {
  role_id: number;
  role_code: string;
  role_name: string;
  role_type: string;
}

interface Entity {
  entity_id: string;
  entity_name: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Chat context
  const { openModal, closeModal } = useChatContext();

  // Check if user is admin
  const isAdmin = session?.user?.roleType === 'admin';

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      fetchUsers();
      fetchRoles();
      fetchEntities();
    }
  }, [status, isAdmin]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchEntities = async () => {
    try {
      const response = await fetch('/api/admin/entities');
      if (!response.ok) throw new Error('Failed to fetch entities');
      const data = await response.json();
      setEntities(data.entities || []);
    } catch (err) {
      console.error('Failed to fetch entities:', err);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update user status');

      await fetchUsers();
    } catch (err) {
      alert('Failed to update user status');
      console.error(err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.entity_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-red-800 font-semibold mb-2">Access Denied</h2>
        <p className="text-red-600">Only administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage authorized users and their access permissions
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddModal(true);
            openModal('add-user', {
              title: 'Add New User',
              entityType: 'user',
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiUserPlus />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by email, name, or entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Entity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Login
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.role_type === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : user.role_type === 'staff'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {user.entity_name || '-'}
                    </div>
                    {user.entity_id && (
                      <div className="text-xs text-gray-500">{user.entity_id}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserStatus(user.id, user.is_active)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        user.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.is_active ? (
                        <>
                          <FiCheckCircle /> Active
                        </>
                      ) : (
                        <>
                          <FiXCircle /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                          openModal('edit-user', {
                            title: 'Edit User',
                            entityType: 'user',
                            entityId: user.id,
                            entityName: user.name,
                            data: {
                              email: user.email,
                              role: user.role_name,
                              entity: user.entity_name,
                              status: user.is_active ? 'Active' : 'Inactive',
                            },
                          });
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit user"
                      >
                        <FiEdit2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Active Users</div>
          <div className="text-2xl font-bold text-green-600">
            {users.filter((u) => u.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Admins</div>
          <div className="text-2xl font-bold text-purple-600">
            {users.filter((u) => u.role_type === 'admin').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Staff</div>
          <div className="text-2xl font-bold text-blue-600">
            {users.filter((u) => u.role_type === 'staff').length}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          roles={roles}
          entities={entities}
          onClose={() => {
            setShowAddModal(false);
            closeModal();
          }}
          onSuccess={() => {
            setShowAddModal(false);
            closeModal();
            fetchUsers();
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          roles={roles}
          entities={entities}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
            closeModal();
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingUser(null);
            closeModal();
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// Add User Modal Component
function AddUserModal({
  roles,
  entities,
  onClose,
  onSuccess,
}: {
  roles: Role[];
  entities: Entity[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role_id: '',
    entity_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRole = roles.find((r) => r.role_id.toString() === formData.role_id);
  const requiresEntity = selectedRole?.role_type === 'staff';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          role_id: parseInt(formData.role_id),
          entity_id: formData.entity_id || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add user');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Add New User</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="user@gov.gd"
            />
            <p className="text-xs text-gray-500 mt-1">
              Must match their Google/Microsoft account
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              required
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {requiresEntity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity *
              </label>
              <select
                required
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select an entity</option>
                {entities.map((entity) => (
                  <option key={entity.entity_id} value={entity.entity_id}>
                    {entity.entity_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Staff users can only access data for their assigned entity
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  roles,
  entities,
  onClose,
  onSuccess,
}: {
  user: User;
  roles: Role[];
  entities: Entity[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    role_id: user.role_id.toString(),
    entity_id: user.entity_id || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRole = roles.find((r) => r.role_id.toString() === formData.role_id);
  const requiresEntity = selectedRole?.role_type === 'staff';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          role_id: parseInt(formData.role_id),
          entity_id: formData.entity_id || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update user');
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Edit User</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              required
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          </div>

          {requiresEntity && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity
              </label>
              <select
                required
                value={formData.entity_id}
                onChange={(e) => setFormData({ ...formData, entity_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select an entity</option>
                {entities.map((entity) => (
                  <option key={entity.entity_id} value={entity.entity_id}>
                    {entity.entity_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Staff users can only access data for their assigned entity
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
