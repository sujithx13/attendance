import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { getMyProfile, type AuthSession, type UserProfile } from '../lib/api';
import { styles } from '../styles';
import { colors, iconName } from '../theme';
import { Action, Back } from '../components/ui';

export function ProfileScreen({ auth, onBack, onSignOut }: { auth: AuthSession; onBack: () => void; onSignOut: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void getMyProfile(auth.token)
      .then((r) => setProfile(r.user))
      .catch(() => setError('Could not load profile. Your sign-in is still saved.'));
  }, [auth.token]);

  const displayName = profile?.fullName || auth.user.fullName;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'KA';
  const isFaculty = auth.user.role.toLowerCase().includes('prof') || auth.user.role.toLowerCase().includes('faculty');

  const details: Array<[string, string | number | undefined]> = [
    ['EMAIL', profile?.email],
    ['REGISTER NUMBER', profile?.enrollmentId],
    ['DEPARTMENT', profile?.departmentName || profile?.departmentCode],
    ['YEAR', profile?.yearOfStudy],
    ['PHONE', profile?.phoneNumber]
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
      <Back onPress={onBack} />
      <View style={styles.screenHeader}>
        <Text style={styles.screenKicker}>ACCOUNT</Text>
        <Text style={styles.screenTitle}>Profile</Text>
      </View>

      {!!error && (
        <View style={[styles.errorBanner, { marginTop: 0, marginBottom: 14 }]} accessibilityRole="alert">
          <MaterialCommunityIcons name={iconName('alert-circle')} size={16} color={colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <View style={styles.profileViewCard}>
        <View style={styles.profileHeroRow}>
          <View style={styles.profileAvatarLarge}>
            <Text style={styles.profileAvatarLargeText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileNameDisplay}>{displayName}</Text>
            <View style={styles.profileRoleBadge}>
              <MaterialCommunityIcons
                name={iconName(isFaculty ? 'card-account-details-outline' : 'account-school')}
                size={13}
                color={colors.primary}
              />
              <Text style={styles.profileRoleBadgeText}>{isFaculty ? 'Faculty' : 'Student'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.profileDivider} />

        {details.map(([label, value]) => (
          <View key={label} style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>{label}</Text>
            <Text style={styles.profileInfoValue}>{value || '—'}</Text>
          </View>
        ))}

        <Text style={[styles.screenLead, { marginTop: 14 }]}>
          Profile details are managed by your institution administrator.
        </Text>
      </View>

      <View style={{ marginTop: 16 }}>
        <Action kind="danger" onPress={onSignOut}>
          <MaterialCommunityIcons name={iconName('logout')} size={18} color="#FFFFFF" />
          <Text style={styles.actionPrimaryText}>Sign out</Text>
        </Action>
      </View>
    </ScrollView>
  );
}
