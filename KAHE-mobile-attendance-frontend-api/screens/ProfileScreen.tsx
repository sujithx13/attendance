import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { getDepartments, getMyProfile, updateProfile, type AuthSession, type Department, type UserProfile } from "../lib/api";
import { colors, iconName, getErrorMessage } from "../theme";
import { styles } from "../styles";
import { ConfirmModal, Back } from "../components/ui";


export function ProfileScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState("");
  const isStudent = auth.user.role === "STUDENT";

  useEffect(() => {
    Promise.all([getMyProfile(auth.token), getDepartments(auth.token)])
      .then(([pRes, dRes]) => {
        const p = pRes.user;
        setProfile(p);
        setName(p.fullName);
        setSelectedDeptId(p.departmentId || "");
        setSelectedYear(p.yearOfStudy || 1);
        setDepartments(dRes.departments || []);
      })
      .catch(() => {});
  }, [auth.token]);

  const executeSave = async () => {
    setShowConfirm(false);
    setSaving(true);
    setSuccess("");
    try {
      await updateProfile(auth.token, {
        fullName: name,
        departmentId: selectedDeptId,
        yearOfStudy: isStudent ? selectedYear : undefined
      });
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              fullName: name,
              departmentId: selectedDeptId,
              yearOfStudy: isStudent ? selectedYear : prev.yearOfStudy
            }
          : null
      );
      setSuccess("Profile settings saved successfully!");
      setIsEditing(false);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setName(profile.fullName);
      setSelectedDeptId(profile.departmentId || "");
      setSelectedYear(profile.yearOfStudy || 1);
    }
    setIsEditing(false);
  };

  const currentDept = departments.find((d) => d.id === (profile?.departmentId || selectedDeptId));
  const initials = (profile?.fullName || auth.user.fullName)
    ? (profile?.fullName || auth.user.fullName)
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "KA";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <View style={styles.screenHeader}>
        <Text style={styles.screenKicker}>MEMBERSHIP RECORD</Text>
        <Text style={styles.screenTitle}>My Profile</Text>
        <Text style={styles.screenLead}>Official institutional credentials, academic cohort, and registered information.</Text>
      </View>

      {success ? (
        <View style={[styles.successBanner, { marginBottom: 16 }]}>
          <MaterialCommunityIcons name={iconName("check-circle")} size={16} color={colors.primary} />
          <Text style={styles.successBannerText}>{success}</Text>
        </View>
      ) : null}

      {!isEditing ? (
        /* VIEW MODE: Institutional Information Card */
        <View style={styles.profileViewCard}>
          {/* Avatar Hero Header */}
          <View style={styles.profileHeroRow}>
            <View style={styles.profileAvatarLarge}>
              <Text style={styles.profileAvatarLargeText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileNameDisplay}>{profile?.fullName || auth.user.fullName}</Text>
              <View style={styles.profileRoleBadge}>
                <View style={styles.liveIndicatorDot} />
                <Text style={styles.profileRoleBadgeText}>
                  {isStudent ? "Undergraduate Student" : "Faculty Mentor / Staff"}
                </Text>
              </View>
            </View>
          </View>

          {/* Details Table */}
          <View style={styles.profileDivider} />

          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>University email</Text>
            <Text style={styles.profileInfoValue}>{profile?.email || "Registered Institutional Account"}</Text>
          </View>

          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>ENROLLMENT / STAFF ID</Text>
            <Text style={styles.profileInfoValue}>{profile?.enrollmentId || auth.user.id}</Text>
          </View>

          <View style={styles.profileInfoRow}>
            <Text style={styles.profileInfoLabel}>ACADEMIC DEPARTMENT</Text>
            <Text style={styles.profileInfoValue}>
              {currentDept ? `${currentDept.code} - ${currentDept.name}` : "General Engineering"}
            </Text>
          </View>

          {isStudent ? (
            <View style={styles.profileInfoRow}>
              <Text style={styles.profileInfoLabel}>YEAR OF STUDY</Text>
              <Text style={styles.profileInfoValue}>Year {profile?.yearOfStudy || selectedYear}</Text>
            </View>
          ) : null}

          <View style={[styles.profileInfoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.profileInfoLabel}>ACCOUNT STATUS</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
              <MaterialCommunityIcons name={iconName("shield-check")} size={14} color={colors.primaryLight} />
              <Text style={[styles.profileInfoValue, { color: colors.primary, marginTop: 0 }]}>
                Active Institutional Scholar
              </Text>
            </View>
          </View>

          {/* Edit Profile Button */}
          <Pressable
            onPress={() => {
              setSuccess("");
              setIsEditing(true);
            }}
            style={({ pressed }) => [styles.editProfileButton, pressed && styles.pressedState]}
          >
            <MaterialCommunityIcons name={iconName("account-edit-outline")} size={18} color="#FFFFFF" />
            <Text style={styles.editProfileButtonText}>Edit Profile Information</Text>
          </Pressable>
        </View>
      ) : (
        /* EDIT MODE: Interactive Form */
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={colors.textSubtle}
            style={styles.textInputSimple}
          />

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>ACADEMIC DEPARTMENT</Text>
          <View style={styles.deptChipGrid}>
            {departments.map((d) => {
              const active = selectedDeptId === d.id;
              return (
                <Pressable
                  key={d.id}
                  onPress={() => setSelectedDeptId(d.id)}
                  style={[styles.deptChip, active && styles.deptChipActive]}
                >
                  <Text style={[styles.deptChipText, active && styles.deptChipTextActive]}>
                    {d.code} - {d.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {isStudent ? (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>YEAR OF STUDY</Text>
              <View style={styles.durationRow}>
                {[1, 2, 3, 4].map((yr) => {
                  const active = selectedYear === yr;
                  return (
                    <Pressable
                      key={yr}
                      onPress={() => setSelectedYear(yr)}
                      style={[styles.durationButton, active && styles.durationButtonActive]}
                    >
                      <Text style={[styles.durationButtonText, active && styles.durationButtonTextActive]}>
                        Year {yr}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Edit Actions: Cancel + Save */}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            <Pressable
              onPress={handleCancelEdit}
              disabled={saving}
              style={({ pressed }) => [styles.confirmButtonSecondary, pressed && styles.pressedState]}
            >
              <Text style={styles.confirmButtonSecondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowConfirm(true)}
              disabled={saving}
              style={({ pressed }) => [
                styles.confirmButtonPrimary,
                { backgroundColor: colors.primary },
                pressed && styles.pressedState
              ]}
            >
              <Text style={styles.confirmButtonPrimaryText}>{saving ? "Saving…" : "Save Changes"}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ConfirmModal
        visible={showConfirm}
        title="Update Profile?"
        message="Save your updated department and profile information?"
        confirmText="Yes, Save"
        cancelText="Cancel"
        onConfirm={executeSave}
        onCancel={() => setShowConfirm(false)}
      />
    </ScrollView>
  );
}
