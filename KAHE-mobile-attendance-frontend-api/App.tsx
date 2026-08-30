import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as Sharing from "expo-sharing";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useEffect, useState } from "react";
import {
  AttendanceApiError,
  getMySummary,
  getStudentQr,
  getFacultyQrExport,
  submitProfessorScan,
  getDepartments,
  getMyProfile,
  updateProfile,
  getMyBatches,
  getMyTimetable,
  launchSlotSession,
  login,
  getApiBaseUrl,
  setCustomApiBaseUrl,
  submitAttendanceAttempt,
  type AnalyticsResponse,
  type AuthSession,
  type StudentQr,
  type Department,
  type UserProfile,
  type MobileBatch,
  type MobileTimetableSlot
} from "./lib/api";
import { getTabs, type Role, type Screen } from "./lib/navigation";

// Modern University Theme Palette
const colors = {
  primary: "#0D631B", // Karpagam Emerald
  primaryLight: "#16A34A",
  primarySoft: "#ECFDF5",
  primaryBorder: "#A7F3D0",
  secondary: "#0284C7",
  secondarySoft: "#E0F2FE",
  amber: "#D97706",
  amberSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  bg: "#F8FAFC", // Clean Slate 50 Canvas
  card: "#FFFFFF",
  cardSubtle: "#F1F5F9",
  text: "#0F172A", // Deep Slate 900
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  border: "#E2E8F0",
  borderSubtle: "#F1F5F9",
  overlay: "rgba(15, 23, 42, 0.65)"
};

const activeSessionId = "sess_cs101_active";
const iconName = (name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]) => name;

function getErrorMessage(error: unknown) {
  return error instanceof AttendanceApiError ? error.message : "The attendance service could not complete that request.";
}

function formatAmPm(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  let hours = parseInt(parts[0], 10);
  if (isNaN(hours)) return timeStr;
  const minutes = parts[1] ? parts[1].slice(0, 2) : "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
}

const WEEK_DAYS = [
  { day: 1, name: "Mon", full: "Monday" },
  { day: 2, name: "Tue", full: "Tuesday" },
  { day: 3, name: "Wed", full: "Wednesday" },
  { day: 4, name: "Thu", full: "Thursday" },
  { day: 5, name: "Fri", full: "Friday" },
  { day: 6, name: "Sat", full: "Saturday" }
];

// Reusable Confirmation Popup Modal
function ConfirmModal({
  visible,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.confirmCard}>
          <View
            style={[
              styles.confirmIconBubble,
              { backgroundColor: isDestructive ? colors.dangerSoft : colors.primarySoft }
            ]}
          >
            <MaterialCommunityIcons
              name={iconName(isDestructive ? "alert-circle-outline" : "help-circle-outline")}
              size={28}
              color={isDestructive ? colors.danger : colors.primary}
            />
          </View>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <View style={styles.confirmActionsRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.confirmButtonSecondary, pressed && styles.pressedState]}
            >
              <Text style={styles.confirmButtonSecondaryText}>{cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButtonPrimary,
                { backgroundColor: isDestructive ? colors.danger : colors.primary },
                pressed && styles.pressedState
              ]}
            >
              <Text style={styles.confirmButtonPrimaryText}>{confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Reusable Success/Result Popup Modal
function ResultModal({
  visible,
  title,
  message,
  badgeText = "VERIFIED PRESENT",
  onClose
}: {
  visible: boolean;
  title: string;
  message: string;
  badgeText?: string;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.resultCard}>
          <View style={styles.resultSuccessBubble}>
            <MaterialCommunityIcons name={iconName("check-circle")} size={42} color={colors.primaryLight} />
          </View>
          <View style={styles.resultBadge}>
            <Text style={styles.resultBadgeText}>{badgeText}</Text>
          </View>
          <Text style={styles.resultTitle}>{title}</Text>
          <Text style={styles.resultMessage}>{message}</Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.resultDoneButton, pressed && styles.pressedState]}
          >
            <Text style={styles.resultDoneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Action Button Component
function Action({
  children,
  onPress,
  kind = "primary",
  disabled = false
}: {
  children: React.ReactNode;
  onPress: () => void;
  kind?: "primary" | "secondary" | "plain" | "danger";
  disabled?: boolean;
}) {
  const getStyle = (pressed: boolean) => {
    if (kind === "plain") return [styles.actionPlain, pressed && styles.pressedState];
    if (kind === "secondary") return [styles.actionSecondary, pressed && styles.pressedState];
    if (kind === "danger") return [styles.actionDanger, pressed && styles.pressedState];
    return [styles.actionPrimary, disabled && styles.actionDisabled, pressed && styles.pressedState];
  };

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => getStyle(pressed)}>
      {children}
    </Pressable>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Action kind="plain" onPress={onPress}>
      <MaterialCommunityIcons name={iconName("arrow-left")} size={20} color={colors.primary} />
      <Text style={styles.backText}>Back</Text>
    </Action>
  );
}

// ROOT APPLICATION
export default function App() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Active Class-Specific QR Modals State
  const [studentQrSlot, setStudentQrSlot] = useState<MobileTimetableSlot | null>(null);
  const [facultyQrSlot, setFacultyQrSlot] = useState<MobileTimetableSlot | null>(null);

  if (!auth) return <LoginScreen onAuthenticated={setAuth} />;

  const role: Role =
    auth.user.role.toLowerCase().includes("prof") || auth.user.role.toLowerCase().includes("faculty")
      ? "faculty"
      : "student";

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.frame}>
        <Header
          name={auth.user.fullName}
          role={role}
          onOpenProfile={() => setScreen("profile")}
          onSignOut={() => setShowSignOutConfirm(true)}
        />

        {screen === "home" && (
          <Home
            role={role}
            auth={auth}
            onNavigate={setScreen}
            onOpenStudentQr={(slot) => setStudentQrSlot(slot)}
            onOpenFacultyQr={(slot) => setFacultyQrSlot(slot)}
          />
        )}

        {screen === "timetable" && (
          <TimetableScreen
            auth={auth}
            role={role}
            onNavigate={setScreen}
            onOpenStudentQr={(slot) => setStudentQrSlot(slot)}
            onOpenFacultyQr={(slot) => setFacultyQrSlot(slot)}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "scanner" && (
          <UniversalScanner
            auth={auth}
            role={role}
            onBack={() => setScreen("home")}
          />
        )}

        {screen === "profile" && <ProfileScreen auth={auth} onBack={() => setScreen("home")} />}

        <Dock role={role} screen={screen} onNavigate={setScreen} />

        {/* Student Class-Specific QR Pass Modal */}
        {studentQrSlot && (
          <StudentClassQrModal
            auth={auth}
            slot={studentQrSlot}
            visible={Boolean(studentQrSlot)}
            onClose={() => setStudentQrSlot(null)}
          />
        )}

        {/* Faculty Live Classroom QR Broadcast Modal */}
        {facultyQrSlot && (
          <FacultyClassQrModal
            auth={auth}
            slot={facultyQrSlot}
            visible={Boolean(facultyQrSlot)}
            onClose={() => setFacultyQrSlot(null)}
          />
        )}

        {/* Sign Out Confirmation Modal */}
        <ConfirmModal
          visible={showSignOutConfirm}
          title="Sign Out"
          message="Are you sure you want to sign out of Karpagam University attendance portal?"
          confirmText="Yes, Sign Out"
          cancelText="Stay Logged In"
          isDestructive={true}
          onConfirm={() => {
            setShowSignOutConfirm(false);
            setAuth(null);
            setScreen("home");
          }}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      </View>
    </SafeAreaView>
  );
}

// LOGIN SCREEN
function LoginScreen({ onAuthenticated }: { onAuthenticated: (auth: AuthSession) => void }) {
  const [email, setEmail] = useState("student.john@university.edu");
  const [password, setPassword] = useState("password123");
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [roleType, setRoleType] = useState<"student" | "faculty">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (role: "student" | "faculty") => {
    setRoleType(role);
    setError("");
    if (role === "student") {
      setEmail("student.john@university.edu");
      setPassword("password123");
    } else {
      setEmail("prof.alan@university.edu");
      setPassword("password123");
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      if (serverUrl.trim()) setCustomApiBaseUrl(serverUrl.trim());
      const session = await login(email.trim(), password);
      onAuthenticated(session);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginContainer} showsVerticalScrollIndicator={false}>
        {/* University Crest Header */}
        <View style={styles.loginHeader}>
          <View style={styles.crestCircle}>
            <MaterialCommunityIcons name={iconName("school")} size={32} color={colors.primary} />
          </View>
          <Text style={styles.universityKicker}>KARPAGAM ACADEMY OF HIGHER EDUCATION</Text>
          <Text style={styles.loginMainTitle}>Campus Attendance Portal</Text>
          <Text style={styles.loginSubtitle}>
            Secure biometric & cryptographic attendance check-in for students and faculty.
          </Text>
        </View>

        {/* Role Toggle Selector */}
        <View style={styles.roleToggleContainer}>
          <Pressable
            onPress={() => handleRoleSelect("student")}
            style={[styles.roleToggleButton, roleType === "student" && styles.roleToggleActive]}
          >
            <MaterialCommunityIcons
              name={iconName("account-school")}
              size={18}
              color={roleType === "student" ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.roleToggleText, roleType === "student" && styles.roleToggleTextActive]}>
              Student Pass
            </Text>
          </Pressable>

          <Pressable
            onPress={() => handleRoleSelect("faculty")}
            style={[styles.roleToggleButton, roleType === "faculty" && styles.roleToggleActive]}
          >
            <MaterialCommunityIcons
              name={iconName("card-account-details-outline")}
              size={18}
              color={roleType === "faculty" ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.roleToggleText, roleType === "faculty" && styles.roleToggleTextActive]}>
              Faculty Staff
            </Text>
          </Pressable>
        </View>

        {/* Login Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>INSTITUTIONAL EMAIL</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={iconName("email-outline")} size={18} color={colors.textSubtle} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="e.g. yourname@university.edu"
              placeholderTextColor={colors.textSubtle}
              style={styles.textInput}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>PORTAL PASSWORD</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={iconName("lock-outline")} size={18} color={colors.textSubtle} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter password"
              placeholderTextColor={colors.textSubtle}
              style={styles.textInput}
            />
          </View>

          {/* Server Config Toggle */}
          <Pressable
            onPress={() => setShowServerConfig(!showServerConfig)}
            style={styles.serverConfigToggle}
          >
            <MaterialCommunityIcons
              name={iconName(showServerConfig ? "chevron-up" : "cog-outline")}
              size={14}
              color={colors.primary}
            />
            <Text style={styles.serverConfigText}>
              {showServerConfig ? "Hide server endpoint" : "Change backend API endpoint"}
            </Text>
          </Pressable>

          {showServerConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.fieldLabel}>API SERVER URL</Text>
              <TextInput
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                placeholder="http://192.168.1.34:4000"
                placeholderTextColor={colors.textSubtle}
                style={styles.textInputSimple}
              />
            </View>
          )}

          {error ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name={iconName("alert-circle")} size={16} color={colors.danger} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </View>
          ) : null}

          <View style={{ marginTop: 20 }}>
            <Action onPress={handleLogin} disabled={loading}>
              <Text style={styles.actionPrimaryText}>
                {loading ? "Authenticating Session…" : "Sign In to Portal"}
              </Text>
              <MaterialCommunityIcons name={iconName("arrow-right")} size={18} color="#FFFFFF" />
            </Action>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// HEADER BAR
function Header({
  name,
  role,
  onOpenProfile,
  onSignOut
}: {
  name: string;
  role: Role;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "KA";

  return (
    <View style={styles.headerBar}>
      <View style={styles.headerLeft}>
        <Pressable onPress={onOpenProfile} style={styles.avatarBubble}>
          <Text style={styles.avatarText}>{initials}</Text>
        </Pressable>
        <View>
          <Text style={styles.headerGreeting}>{name}</Text>
          <View style={styles.headerRolePill}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.headerRoleText}>
              {role === "faculty" ? "Faculty Mentor" : "Undergraduate Student"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
        <Pressable onPress={onOpenProfile} style={styles.headerIconBtn}>
          <MaterialCommunityIcons name={iconName("account-cog-outline")} size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={onSignOut} style={[styles.headerIconBtn, { backgroundColor: colors.dangerSoft }]}>
          <MaterialCommunityIcons name={iconName("logout")} size={18} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

// HOME SCREEN
function Home({
  role,
  auth,
  onNavigate,
  onOpenStudentQr,
  onOpenFacultyQr
}: {
  role: Role;
  auth: AuthSession;
  onNavigate: (screen: Screen) => void;
  onOpenStudentQr: (slot: MobileTimetableSlot) => void;
  onOpenFacultyQr: (slot: MobileTimetableSlot) => void;
}) {
  const firstName = auth.user.fullName.split(" ")[0] || "Scholar";
  const student = role === "student";
  const [batches, setBatches] = useState<MobileBatch[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<MobileTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMyBatches(auth.token), getMyTimetable(auth.token)])
      .then(([batchRes, timeRes]) => {
        setBatches(batchRes.batches || []);
        setTimetableSlots(timeRes.slots || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [auth.token]);

  const todayNum = new Date().getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
  const todaySlots = timetableSlots.filter((s) => s.dayOfWeek === todayNum);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Hero Banner Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroDecorationOne} />
        <View style={styles.heroDecorationTwo} />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTagPill}>
            <MaterialCommunityIcons
              name={iconName("shield-check")}
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.heroTagText}>
              {student ? "STUDENT ATTENDANCE" : "FACULTY ATTENDANCE"}
            </Text>
          </View>
          <Text style={styles.heroDateText}>
            {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Text>
        </View>

        <Text style={styles.heroTitle}>
          Welcome back,{"\n"}
          <Text style={styles.heroEmphasis}>{firstName}</Text>
        </Text>
        <Text style={styles.heroLead}>
          {student
            ? "Tap on any class session to generate your attendance QR, or open the scanner to check in."
            : "Tap on any lecture to broadcast its live attendance QR, or scan students directly."}
        </Text>

        <Pressable
          onPress={() => onNavigate("scanner")}
          style={({ pressed }) => [styles.heroActionPill, pressed && styles.pressedState]}
        >
          <MaterialCommunityIcons
            name={iconName("qrcode-scan")}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.heroActionText}>
            {student ? "Scan Classroom QR" : "Open Universal Scanner"}
          </Text>
          <MaterialCommunityIcons name={iconName("arrow-right")} size={16} color={colors.primary} />
        </Pressable>
      </View>

      {/* Today's Schedule Quick Spotlight */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionKicker}>TIMETABLE SNAPSHOT</Text>
          <Text style={styles.sectionHeading}>Today's Schedule</Text>
        </View>
        <Pressable onPress={() => onNavigate("timetable")} style={styles.seeAllLink}>
          <Text style={styles.seeAllText}>Full Week</Text>
          <MaterialCommunityIcons name={iconName("chevron-right")} size={15} color={colors.primary} />
        </Pressable>
      </View>

      {todaySlots.length === 0 ? (
        <View style={styles.emptyCardCompact}>
          <MaterialCommunityIcons name={iconName("calendar-check")} size={22} color={colors.textSubtle} />
          <Text style={styles.emptyCardTitleCompact}>
            {todayNum === 0 ? "Sunday Holiday • No Classes Scheduled" : "No Classes Scheduled for Today"}
          </Text>
          <Pressable onPress={() => onNavigate("timetable")} style={styles.emptyCardLink}>
            <Text style={styles.emptyCardLinkText}>
              {todayNum === 0 ? "View Monday & Full Week Schedule →" : "View Full Week Timetable →"}
            </Text>
          </Pressable>
        </View>
      ) : (
        todaySlots.slice(0, 3).map((slot) => (
          <Pressable
            key={slot.id}
            onPress={() => (student ? onOpenStudentQr(slot) : onOpenFacultyQr(slot))}
            style={({ pressed }) => [styles.compactSlotCard, pressed && styles.pressedState]}
          >
            <View style={styles.compactSlotHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.batchCodePillCompact}>
                  <Text style={styles.batchCodePillCompactText}>{slot.batchCode || slot.courseCode || "CLASS"}</Text>
                </View>
                <Text style={styles.compactSlotTitle}>{slot.batchName || slot.courseName || "Lecture"}</Text>
              </View>
              <View style={styles.timeTagCompact}>
                <MaterialCommunityIcons name={iconName("clock-outline")} size={11} color={colors.primary} />
                <Text style={styles.timeTagCompactText}>
                  {formatAmPm(slot.startTime)} – {formatAmPm(slot.endTime)}
                </Text>
              </View>
            </View>

            <View style={styles.compactSlotMetaRow}>
              <View style={styles.compactSlotMetaItem}>
                <MaterialCommunityIcons name={iconName("map-marker-outline")} size={13} color={colors.textMuted} />
                <Text style={styles.compactSlotMetaText}>{slot.classroomName || "Classroom"}</Text>
              </View>
              <View style={styles.compactSlotMetaItem}>
                <MaterialCommunityIcons name={iconName("account-tie-outline")} size={13} color={colors.textMuted} />
                <Text style={styles.compactSlotMetaText}>{slot.professorName || "Faculty"}</Text>
              </View>
              <Text style={{ marginLeft: "auto", fontSize: 11, fontWeight: "700", color: colors.primary }}>
                {student ? "Show QR Pass →" : "Broadcast QR →"}
              </Text>
            </View>
          </Pressable>
        ))
      )}

      {/* Enrolled Academic Batches */}
      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionKicker}>ACADEMIC COHORTS</Text>
          <Text style={styles.sectionHeading}>{student ? "My Enrolled Batches" : "My Mentored Batches"}</Text>
        </View>
        <View style={styles.counterBadgeCompact}>
          <Text style={styles.counterBadgeCompactText}>{batches.length} Active</Text>
        </View>
      </View>

      {batches.length === 0 ? (
        <View style={styles.emptyCardCompact}>
          <MaterialCommunityIcons name={iconName("account-group-outline")} size={22} color={colors.textSubtle} />
          <Text style={styles.emptyCardTitleCompact}>No Cohorts Assigned Yet</Text>
        </View>
      ) : (
        batches.map((b) => (
          <View key={b.id} style={styles.compactBatchCard}>
            <View style={styles.compactBatchTop}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.batchCodePillCompact}>
                  <Text style={styles.batchCodePillCompactText}>{b.code}</Text>
                </View>
                <Text style={styles.compactBatchTitle}>{b.name}</Text>
              </View>
              <Text style={styles.compactBatchMembers}>
                {b.memberCount !== undefined ? `${b.memberCount} Enrolled` : "Active"}
              </Text>
            </View>
            {b.description ? (
              <Text style={styles.compactBatchDesc} numberOfLines={2}>
                {b.description}
              </Text>
            ) : null}
          </View>
        ))
      )}

      {/* Quick Action Shortcuts Grid */}
      <Text style={[styles.sectionKicker, { marginTop: 24 }]}>PORTAL UTILITIES</Text>
      <Text style={styles.sectionHeading}>Quick Services</Text>

      <View style={styles.shortcutGrid}>
        <ShortcutCard
          icon="calendar-clock"
          title="Weekly Timetable"
          subtitle="Class schedule"
          color={colors.primary}
          onPress={() => onNavigate("timetable")}
        />
        <ShortcutCard
          icon="qrcode-scan"
          title="Universal Scanner"
          subtitle="Scan class or pass"
          color={colors.secondary}
          onPress={() => onNavigate("scanner")}
        />
        <ShortcutCard
          icon="account-cog"
          title="My Profile"
          subtitle="Dept & Settings"
          color="#8B5CF6"
          onPress={() => onNavigate("profile")}
        />
      </View>
    </ScrollView>
  );
}

function ShortcutCard({
  icon,
  title,
  subtitle,
  color,
  onPress
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shortcutCard, pressed && styles.pressedState]}>
      <View style={[styles.shortcutIconBubble, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

// TIMETABLE SCREEN (Mon-Sat Day Picker + Tap any Slot to Generate QR / Broadcast QR)
function TimetableScreen({
  auth,
  role,
  onNavigate,
  onOpenStudentQr,
  onOpenFacultyQr,
  onBack
}: {
  auth: AuthSession;
  role: Role;
  onNavigate: (screen: Screen) => void;
  onOpenStudentQr: (slot: MobileTimetableSlot) => void;
  onOpenFacultyQr: (slot: MobileTimetableSlot) => void;
  onBack: () => void;
}) {
  const currentDayNum = new Date().getDay();
  const initialDay = currentDayNum >= 1 && currentDayNum <= 6 ? currentDayNum : 1;
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [slots, setSlots] = useState<MobileTimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    getMyTimetable(auth.token)
      .then((res) => setSlots(res.slots || []))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [auth.token]);

  const filteredSlots = slots.filter((s) => s.dayOfWeek === selectedDay);
  const isFaculty = role === "faculty";

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <View style={styles.screenHeader}>
        <Text style={styles.screenKicker}>{isFaculty ? "TEACHING MATRIX" : "COHORT TIMETABLE"}</Text>
        <Text style={styles.screenTitle}>Weekly Class Schedule</Text>
        <Text style={styles.screenLead}>
          {isFaculty
            ? "Tap on any class session to broadcast its live attendance QR code for students to scan."
            : "Tap on any class session to generate your digital attendance QR pass for that lecture."}
        </Text>
      </View>

      {/* Segmented Day Selector */}
      <View style={styles.daySelectorBar}>
        {WEEK_DAYS.map((d) => {
          const active = selectedDay === d.day;
          const isToday = currentDayNum === d.day;
          return (
            <Pressable
              key={d.day}
              onPress={() => setSelectedDay(d.day)}
              style={[styles.dayButton, active && styles.dayButtonActive]}
            >
              <Text style={[styles.dayButtonText, active && styles.dayButtonTextActive]}>{d.name}</Text>
              {isToday ? (
                <View style={[styles.todayIndicator, active && styles.todayIndicatorActive]}>
                  <Text style={[styles.todayIndicatorText, active && styles.todayIndicatorTextActive]}>
                    Today
                  </Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {loading && (
        <View style={styles.loadingBox}>
          <MaterialCommunityIcons name={iconName("loading")} size={24} color={colors.primary} />
          <Text style={styles.loadingText}>Loading schedule…</Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name={iconName("alert-circle")} size={16} color={colors.danger} />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      ) : null}

      {!loading && filteredSlots.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name={iconName("calendar-blank-outline")} size={36} color={colors.textSubtle} />
          <Text style={styles.emptyCardTitle}>
            No Classes on {WEEK_DAYS.find((d) => d.day === selectedDay)?.full}
          </Text>
          <Text style={styles.emptyCardSub}>
            {isFaculty
              ? "You have no teaching lectures scheduled on this day."
              : "No classes scheduled for your enrolled batches on this day."}
          </Text>
        </View>
      ) : null}

      {filteredSlots.map((slot) => {
        const batchTitle = slot.batchName || slot.courseName || "Academic Lecture";
        const batchCode = slot.batchCode || slot.courseCode || "BATCH";
        const room = slot.classroomName || "Classroom";
        const prof = slot.professorName || "Faculty Mentor";

        return (
          <View key={slot.id} style={styles.timetableCard}>
            <View style={styles.timetableCardTop}>
              <View style={styles.batchCodePill}>
                <Text style={styles.batchCodePillText}>{batchCode}</Text>
              </View>
              <View style={styles.timeTag}>
                <MaterialCommunityIcons name={iconName("clock-outline")} size={13} color={colors.primary} />
                <Text style={styles.timeTagText}>
                  {formatAmPm(slot.startTime)} – {formatAmPm(slot.endTime)}
                </Text>
              </View>
            </View>

            <Text style={styles.timetableCardTitle}>{batchTitle}</Text>

            <View style={styles.timetableMetaRow}>
              <View style={styles.timetableMetaItem}>
                <MaterialCommunityIcons name={iconName("map-marker-outline")} size={15} color={colors.textMuted} />
                <Text style={styles.timetableMetaText}>{room}</Text>
              </View>
              <View style={styles.timetableMetaItem}>
                <MaterialCommunityIcons name={iconName("account-tie-outline")} size={15} color={colors.textMuted} />
                <Text style={styles.timetableMetaText}>{prof}</Text>
              </View>
            </View>

            {isFaculty ? (
              <Pressable
                onPress={() => onOpenFacultyQr(slot)}
                style={({ pressed }) => [styles.slotActionButton, pressed && styles.pressedState]}
              >
                <MaterialCommunityIcons name={iconName("presentation-play")} size={16} color="#FFFFFF" />
                <Text style={styles.slotActionButtonText}>Broadcast Live Class QR</Text>
              </Pressable>
            ) : (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => onOpenStudentQr(slot)}
                  style={({ pressed }) => [
                    styles.slotActionButton,
                    { flex: 1, backgroundColor: colors.primary },
                    pressed && styles.pressedState
                  ]}
                >
                  <MaterialCommunityIcons name={iconName("qrcode")} size={16} color="#FFFFFF" />
                  <Text style={styles.slotActionButtonText}>Show My Class QR Pass</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

// STUDENT CLASS-SPECIFIC QR MODAL (Generates QR specifically for this class session)
function StudentClassQrModal({
  auth,
  slot,
  visible,
  onClose
}: {
  auth: AuthSession;
  slot: MobileTimetableSlot;
  visible: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<StudentQr | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sessionId = slot.id || activeSessionId;

  const refreshQr = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getStudentQr(auth.token, sessionId);
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      refreshQr();
    }
  }, [visible, slot.id]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.passModalCard}>
          {/* Header */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <View>
              <Text style={styles.screenKicker}>STUDENT ATTENDANCE PASS</Text>
              <Text style={styles.passModalTitle}>{slot.batchName || slot.courseName || "Class Session"}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.headerIconBtn}>
              <MaterialCommunityIcons name={iconName("close")} size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.passDetailsRow}>
            <View style={styles.batchCodePillCompact}>
              <Text style={styles.batchCodePillCompactText}>{slot.batchCode || slot.courseCode || "CLASS"}</Text>
            </View>
            <Text style={styles.passTimeText}>
              {formatAmPm(slot.startTime)} – {formatAmPm(slot.endTime)}
            </Text>
          </View>

          {loading ? (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.loadingText}>Generating secure pass…</Text>
            </View>
          ) : data ? (
            <View style={styles.qrContainer}>
              <Image source={{ uri: data.dataUrl }} style={styles.qrImage} />
              <Text style={styles.qrExpText}>Rotating token • Valid for {data.expiresInSeconds}s</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorBannerText}>{error}</Text> : null}

          <Text style={styles.passInstructions}>
            Present this QR to your professor. When scanned, you will be recorded as PRESENT for this session.
          </Text>

          <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 14 }}>
            <Pressable
              onPress={refreshQr}
              disabled={loading}
              style={({ pressed }) => [styles.confirmButtonSecondary, pressed && styles.pressedState]}
            >
              <Text style={styles.confirmButtonSecondaryText}>Refresh Token</Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.confirmButtonPrimary,
                { backgroundColor: colors.primary },
                pressed && styles.pressedState
              ]}
            >
              <Text style={styles.confirmButtonPrimaryText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// FACULTY LIVE CLASSROOM QR BROADCAST MODAL
function FacultyClassQrModal({
  auth,
  slot,
  visible,
  onClose
}: {
  auth: AuthSession;
  slot: MobileTimetableSlot;
  visible: boolean;
  onClose: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(slot.id || activeSessionId);
  const [expiresInSeconds, setExpiresInSeconds] = useState(900);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const launchAndPrepare = async () => {
    setLoading(true);
    setNotice("");
    try {
      const launchRes = await launchSlotSession(auth.token, slot.id, slot.batchId);
      const targetSessionId = launchRes.sessionId || slot.id || activeSessionId;
      setSessionId(targetSessionId);

      const qrRes = await getFacultyQrExport(auth.token, targetSessionId, expiresInSeconds);
      setDataUrl(qrRes.dataUrl);
      setNotice(`Live QR active! Valid for ${Math.round(qrRes.expiresInSeconds / 60)} mins.`);
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      launchAndPrepare();
    }
  }, [visible, slot.id]);

  const exportPng = async () => {
    if (!dataUrl) return;
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;
    if (Platform.OS === "web") {
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = `kahe-attendance-qr-${sessionId}.png`;
      anchor.click();
      return;
    }
    const destination = `${FileSystem.cacheDirectory}kahe-attendance-qr-${sessionId}.png`;
    await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(destination, { mimeType: "image/png" });
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.passModalCard}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <View>
              <Text style={styles.screenKicker}>CLASSROOM LIVE BROADCAST</Text>
              <Text style={styles.passModalTitle}>{slot.batchName || slot.courseName || "Lecture Session"}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.headerIconBtn}>
              <MaterialCommunityIcons name={iconName("close")} size={18} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.passDetailsRow}>
            <View style={styles.batchCodePillCompact}>
              <Text style={styles.batchCodePillCompactText}>{slot.batchCode || slot.courseCode || "CLASS"}</Text>
            </View>
            <Text style={styles.passTimeText}>
              {formatAmPm(slot.startTime)} – {formatAmPm(slot.endTime)} • {slot.classroomName || "Classroom"}
            </Text>
          </View>

          {dataUrl ? (
            <View style={styles.qrPresentationBox}>
              <Image source={{ uri: dataUrl }} style={styles.qrImageLarge} />
              <Text style={styles.qrPresentationNotice}>{notice}</Text>
            </View>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.loadingText}>Activating lecture session & live QR…</Text>
            </View>
          )}

          {/* Validity Duration Selector */}
          <View style={[styles.durationRow, { width: "100%", marginTop: 8 }]}>
            {[300, 900, 3600].map((sec) => {
              const active = expiresInSeconds === sec;
              return (
                <Pressable
                  key={sec}
                  onPress={() => {
                    setExpiresInSeconds(sec);
                    launchAndPrepare();
                  }}
                  style={[styles.durationButton, active && styles.durationButtonActive]}
                >
                  <Text style={[styles.durationButtonText, active && styles.durationButtonTextActive]}>
                    {sec === 300 ? "5m" : sec === 900 ? "15m" : "1h"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 14 }}>
            {dataUrl ? (
              <Pressable
                onPress={exportPng}
                style={({ pressed }) => [styles.confirmButtonSecondary, pressed && styles.pressedState]}
              >
                <Text style={styles.confirmButtonSecondaryText}>Export PNG</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.confirmButtonPrimary,
                { backgroundColor: colors.primary },
                pressed && styles.pressedState
              ]}
            >
              <Text style={styles.confirmButtonPrimaryText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// UNIVERSAL SCANNER (Smart camera scanner for both Students & Teachers)
function UniversalScanner({
  auth,
  role,
  onBack
}: {
  auth: AuthSession;
  role: Role;
  onBack: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locPermission, setLocPermission] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [scanResult, setScanResult] = useState<{
    visible: boolean;
    title: string;
    message: string;
    badgeText?: string;
  } | null>(null);

  const isFaculty = role === "faculty";

  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status }) => {
      setLocPermission(status === "granted");
    });
  }, []);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      // Decode QR token type
      let qrTokenType: "SESSION_BROADCAST" | "STUDENT_PERSONAL" | null = null;
      let targetSessionId: string = activeSessionId;

      try {
        let base64 = data.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) base64 += "=";
        const jsonStr = typeof atob === "function" ? atob(base64) : "{}";
        const decoded = JSON.parse(jsonStr);
        qrTokenType = decoded.type;
        if (decoded.sessionId) targetSessionId = decoded.sessionId;
      } catch {}

      if (isFaculty) {
        // Professor is scanning
        if (qrTokenType === "SESSION_BROADCAST") {
          setError("This is a classroom broadcast QR code. Students should scan this.");
          setSubmitting(false);
          return;
        }

        const res = await submitProfessorScan(auth.token, targetSessionId, data);
        setScanResult({
          visible: true,
          title: `Marked PRESENT: ${res.studentName || "Student"}`,
          message: `Enrollment ID: ${res.enrollmentId || "Verified"}. Official attendance recorded.`,
          badgeText: res.decisionReason?.includes("out-of-batch")
            ? "PROFESSOR (OUT-OF-BATCH)"
            : "PROFESSOR VERIFIED"
        });
      } else {
        // Student is scanning
        if (qrTokenType === "STUDENT_PERSONAL") {
          setError("This is a student digital pass. Only a professor can scan this.");
          setSubmitting(false);
          return;
        }

        let coords: { latitude: number; longitude: number; accuracy: number } | undefined;
        if (locPermission) {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          coords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy || 10
          };
        }

        const res = await submitAttendanceAttempt(auth.token, {
          sessionId: targetSessionId,
          clientTimestamp: new Date().toISOString(),
          qrPayload: data,
          coordinates: coords || { latitude: 0, longitude: 0, accuracy: 10 },
          telemetry: { isFromMockProvider: false }
        });

        if (res.decision === "ACCEPT") {
          setScanResult({
            visible: true,
            title: "Attendance Recorded!",
            message: "Your attendance has been cryptographically verified and recorded as PRESENT.",
            badgeText: "VERIFIED PRESENT"
          });
        } else {
          setError(`Attempt challenged or flagged: ${res.decisionReason || res.decision}`);
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!permission?.granted) {
    return (
      <View style={styles.permissionScreen}>
        <MaterialCommunityIcons name={iconName("camera-off-outline")} size={48} color={colors.amber} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionLead}>
          Please allow camera permission to scan classroom QR codes and student digital passes.
        </Text>
        <Action onPress={requestPermission}>
          <Text style={styles.actionPrimaryText}>Grant Camera Permission</Text>
        </Action>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={submitting ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />
      <View style={styles.viewfinderOverlay}>
        <View style={styles.viewfinderHeader}>
          <Back onPress={onBack} />
        </View>
        <View style={styles.scanTargetBox}>
          <View style={[styles.cornerBracket, styles.cornerTopLeft]} />
          <View style={[styles.cornerBracket, styles.cornerTopRight]} />
          <View style={[styles.cornerBracket, styles.cornerBottomLeft]} />
          <View style={[styles.cornerBracket, styles.cornerBottomRight]} />
          <Text style={styles.scanInstructionText}>
            {submitting
              ? "Verifying Code…"
              : isFaculty
              ? "Scan Student Digital Pass"
              : "Scan Classroom Live QR Code"}
          </Text>
        </View>
        {error ? (
          <View style={styles.cameraErrorBanner}>
            <Text style={styles.cameraErrorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {scanResult && (
        <ResultModal
          visible={scanResult.visible}
          title={scanResult.title}
          message={scanResult.message}
          badgeText={scanResult.badgeText}
          onClose={() => {
            setScanResult(null);
            onBack();
          }}
        />
      )}
    </View>
  );
}

// PROFILE SCREEN (View Info Mode & Edit Mode)
function ProfileScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
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
            <Text style={styles.profileInfoLabel}>INSTITUTIONAL EMAIL</Text>
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

// BOTTOM DOCK NAVIGATION
function Dock({
  role,
  screen,
  onNavigate
}: {
  role: Role;
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <View style={styles.dockContainer}>
      <View style={styles.dockPill}>
        {getTabs(role).map((tab) => {
          const active = screen === tab.screen;
          return (
            <Pressable
              key={tab.screen}
              onPress={() => onNavigate(tab.screen)}
              style={({ pressed }) => [styles.dockItem, active && styles.dockItemActive, pressed && styles.pressedState]}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={20}
                color={active ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.dockLabel, active && styles.dockLabelActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// MODERN STYLES
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  frame: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  screen: { flex: 1 },
  screenContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 },
  pressedState: { opacity: 0.8, transform: [{ scale: 0.98 }] },

  // Header Bar
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.primaryBorder
  },
  avatarText: { fontSize: 14, fontWeight: "800", color: colors.primary },
  headerGreeting: { fontSize: 15, fontWeight: "800", color: colors.text },
  headerRolePill: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveIndicatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  headerRoleText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardSubtle,
    alignItems: "center",
    justifyContent: "center"
  },

  // Hero Card
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 22,
    position: "relative",
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6
  },
  heroDecorationOne: {
    position: "absolute",
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  heroDecorationTwo: {
    position: "absolute",
    right: 30,
    bottom: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.04)"
  },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  heroTagText: { fontSize: 9, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.6 },
  heroDateText: { fontSize: 11, color: "rgba(255, 255, 255, 0.8)", fontWeight: "600" },
  heroTitle: { fontSize: 24, fontWeight: "800", color: "#FFFFFF", marginTop: 14, lineHeight: 28 },
  heroEmphasis: { color: "#86EFAC" },
  heroLead: { fontSize: 13, color: "rgba(255, 255, 255, 0.85)", marginTop: 6, lineHeight: 18 },
  heroActionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 18
  },
  heroActionText: { fontSize: 13, fontWeight: "800", color: colors.primary },

  // Sections
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
    marginBottom: 10
  },
  sectionTitleBlock: {
    flexDirection: "column",
    alignItems: "flex-start"
  },
  sectionKicker: { fontSize: 9.5, fontWeight: "800", color: colors.primary, letterSpacing: 0.8, marginBottom: 2 },
  sectionHeading: { fontSize: 16, fontWeight: "800", color: colors.text },
  seeAllLink: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 2 },
  seeAllText: { fontSize: 12, fontWeight: "700", color: colors.primary },
  counterBadgeCompact: { backgroundColor: colors.primarySoft, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 5 },
  counterBadgeCompactText: { fontSize: 10.5, fontWeight: "800", color: colors.primary },

  // Compact Today's Schedule Card
  compactSlotCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3.5,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border
  },
  compactSlotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  batchCodePillCompact: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  batchCodePillCompactText: { fontSize: 10, fontWeight: "800", color: colors.primary },
  compactSlotTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  timeTagCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.cardSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5
  },
  timeTagCompactText: { fontSize: 10.5, fontWeight: "700", color: colors.text },
  compactSlotMetaRow: { flexDirection: "row", gap: 12, marginTop: 6, alignItems: "center" },
  compactSlotMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  compactSlotMetaText: { fontSize: 11, color: colors.textMuted },

  // Compact Batch Card
  compactBatchCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border
  },
  compactBatchTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  compactBatchTitle: { fontSize: 13.5, fontWeight: "700", color: colors.text },
  compactBatchMembers: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  compactBatchDesc: { fontSize: 11, color: colors.textMuted, marginTop: 4, lineHeight: 15 },

  // Compact Empty State
  emptyCardCompact: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8
  },
  emptyCardTitleCompact: { fontSize: 12.5, fontWeight: "700", color: colors.text, marginTop: 6 },
  emptyCardLink: { marginTop: 6 },
  emptyCardLinkText: { fontSize: 11.5, fontWeight: "700", color: colors.primary },

  // General Timetable / Empty State Styles
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyCardTitle: { fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 8 },
  emptyCardSub: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 4, lineHeight: 16 },
  batchCodePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  batchCodePillText: { fontSize: 11, fontWeight: "800", color: colors.primary },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  timeTagText: { fontSize: 11, fontWeight: "700", color: colors.text },

  // Shortcuts Grid
  shortcutGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  shortcutCard: {
    width: "48%",
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border
  },
  shortcutIconBubble: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8
  },
  shortcutTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  shortcutSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // Day Selector Bar
  daySelectorBar: { flexDirection: "row", gap: 6, marginVertical: 14 },
  dayButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  dayButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayButtonText: { fontSize: 12, fontWeight: "800", color: colors.text },
  dayButtonTextActive: { color: "#FFFFFF" },
  todayIndicator: { marginTop: 2 },
  todayIndicatorActive: {},
  todayIndicatorText: { fontSize: 9, fontWeight: "700", color: colors.primary },
  todayIndicatorTextActive: { color: "#86EFAC" },

  // Timetable Card
  timetableCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.border
  },
  timetableCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timetableCardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8 },
  timetableMetaRow: { flexDirection: "row", gap: 14, marginTop: 6, marginBottom: 12 },
  timetableMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  timetableMetaText: { fontSize: 12, color: colors.textMuted },
  slotActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10
  },
  slotActionButtonText: { fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" },

  // Screen Header
  screenHeader: { marginBottom: 16 },
  screenKicker: { fontSize: 10, fontWeight: "800", color: colors.primary, letterSpacing: 0.8, marginBottom: 2 },
  screenTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 4 },
  screenLead: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 18 },

  // Profile View Mode Card
  profileViewCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  profileHeroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  profileAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.primaryBorder
  },
  profileAvatarLargeText: { fontSize: 20, fontWeight: "800", color: colors.primary },
  profileNameDisplay: { fontSize: 17, fontWeight: "800", color: colors.text },
  profileRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 4
  },
  profileRoleBadgeText: { fontSize: 11, fontWeight: "700", color: colors.textMuted },
  profileDivider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  profileInfoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  profileInfoLabel: { fontSize: 9.5, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.6 },
  profileInfoValue: { fontSize: 13.5, fontWeight: "700", color: colors.text, marginTop: 3 },
  editProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 18
  },
  editProfileButtonText: { fontSize: 13.5, fontWeight: "800", color: "#FFFFFF" },

  // Form & Inputs
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border
  },
  fieldLabel: { fontSize: 10, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.6, marginBottom: 6 },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border
  },
  textInput: { flex: 1, height: 44, fontSize: 13, color: colors.text },
  textInputSimple: {
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border
  },
  durationRow: { flexDirection: "row", gap: 8 },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: colors.cardSubtle,
    borderWidth: 1,
    borderColor: colors.border
  },
  durationButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  durationButtonText: { fontSize: 12, fontWeight: "700", color: colors.text },
  durationButtonTextActive: { color: "#FFFFFF" },

  // Department Chips
  deptChipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  deptChip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border
  },
  deptChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  deptChipText: { fontSize: 11, fontWeight: "700", color: colors.text },
  deptChipTextActive: { color: "#FFFFFF" },

  // Action Buttons
  actionPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  actionPrimaryText: { fontSize: 14, fontWeight: "800", color: "#FFFFFF" },
  actionSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  actionSecondaryText: { fontSize: 14, fontWeight: "800", color: colors.primary },
  actionDanger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 13
  },
  actionPlain: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  actionDisabled: { opacity: 0.6 },
  backText: { fontSize: 13, fontWeight: "700", color: colors.primary },

  // Pass Modal Specific
  passModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 22,
    alignItems: "center"
  },
  passModalTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 2 },
  passDetailsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 12 },
  passTimeText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  passInstructions: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 10, lineHeight: 16 },

  // Pass & QR Containers
  qrContainer: { alignItems: "center", padding: 12, backgroundColor: "#FFFFFF", borderRadius: 14 },
  qrImage: { width: 190, height: 190, borderRadius: 8 },
  qrImageLarge: { width: 210, height: 210, borderRadius: 8 },
  qrPlaceholder: { height: 180, justifyContent: "center", alignItems: "center" },
  qrExpText: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 8 },
  qrPresentationBox: { alignItems: "center", paddingVertical: 12 },
  qrPresentationNotice: { fontSize: 12, fontWeight: "700", color: colors.primary, marginTop: 8 },

  // Camera & Viewfinder
  cameraContainer: { flex: 1, backgroundColor: "#000000" },
  viewfinderOverlay: { flex: 1, justifyContent: "space-between", padding: 24 },
  viewfinderHeader: { paddingTop: 20 },
  scanTargetBox: {
    width: 250,
    height: 250,
    alignSelf: "center",
    position: "relative",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 16
  },
  cornerBracket: { position: "absolute", width: 28, height: 28, borderColor: colors.primaryLight },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  scanInstructionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  cameraErrorBanner: {
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    borderRadius: 8,
    padding: 12,
    alignItems: "center"
  },
  cameraErrorText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  permissionScreen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 14 },
  permissionTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  permissionLead: { fontSize: 13, color: colors.textMuted, textAlign: "center", lineHeight: 18 },

  // Modals & Popups
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  confirmCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 22,
    alignItems: "center"
  },
  confirmIconBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12
  },
  confirmTitle: { fontSize: 17, fontWeight: "800", color: colors.text, textAlign: "center" },
  confirmMessage: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 18 },
  confirmActionsRow: { flexDirection: "row", gap: 10, marginTop: 20, width: "100%" },
  confirmButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: colors.cardSubtle
  },
  confirmButtonSecondaryText: { fontSize: 13, fontWeight: "700", color: colors.text },
  confirmButtonPrimary: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  confirmButtonPrimaryText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },

  resultCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: "center"
  },
  resultSuccessBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10
  },
  resultBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8
  },
  resultBadgeText: { fontSize: 10, fontWeight: "800", color: colors.primary },
  resultTitle: { fontSize: 18, fontWeight: "800", color: colors.text, textAlign: "center" },
  resultMessage: { fontSize: 13, color: colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 18 },
  resultDoneButton: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 20
  },
  resultDoneButtonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },

  // Banners & Loading
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },
  errorBannerText: { fontSize: 12, color: colors.danger, fontWeight: "600", flex: 1 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primarySoft,
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },
  successBannerText: { fontSize: 12, color: colors.primary, fontWeight: "600", flex: 1 },
  loadingBox: { alignItems: "center", paddingVertical: 24, gap: 6 },
  loadingText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },

  // Login Specific
  loginContainer: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 },
  loginHeader: { alignItems: "center", marginBottom: 24 },
  crestCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder
  },
  universityKicker: { fontSize: 9, fontWeight: "800", color: colors.primary, letterSpacing: 1.2 },
  loginMainTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginTop: 4, textAlign: "center" },
  loginSubtitle: { fontSize: 12.5, color: colors.textMuted, textAlign: "center", marginTop: 6, lineHeight: 18 },
  roleToggleContainer: {
    flexDirection: "row",
    backgroundColor: colors.cardSubtle,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16
  },
  roleToggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9
  },
  roleToggleActive: {
    backgroundColor: colors.card,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2
  },
  roleToggleText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
  roleToggleTextActive: { color: colors.primary, fontWeight: "800" },
  serverConfigToggle: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12 },
  serverConfigText: { fontSize: 11, fontWeight: "700", color: colors.primary },
  serverConfigBox: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border
  },

  // Dock
  dockContainer: {
    position: "absolute",
    bottom: 16,
    left: 20,
    right: 20,
    alignItems: "center"
  },
  dockPill: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    width: "100%"
  },
  dockItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 18,
    gap: 2
  },
  dockItemActive: { backgroundColor: colors.primarySoft },
  dockLabel: { fontSize: 9, fontWeight: "700", color: colors.textMuted },
  dockLabelActive: { color: colors.primary, fontWeight: "800" }
});
