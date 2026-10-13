import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Edit3,
  Loader2,
  Lock,
  KeyRound,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Check,
  Globe,
  Eye,
  EyeOff,
  UserX,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Flag,
  X,
  Users,
  Clock,
  BadgeCheck,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/apiClient';
import { UserProfile, Yap } from '../types';
import { YapCard } from '../components/yaps/YapCard';
import { LightboxModal } from '../components/common/LightboxModal';

interface ProfilePageProps {
  viewingUsername?: string | null;
  onBack?: () => void;
  onOpenThread?: (yap: Yap) => void;
  onOpenProfile?: (username: string) => void;
}

const checkPasswordRequirements = (pw: string): string | null => {
  if (pw.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(pw)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[0-9]/.test(pw)) {
    return 'Password must contain at least one number (0-9).';
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pw)) {
    return 'Password must contain at least one special character (!@#$%^&*).';
  }
  return null;
};

export const ProfilePage: React.FC<ProfilePageProps> = ({
  viewingUsername,
  onBack,
  onOpenThread,
  onOpenProfile,
}) => {
  const { user, updateUser, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Social Links state (up to 5 links)
  const [editableSocialLinks, setEditableSocialLinks] = useState<Array<{ platform: string; url: string }>>(
    user?.social_links || []
  );
  const [newSocialPlatform, setNewSocialPlatform] = useState('x');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  // Account Deactivation state (Instagram style)
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateDays, setDeactivateDays] = useState(0);
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [showDeactivatePassword, setShowDeactivatePassword] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  // Account Deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Other user's profile state
  const isViewingOther = !!viewingUsername && viewingUsername !== user?.username;
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [loadingOther, setLoadingOther] = useState(isViewingOther);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  // Follow requests state for private account owners
  const [showFollowRequestsModal, setShowFollowRequestsModal] = useState(false);
  const [pendingFollowRequests, setPendingFollowRequests] = useState<UserProfile[]>([]);
  const [loadingFollowRequests, setLoadingFollowRequests] = useState(false);

  // Profile photo preview & follower removal state
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string | null>(null);
  const [removingFollowerId, setRemovingFollowerId] = useState<string | null>(null);

  const handleRemoveFollower = async (followerId: string) => {
    if (!window.confirm('Are you sure you want to remove this follower?')) return;
    setRemovingFollowerId(followerId);
    try {
      await api.removeFollower(followerId);
      setFollowListUsers((prev) => prev.filter((u) => u.id !== followerId));
      if (user) {
        updateUser({ follower_count: Math.max(0, (user.follower_count || 1) - 1) });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove follower');
    } finally {
      setRemovingFollowerId(null);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const res = await api.uploadMedia(file);
      await api.updateProfile({ banner_url: res.url });
      updateUser({ banner_url: res.url });
    } catch (err: any) {
      alert(err.message || 'Failed to upload cover image');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!window.confirm('Are you sure you want to remove your cover image?')) return;
    try {
      await api.updateProfile({ banner_url: '' });
      updateUser({ banner_url: '' });
    } catch (err: any) {
      alert(err.message || 'Failed to remove cover image');
    }
  };

  const handleAddSocialLink = () => {
    if (editableSocialLinks.length >= 5) {
      alert('You can link up to 5 social accounts.');
      return;
    }
    const cleanUrl = newSocialUrl.trim();
    if (!cleanUrl) return;
    setEditableSocialLinks((prev) => [...prev, { platform: newSocialPlatform, url: cleanUrl }]);
    setNewSocialUrl('');
  };

  const handleRemoveSocialLink = (index: number) => {
    setEditableSocialLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmDeactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeactivating(true);
    setDeactivateError(null);
    try {
      const res = await api.deactivateAccount({
        password: deactivatePassword || undefined,
        autoReactivateDays: Number(deactivateDays) || undefined,
      });
      alert(res.message || 'Your account has been temporarily deactivated.');
      setShowDeactivateModal(false);
      logout();
      window.location.href = '/';
    } catch (err: any) {
      setDeactivateError(err.message || 'Failed to deactivate account.');
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== 'CONFIRM DELETE') {
      setDeleteError('Please type "CONFIRM DELETE" exactly to proceed.');
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await api.deleteAccount({
        password: deletePassword || undefined,
        confirmationText: deleteConfirmText,
      });
      alert(res.message || 'Your account has been permanently deleted.');
      setShowDeleteModal(false);
      logout();
      window.location.href = '/';
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setIsDeleting(false);
    }
  };

  // User's Yaps (Posts) state
  const [userYaps, setUserYaps] = useState<Yap[]>([]);
  const [loadingUserYaps, setLoadingUserYaps] = useState(false);

  // Account Privacy state
  const [isPrivateAccount, setIsPrivateAccount] = useState(user?.is_private || false);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [whoCanSeeDp, setWhoCanSeeDp] = useState<'everyone' | 'followers'>(user?.who_can_see_dp || 'everyone');
  const [whoCanTag, setWhoCanTag] = useState<'everyone' | 'followers' | 'none'>(
    user?.who_can_tag || (user?.is_private ? 'followers' : 'everyone')
  );

  // Followers & Following Modal state
  const [followListModal, setFollowListModal] = useState<'followers' | 'following' | null>(null);
  const [followListUsers, setFollowListUsers] = useState<UserProfile[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  // Own profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [countryCode, setCountryCode] = useState(user?.country_code || 'PK');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Dedicated Change Password state
  const [activePasswordTab, setActivePasswordTab] = useState<'change' | 'forgot'>('change');
  const [currentPassword, setCurrentPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showChangeNewPassword, setShowChangeNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordSuccess, setChangePasswordSuccess] = useState<string | null>(null);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Forgot / Reset Password state
  const [resetEmail, setResetEmail] = useState(user?.email || '');
  const [resetStep, setResetStep] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !resetEmail) {
      setResetEmail(user.email);
    }
  }, [user?.email]);

  // Blocked Accounts (Block list) state
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  // Report History (Report list) state
  const [userReports, setUserReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Fetch blocked users and reports for own profile
  const fetchBlockedUsers = async () => {
    setLoadingBlockedUsers(true);
    try {
      const list = await api.getBlockedUsers();
      setBlockedUsers(list);
    } catch {
      setBlockedUsers([]);
    } finally {
      setLoadingBlockedUsers(false);
    }
  };

  const fetchUserReports = async () => {
    setLoadingReports(true);
    try {
      const reports = await api.getUserReports();
      setUserReports(reports);
    } catch {
      setUserReports([]);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchFollowRequests = async () => {
    setLoadingFollowRequests(true);
    try {
      const res = await api.getFollowRequests();
      setPendingFollowRequests(res.requests || []);
    } catch {
      setPendingFollowRequests([]);
    } finally {
      setLoadingFollowRequests(false);
    }
  };

  const handleAcceptRequestModal = async (requesterId: string) => {
    try {
      await api.acceptFollowRequest(requesterId);
      setPendingFollowRequests((prev) => prev.filter((r) => r.id !== requesterId));
      if (user) {
        updateUser({ follower_count: (user.follower_count || 0) + 1 });
      }
    } catch {
      alert('Failed to accept follow request');
    }
  };

  const handleRejectRequestModal = async (requesterId: string) => {
    try {
      await api.rejectFollowRequest(requesterId);
      setPendingFollowRequests((prev) => prev.filter((r) => r.id !== requesterId));
    } catch {
      alert('Failed to decline follow request');
    }
  };

  // Sync own user fields and load lists
  useEffect(() => {
    if (user && !isViewingOther) {
      setUsername(user.username || '');
      setDisplayName(user.display_name || '');
      setBio(user.bio || '');
      setCountryCode(user.country_code || 'PK');
      setResetEmail(user.email || '');
      setIsPrivateAccount(!!user.is_private);
      setWhoCanSeeDp(user.who_can_see_dp || 'everyone');
      setWhoCanTag(user.who_can_tag || (user.is_private ? 'followers' : 'everyone'));
      setEditableSocialLinks(user.social_links || []);
      fetchBlockedUsers();
      fetchUserReports();
      fetchFollowRequests();
    }
  }, [user, isViewingOther]);

  // Load other user's profile and check if blocked
  useEffect(() => {
    if (isViewingOther && viewingUsername) {
      setLoadingOther(true);
      api
        .getProfile(viewingUsername)
        .then((p) => {
          setOtherProfile(p);
          setIsFollowing(!!(p as any).is_following);
          setIsRequested(!!(p as any).is_requested);
          setFollowerCount(p.follower_count || 0);
          setLoadingOther(false);
          if (p?.id) {
            api.isUserBlocked(p.id).then((blocked) => setIsBlocked(blocked)).catch(() => {});
          }
        })
        .catch(() => {
          setLoadingOther(false);
        });
    }
  }, [viewingUsername, isViewingOther]);

  // Load yaps for current profile
  useEffect(() => {
    const target = isViewingOther ? viewingUsername : user?.username;
    if (target) {
      setLoadingUserYaps(true);
      api
        .getUserYaps(target)
        .then((res) => {
          setUserYaps(res.yaps || []);
          setLoadingUserYaps(false);
        })
        .catch(() => {
          setUserYaps([]);
          setLoadingUserYaps(false);
        });
    }
  }, [isViewingOther, viewingUsername, user?.username]);

  const handleDeleteYap = async (yapId: string) => {
    try {
      await api.deleteYap(yapId);
      setUserYaps((prev) => prev.filter((y) => y.id !== yapId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete yap');
    }
  };

  const handleOpenFollowList = async (type: 'followers' | 'following', targetUsername: string) => {
    setFollowListModal(type);
    setLoadingFollowList(true);
    setFollowListUsers([]);
    try {
      if (type === 'followers') {
        const list = await api.getFollowers(targetUsername);
        setFollowListUsers(list);
      } else {
        const list = await api.getFollowing(targetUsername);
        setFollowListUsers(list);
      }
    } catch {
      setFollowListUsers([]);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const handleTogglePrivacy = async () => {
    setIsUpdatingPrivacy(true);
    const next = !isPrivateAccount;
    const nextTag = next ? 'followers' : 'everyone';
    try {
      await api.updateProfile({ is_private: next, who_can_tag: nextTag });
      setIsPrivateAccount(next);
      setWhoCanTag(nextTag);
      updateUser({ is_private: next, who_can_tag: nextTag });
    } catch (err: any) {
      alert(err.message || 'Failed to update account privacy');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user) {
      alert('Please sign in to follow users');
      return;
    }
    if (!otherProfile) return;

    if (isFollowing) {
      // Unfollow
      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
      try {
        const res = await api.toggleFollow(otherProfile.id);
        setIsFollowing(res.following);
        setIsRequested(!!res.requested);
      } catch {
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
      return;
    }

    if (otherProfile.is_private) {
      // Follow request for private account
      const prevReq = isRequested;
      setIsRequested(!prevReq);
      try {
        const res = await api.toggleFollow(otherProfile.id);
        setIsFollowing(res.following);
        setIsRequested(!!res.requested);
      } catch {
        setIsRequested(prevReq);
      }
      return;
    }

    // Follow public account
    setIsFollowing(true);
    setFollowerCount((prev) => prev + 1);
    try {
      const res = await api.toggleFollow(otherProfile.id);
      setIsFollowing(res.following);
      setIsRequested(!!res.requested);
    } catch {
      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleToggleBlock = async () => {
    if (!user) {
      alert('Please sign in to block users');
      return;
    }
    if (!otherProfile) return;

    setIsBlocking(true);
    try {
      if (isBlocked) {
        await api.unblockUser(otherProfile.id);
        setIsBlocked(false);
      } else {
        const confirmed = window.confirm(
          `Are you sure you want to block @${otherProfile.username}? You will unfollow each other.`
        );
        if (!confirmed) {
          setIsBlocking(false);
          return;
        }
        await api.blockUser(otherProfile.id);
        setIsBlocked(true);
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - (isFollowing ? 1 : 0)));
      }
    } catch (err: any) {
      alert(err.message || 'Block action failed');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setChangePasswordError('Please enter your current password.');
      return;
    }
    const pwErr = checkPasswordRequirements(changeNewPassword);
    if (pwErr) {
      setChangePasswordError(pwErr);
      return;
    }
    if (changeNewPassword !== confirmNewPassword) {
      setChangePasswordError('New password and confirmation do not match.');
      return;
    }

    setIsChangingPassword(true);
    setChangePasswordError(null);
    setChangePasswordSuccess(null);

    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword: changeNewPassword,
      });
      setChangePasswordSuccess(res.message || 'Password updated successfully!');
      setCurrentPassword('');
      setChangeNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setChangePasswordError(err.message || 'Failed to update password. Current password may be incorrect.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUnblockUser = async (targetId: string) => {
    setUnblockingUserId(targetId);
    try {
      await api.unblockUser(targetId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetId));
    } catch (err: any) {
      alert(err.message || 'Failed to unblock user');
    } finally {
      setUnblockingUserId(null);
    }
  };

  const handleInitiateForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = user?.email || resetEmail.trim();
    setIsSendingReset(true);
    setResetError(null);
    setResetSuccess(null);
    try {
      await api.forgotPassword(targetEmail);
      setResetSuccess(`A 6-digit reset code has been sent to ${targetEmail || 'your registered email'}`);
      setResetStep(true);
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset code');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = user?.email || resetEmail.trim();
    if (!resetOtp.trim()) {
      setResetError('Please enter the 6-digit reset code.');
      return;
    }
    const pwErr = checkPasswordRequirements(newPassword);
    if (pwErr) {
      setResetError(pwErr);
      return;
    }
    setIsSubmittingReset(true);
    setResetError(null);
    try {
      const res = await api.resetPassword({
        email: targetEmail,
        code: resetOtp.trim(),
        newPassword,
      });
      setResetSuccess(res.message || 'Password updated successfully!');
      setNewPassword('');
      setResetOtp('');
      setTimeout(() => {
        setResetStep(false);
        setActivePasswordTab('change');
      }, 2000);
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image must be under 5MB');
      return;
    }

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const res = await api.uploadAvatar(file);
      updateUser({ avatar_url: res.url });
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload profile picture');
      alert(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setSaveError('Username must be between 3 and 30 characters');
      setIsSaving(false);
      return;
    }

    try {
      const updated = await api.updateProfile({
        username: cleanUsername,
        display_name: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        country_code: countryCode,
        is_private: isPrivateAccount,
        who_can_see_dp: whoCanSeeDp,
        who_can_tag: whoCanTag,
        social_links: editableSocialLinks,
      });

      updateUser({
        username: cleanUsername,
        display_name: displayName.trim() || cleanUsername,
        bio: bio.trim(),
        country_code: countryCode,
        is_private: isPrivateAccount,
        who_can_see_dp: whoCanSeeDp,
        who_can_tag: whoCanTag,
        social_links: editableSocialLinks,
      });

      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Rendering Other Person's Profile
  if (isViewingOther) {
    if (loadingOther) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          Loading @{viewingUsername}'s profile...
        </div>
      );
    }

    if (!otherProfile) {
      return (
        <div className="max-w-2xl mx-auto py-12 text-center space-y-3">
          <p className="text-slate-500">User @{viewingUsername} not found.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Back to Feed
            </button>
          )}
        </div>
      );
    }

    if (otherProfile.is_deactivated) {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <UserX className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Deactivated</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              @{viewingUsername} has temporarily deactivated their account.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold"
            >
              Back to Feed
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Feed</span>
          </button>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {/* Banner */}
          <div className="h-36 sm:h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
            {otherProfile.banner_url ? (
              <img
                src={otherProfile.banner_url}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
            )}
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>{otherProfile.country_code ? `${otherProfile.country_code} · Regional` : 'Global'}</span>
            </div>
          </div>

          {/* Profile Header */}
          {/* Profile Header */}
          <div className="p-4 sm:p-6 pt-0 relative">
            <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3 sm:mb-4 gap-2 sm:gap-4">
              <div
                className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square cursor-pointer group"
                onClick={() => {
                  if (otherProfile.avatar_hidden) {
                    alert('This user has restricted profile photo visibility to approved followers only.');
                    return;
                  }
                  setPreviewAvatarUrl(
                    otherProfile.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherProfile.username}`
                  );
                }}
                title={otherProfile.avatar_hidden ? 'Profile photo is private (followers only)' : 'Click to view full photo'}
              >
                <img
                  src={
                    otherProfile.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${otherProfile.username}`
                  }
                  alt={otherProfile.display_name}
                  className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 group-hover:opacity-90 transition-opacity"
                />
                {otherProfile.avatar_hidden && (
                  <div className="absolute inset-0 rounded-full bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center text-white" title="Private profile photo">
                    <Lock className="w-5 h-5 text-white/90" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Follow / Unfollow / Requested Button */}
                <button
                  onClick={handleToggleFollow}
                  disabled={isBlocked}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-3 sm:px-4 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-sm whitespace-nowrap ${
                    isBlocked
                      ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : isFollowing
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600'
                      : isRequested
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800 hover:bg-rose-50 hover:text-rose-600'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  }`}
                  title={isRequested ? 'Click to cancel follow request' : undefined}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>Following</span>
                    </>
                  ) : isRequested ? (
                    <>
                      <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      <span>Requested</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>Follow</span>
                    </>
                  )}
                </button>

                {/* Block / Unblock Button */}
                <button
                  onClick={handleToggleBlock}
                  disabled={isBlocking}
                  className={`flex items-center justify-center gap-1 sm:gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all border whitespace-nowrap ${
                    isBlocked
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-100'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                  }`}
                  title={isBlocked ? 'Unblock this user' : 'Block this user'}
                >
                  {isBlocking ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                  ) : isBlocked ? (
                    <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  ) : (
                    <UserX className="w-3.5 h-3.5 flex-shrink-0" />
                  )}
                  <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                </button>
              </div>
            </div>

            {/* User Info */}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white break-words break-all">
                  {otherProfile.display_name}
                </h2>
                {otherProfile.is_verified && (
                  <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500 text-white flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">@{otherProfile.username}</p>

              {otherProfile.bio && (
                <p className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-lg">
                  {otherProfile.bio}
                </p>
              )}

              {/* Linked Social Accounts */}
              {otherProfile.social_links && otherProfile.social_links.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {otherProfile.social_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors"
                      title={link.url}
                    >
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                      <span className="capitalize">{link.platform || 'Link'}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 mt-4 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenFollowList('following', otherProfile.username)}
                  className="hover:underline text-left group"
                >
                  <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {(otherProfile.following_count || 0).toLocaleString()}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Following</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenFollowList('followers', otherProfile.username)}
                  className="hover:underline text-left group"
                >
                  <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {followerCount.toLocaleString()}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Followers</span>
                </button>
              </div>

              {/* Blocked Notification Banner */}
              {isBlocked && (
                <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>You have blocked @{otherProfile.username}. They cannot follow you or interact with your profile.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Private Account Lock Screen OR Posts Feed */}
        {otherProfile.is_private && !isFollowing && otherProfile.id !== user?.id ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-600 dark:text-slate-300">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">This Account is Private</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {isRequested
                ? `Your request to follow @${otherProfile.username} is pending approval.`
                : `Follow @${otherProfile.username} to view their yaps, replies, and activities.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              Yaps by @{otherProfile.username}
            </h3>
            {loadingUserYaps ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                Loading yaps...
              </div>
            ) : userYaps.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                @{otherProfile.username} has not posted any yaps yet.
              </div>
            ) : (
              userYaps.map((yap) => (
                <YapCard
                  key={`${yap.id}_${yap.is_reyap ? 'reyap' : 'orig'}`}
                  yap={yap}
                  onOpenThread={(y) => onOpenThread?.(y)}
                  onOpenProfile={(u) => onOpenProfile?.(u)}
                />
              ))
            )}
          </div>
        )}

        {/* Followers / Following Modal */}
        {followListModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setFollowListModal(null)}
          >
            <div
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                    {followListModal}
                  </h3>
                </div>
                <button
                  onClick={() => setFollowListModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-3 max-h-72 overflow-y-auto space-y-2.5">
                {loadingFollowList ? (
                  <p className="text-center text-xs text-slate-400 py-4">Loading {followListModal}...</p>
                ) : followListUsers.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4">No {followListModal} found.</p>
                ) : (
                  followListUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setFollowListModal(null);
                        onOpenProfile?.(u.username);
                      }}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                        <img
                          src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-100 dark:ring-slate-700 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1 truncate">
                            <span className="truncate">{u.display_name}</span>
                            {u.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white flex-shrink-0" />}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Modal for Full Profile Photo View */}
        <LightboxModal
          images={previewAvatarUrl ? [previewAvatarUrl] : []}
          isOpen={!!previewAvatarUrl}
          onClose={() => setPreviewAvatarUrl(null)}
        />
      </div>
    );
  }

  // 2. Rendering Own Profile (Settings)
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-500 dark:text-slate-400">
        Please sign in to view your profile and settings.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 px-4 sm:px-6 space-y-4">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Feed</span>
        </button>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {/* Banner with Cover Photo Upload (LinkedIn & X Style) */}
        <div className="h-36 sm:h-44 bg-slate-100 dark:bg-slate-800 relative overflow-hidden group">
          {user.banner_url ? (
            <img
              src={user.banner_url}
              alt="Cover banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-200 dark:bg-slate-800" />
          )}

          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-[11px] font-semibold">
              {user.country_code ? `${user.country_code} · Regional` : 'Global'}
            </div>
            {/* Cover Action Buttons */}
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              title="Change cover image"
              className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-full transition-transform hover:scale-105"
            >
              {uploadingBanner ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            {user.banner_url && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                title="Remove cover image"
                className="p-1.5 bg-black/60 hover:bg-rose-600 backdrop-blur-md text-white rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleBannerChange}
          />
        </div>

        {/* Profile Content */}
        <div className="p-4 sm:p-6 pt-0 relative">
          {/* Avatar with Camera Upload Overlay & Preview */}
          <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3 sm:mb-4 gap-2 sm:gap-4">
            <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 aspect-square">
              <img
                src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt={user.display_name}
                onClick={() =>
                  setPreviewAvatarUrl(
                    user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`
                  )
                }
                title="Click to view full photo"
                className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-lg bg-slate-100 dark:bg-slate-800 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change profile picture"
                className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full ring-2 ring-white dark:ring-slate-900 shadow-md transition-transform hover:scale-110 flex items-center justify-center cursor-pointer"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white animate-spin" />
                ) : (
                  <Camera className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-nowrap flex-shrink-0">
              {isPrivateAccount && (
                <button
                  type="button"
                  onClick={() => {
                    fetchFollowRequests();
                    setShowFollowRequestsModal(true);
                  }}
                  className="h-8 sm:h-9 px-2.5 sm:px-4 py-1 sm:py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[11px] sm:text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
                >
                  <Users className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Requests</span>
                  {pendingFollowRequests.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                      {pendingFollowRequests.length}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isEditing) {
                    setUsername(user?.username || '');
                    setDisplayName(user?.display_name || '');
                    setBio(user?.bio || '');
                    setCountryCode(user?.country_code || 'PK');
                    setIsPrivateAccount(user?.is_private || false);
                    setWhoCanSeeDp(user?.who_can_see_dp || 'everyone');
                    setWhoCanTag(user?.who_can_tag || (user?.is_private ? 'followers' : 'everyone'));
                  }
                  setIsEditing(!isEditing);
                  setSaveError(null);
                }}
                className="h-8 sm:h-9 px-2.5 sm:px-4 py-1 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 transition-all shadow-sm flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
              >
                <Edit3 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
              </button>
            </div>
          </div>

          {avatarError && <p className="text-xs text-rose-600 mb-2">{avatarError}</p>}
          {saveError && <p className="text-xs text-rose-600 mb-2">{saveError}</p>}

          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 mb-4">
              {/* Change Username Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username Handle
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs">
                  <span className="text-slate-400 font-bold mr-1">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="new_username"
                    required
                    className="w-full bg-transparent outline-none text-slate-900 dark:text-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  3-30 lowercase characters, numbers, and underscores only.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                >
                  <option value="PK">PK · Pakistan</option>
                  <option value="US">US · United States</option>
                  <option value="SG">SG · Singapore</option>
                  <option value="GB">GB · United Kingdom</option>
                  <option value="AE">AE · United Arab Emirates</option>
                  <option value="SA">SA · Saudi Arabia</option>
                </select>
              </div>

              {/* Account Visibility (Public vs. Private) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Visibility</h4>
                  <p className="text-[11px] text-slate-400">
                    {isPrivateAccount
                      ? 'Private account: only people you approve can see your yaps.'
                      : 'Public account: anyone can see your yaps and profile.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePrivacy}
                  disabled={isUpdatingPrivacy}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    isPrivateAccount
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                  }`}
                >
                  {isUpdatingPrivacy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isPrivateAccount ? (
                    'Private'
                  ) : (
                    'Public'
                  )}
                </button>
              </div>

              {/* Profile Photo (DP) Visibility */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Who can see my profile photo (DP)?</h4>
                  <p className="text-[11px] text-slate-400">
                    {whoCanSeeDp === 'followers'
                      ? 'Only approved followers can see your profile photo. Non-followers see a locked placeholder.'
                      : 'Anyone visiting your profile can see your avatar photo.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setWhoCanSeeDp('everyone')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      whoCanSeeDp === 'everyone'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhoCanSeeDp('followers')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      whoCanSeeDp === 'followers'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    Followers only
                  </button>
                </div>
              </div>

              {/* Tag / Mention Permission */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Who can tag / mention me with @?</h4>
                  <p className="text-[11px] text-slate-400">
                    {whoCanTag === 'none'
                      ? 'No one can tag or mention your username in yaps or comments.'
                      : whoCanTag === 'followers'
                      ? 'Only your followers can tag or mention your username.'
                      : 'Anyone on Yapr can tag or mention your username.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setWhoCanTag('everyone')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      whoCanTag === 'everyone'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhoCanTag('followers')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      whoCanTag === 'followers'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    Followers only
                  </button>
                  <button
                    type="button"
                    onClick={() => setWhoCanTag('none')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                      whoCanTag === 'none'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                    }`}
                  >
                    No one
                  </button>
                </div>
              </div>

              {/* Linked Social Accounts (Up to 5) */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Linked Social Accounts</h4>
                    <p className="text-[11px] text-slate-400">Add up to 5 social links to display on your profile.</p>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    {editableSocialLinks.length}/5
                  </span>
                </div>

                {editableSocialLinks.length > 0 && (
                  <div className="space-y-2">
                    {editableSocialLinks.map((link, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate flex-1 mr-2">
                          <span className="font-bold capitalize px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                            {link.platform}
                          </span>
                          <span className="truncate text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                            {link.url}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSocialLink(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors flex-shrink-0"
                          title="Remove link"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {editableSocialLinks.length < 5 && (
                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <select
                      value={newSocialPlatform}
                      onChange={(e) => setNewSocialPlatform(e.target.value)}
                      className="w-full sm:w-32 py-1.5 px-2.5 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="x">X (Twitter)</option>
                      <option value="github">GitHub</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                      <option value="website">Website</option>
                    </select>
                    <input
                      type="text"
                      value={newSocialUrl}
                      onChange={(e) => setNewSocialUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full sm:flex-1 py-1.5 px-3 rounded-xl text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddSocialLink}
                      disabled={!newSocialUrl.trim()}
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 text-xs font-bold rounded-xl transition-opacity whitespace-nowrap"
                    >
                      Add Link
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 dark:text-white break-words break-all">{user.display_name}</h2>
                {user.is_verified && (
                  <BadgeCheck className="w-5 h-5 text-blue-500 fill-blue-500 text-white flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">@{user.username}</p>

              {user.bio && (
                <p className="mt-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-lg">{user.bio}</p>
              )}

              {/* Linked Social Accounts */}
              {user.social_links && user.social_links.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {user.social_links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700 transition-colors"
                      title={link.url}
                    >
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                      <span className="capitalize">{link.platform || 'Link'}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-5 mt-4 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenFollowList('following', user.username)}
                  className="hover:underline text-left group"
                >
                  <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {user.following_count?.toLocaleString() || 0}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Following</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenFollowList('followers', user.username)}
                  className="hover:underline text-left group"
                >
                  <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {user.follower_count?.toLocaleString() || 0}
                  </span>{' '}
                  <span className="text-slate-500 dark:text-slate-400">Followers</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security & Password Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/50 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security & Password</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Change your password or request a reset code</p>
            </div>
          </div>

          {/* Tab Switcher: Change Password vs Forgot Password */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setActivePasswordTab('change');
                setChangePasswordError(null);
                setChangePasswordSuccess(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activePasswordTab === 'change'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Change Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActivePasswordTab('forgot');
                setResetError(null);
                setResetSuccess(null);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activePasswordTab === 'forgot'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Forgot Password
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODE 1: CHANGE PASSWORD (Current Password -> New Password -> Confirm Password) */}
        {/* ========================================================================= */}
        {activePasswordTab === 'change' && (
          <form onSubmit={handleChangePassword} className="space-y-3.5">
            {changePasswordSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{changePasswordSuccess}</span>
              </div>
            )}

            {changePasswordError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{changePasswordError}</span>
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <div className="flex items-center px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500">
                <Lock className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(min. 8 chars, 1 uppercase, 1 number, 1 special char)</span>
              </label>
              <div className="flex items-center px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500">
                <Lock className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type={showChangeNewPassword ? 'text' : 'password'}
                  value={changeNewPassword}
                  onChange={(e) => setChangeNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={8}
                  required
                  className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowChangeNewPassword(!showChangeNewPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showChangeNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="flex items-center px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:border-blue-500">
                <Lock className="w-4 h-4 text-slate-400 mr-2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  minLength={8}
                  required
                  className="w-full text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                {isChangingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>{isChangingPassword ? 'Updating Password...' : 'Change Password'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePasswordTab('forgot');
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Forgot your password?
              </button>
            </div>
          </form>
        )}

        {/* ========================================================================= */}
        {/* MODE 2: FORGOT PASSWORD (OTP Reset Link via Email) */}
        {/* ========================================================================= */}
        {activePasswordTab === 'forgot' && (
          <div className="space-y-3.5">
            {resetSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{resetSuccess}</span>
              </div>
            )}

            {resetError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{resetError}</span>
              </div>
            )}

            {!resetStep ? (
              <form onSubmit={handleInitiateForgot} className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Send a 6-digit password reset verification code to{' '}
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {user?.email || resetEmail || 'your registered account email'}
                  </span>.
                </p>

                {!user?.email && !resetEmail && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {isSendingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>{isSendingReset ? 'Sending Reset Code...' : 'Send Reset Code'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePasswordTab('change')}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Back to Change Password
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    required
                    className="w-full px-3.5 py-2.5 text-xs font-mono tracking-widest bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    New Password <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">(min. 8 chars, 1 uppercase, 1 number, 1 special char)</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    minLength={8}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingReset}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {isSubmittingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isSubmittingReset ? 'Updating Password...' : 'Reset Password'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(false);
                      setResetError(null);
                      setResetSuccess(null);
                    }}
                    className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BLOCKED ACCOUNTS CARD (Block List) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Blocked Accounts</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Users you have blocked from interacting with you</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            {blockedUsers.length}
          </span>
        </div>

        {loadingBlockedUsers ? (
          <div className="py-6 text-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
            <span className="text-xs">Loading blocked accounts...</span>
          </div>
        ) : blockedUsers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            You haven&apos;t blocked any accounts.
          </div>
        ) : (
          <div className="space-y-2.5">
            {blockedUsers.map((bUser) => (
              <div
                key={bUser.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 transition-colors min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden mr-2">
                  <img
                    src={bUser.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bUser.username}`}
                    alt={bUser.display_name}
                    className="w-9 h-9 rounded-full object-cover bg-slate-200 dark:bg-slate-700 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {bUser.display_name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      @{bUser.username}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleUnblockUser(bUser.id)}
                  disabled={unblockingUserId === bUser.id}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-bold transition-colors flex items-center gap-1.5 flex-shrink-0"
                >
                  {unblockingUserId === bUser.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  )}
                  <span>Unblock</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* REPORT HISTORY CARD (Report List) */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Report History</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Status of reports you have submitted</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
            {userReports.length}
          </span>
        </div>

        {loadingReports ? (
          <div className="py-6 text-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
            <span className="text-xs">Loading report history...</span>
          </div>
        ) : userReports.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            No submitted reports found.
          </div>
        ) : (
          <div className="space-y-2.5">
            {userReports.map((report) => (
              <div
                key={report.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                      {report.reason}
                    </span>
                    {report.reported_user?.username && (
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        · @{report.reported_user.username}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Reported on {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      report.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : report.status === 'reviewed'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {report.status || 'pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DANGER ZONE: ACCOUNT DEACTIVATION & DELETION */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-200/70 dark:border-rose-900/40 shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200/50 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Danger Zone</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage temporary deactivation or permanent deletion of your account
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Deactivate Option */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Deactivate Account</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Temporarily hide your profile, yaps, and interactions. Auto-reactivate after 1-7 days or reactivate anytime by logging back in.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeactivateError(null);
                setDeactivatePassword('');
                setShowDeactivateModal(true);
              }}
              className="mt-3.5 w-full py-2 px-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-xl transition-colors"
            >
              Deactivate Account
            </button>
          </div>

          {/* Delete Option */}
          <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Delete Account</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Permanently wipe your account, username, yaps, followers, and bookmarks. This action cannot be reversed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeletePassword('');
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
              className="mt-3.5 w-full py-2 px-3 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-sm"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* USER'S POSTS / YAPS FEED */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Your Yaps ({userYaps.length})
          </h3>
          <span className="text-[11px] text-slate-400">All your public posts</span>
        </div>

        {loadingUserYaps ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
            Loading your yaps...
          </div>
        ) : userYaps.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
            You haven&apos;t posted any yaps yet. Head to your feed to share your first yap!
          </div>
        ) : (
          userYaps.map((yap) => (
            <YapCard
              key={`${yap.id}_${yap.is_reyap ? 'reyap' : 'orig'}`}
              yap={yap}
              onOpenThread={(y) => onOpenThread?.(y)}
              onOpenProfile={(u) => onOpenProfile?.(u)}
              onDeleteYap={handleDeleteYap}
            />
          ))
        )}
      </div>

      {/* Follow Requests Modal for Private Account Owner */}
      {showFollowRequestsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowFollowRequestsModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Follow Requests ({pendingFollowRequests.length})
                </h3>
              </div>
              <button
                onClick={() => setShowFollowRequestsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3">
              {loadingFollowRequests ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-2" />
                  Loading requests...
                </div>
              ) : pendingFollowRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending follow requests.
                </div>
              ) : (
                pendingFollowRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 min-w-0"
                  >
                    <div
                      className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden mr-2 cursor-pointer"
                      onClick={() => {
                        setShowFollowRequestsModal(false);
                        onOpenProfile?.(req.username);
                      }}
                    >
                      <img
                        src={req.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.username}`}
                        alt={req.display_name}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {req.display_name}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">@{req.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleAcceptRequestModal(req.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequestModal(req.id)}
                        className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Followers / Following Modal */}
      {followListModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setFollowListModal(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">
                  {followListModal}
                </h3>
              </div>
              <button
                onClick={() => setFollowListModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-3 max-h-72 overflow-y-auto space-y-2.5">
              {loadingFollowList ? (
                <p className="text-center text-xs text-slate-400 py-4">Loading {followListModal}...</p>
              ) : followListUsers.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-4">No {followListModal} found.</p>
              ) : (
                followListUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setFollowListModal(null);
                      onOpenProfile?.(u.username);
                    }}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                      <img
                        src={u.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-100 dark:ring-slate-700 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1 truncate">
                          <span className="truncate">{u.display_name}</span>
                          {u.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500 text-white flex-shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate">@{u.username}</p>
                      </div>
                    </div>

                    {/* Remove Follower Button if viewing own followers */}
                    {followListModal === 'followers' && !isViewingOther && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFollower(u.id);
                        }}
                        disabled={removingFollowerId === u.id}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg border border-rose-200 dark:border-rose-900 transition-colors flex-shrink-0 ml-2"
                      >
                        {removingFollowerId === u.id ? 'Removing...' : 'Remove'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Full Profile Photo View */}
      <LightboxModal
        images={previewAvatarUrl ? [previewAvatarUrl] : []}
        isOpen={!!previewAvatarUrl}
        onClose={() => setPreviewAvatarUrl(null)}
      />

      {/* ========================================================================= */}
      {/* DEACTIVATE ACCOUNT MODAL (Instagram-style) */}
      {/* ========================================================================= */}
      {showDeactivateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowDeactivateModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Temporarily Deactivate Account</h3>
                  <p className="text-[11px] text-slate-500">Instagram-style deactivation</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeactivateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your profile, yaps, and interactions will be hidden from everyone. You can reactivate anytime simply by logging back in with your password.
            </p>

            <form onSubmit={handleConfirmDeactivate} className="space-y-4">
              {deactivateError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deactivateError}</span>
                </div>
              )}

              {/* Auto Reactivation Window */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Automatically reactivate my account after:
                </label>
                <select
                  value={deactivateDays}
                  onChange={(e) => setDeactivateDays(Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value={0}>Don&apos;t auto-reactivate (I will log back in manually)</option>
                  <option value={1}>1 day</option>
                  <option value={2}>2 days</option>
                  <option value={3}>3 days</option>
                  <option value={4}>4 days</option>
                  <option value={5}>5 days</option>
                  <option value={6}>6 days</option>
                  <option value={7}>7 days</option>
                </select>
              </div>

              {/* Password Confirmation */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Enter your password to confirm:
                </label>
                <div className="relative">
                  <input
                    type={showDeactivatePassword ? 'text' : 'password'}
                    value={deactivatePassword}
                    onChange={(e) => setDeactivatePassword(e.target.value)}
                    required
                    placeholder="Current password"
                    className="w-full py-2 px-3 pr-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeactivatePassword(!showDeactivatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showDeactivatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeactivateModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeactivating}
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20"
                >
                  {isDeactivating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isDeactivating ? 'Deactivating...' : 'Deactivate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE ACCOUNT MODAL */}
      {/* ========================================================================= */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/50 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Delete Account Permanently</h3>
                  <p className="text-[11px] text-rose-500 font-semibold">Irreversible Action</p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs leading-relaxed">
              <strong>Warning:</strong> Deleting your account will immediately and permanently erase all your yaps, followers, bookmarks, likes, and profile information. This cannot be undone.
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              {/* Password Confirmation */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Enter your current password:
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    placeholder="Current password"
                    className="w-full py-2 px-3 pr-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showDeletePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirmation Text input */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Type <span className="font-mono text-rose-600 select-all font-black">&quot;CONFIRM DELETE&quot;</span> below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="CONFIRM DELETE"
                  className="w-full py-2 px-3 rounded-xl text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'CONFIRM DELETE'}
                  className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
