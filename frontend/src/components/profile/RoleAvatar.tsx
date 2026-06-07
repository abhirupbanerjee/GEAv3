import { FiShield } from 'react-icons/fi';
import { BsBuilding } from 'react-icons/bs';
import { MdFamilyRestroom } from 'react-icons/md';

interface RoleAvatarProps {
  userName: string;
  userRole: 'admin' | 'staff' | 'citizen';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showIcon?: boolean;
  className?: string;
}

export default function RoleAvatar({
  userName,
  userRole,
  size = 'md',
  showIcon = false,
  className = ''
}: RoleAvatarProps) {
  // Get initials (2 letters preferred)
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (parts[0]?.[0] || 'U').toUpperCase();
  };

  // Role-based gradient backgrounds
  const gradients = {
    admin: 'from-purple-500 to-purple-600',
    staff: 'from-blue-500 to-blue-600',
    citizen: 'from-green-500 to-green-600'
  };

  // Role-based icons
  const icons = {
    admin: FiShield,
    staff: BsBuilding,
    citizen: MdFamilyRestroom
  };

  // Size mappings
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-20 h-20 text-3xl'
  };

  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const initials = getInitials(userName);
  const gradient = gradients[userRole];
  const Icon = icons[userRole];

  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-full flex items-center justify-center shadow-sm relative ${sizeClasses[size]} ${className}`}
      title={userName}
    >
      {/* Optional background icon */}
      {showIcon && (
        <Icon className={`absolute ${iconSizes[size]} text-white opacity-10`} />
      )}

      {/* User initials */}
      <span className="text-white font-semibold relative z-10">
        {initials}
      </span>
    </div>
  );
}
