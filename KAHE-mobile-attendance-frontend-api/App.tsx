import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as Location from "expo-location";
import * as Sharing from "expo-sharing";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import {
  AttendanceApiError,
  getMySummary,
  getStudentFlow,
  getStudentQr,
  getFacultyQrExport,
  submitProfessorScan,
  getDepartments,
  getMyProfile,
  updateProfile,
  login,
  submitAttendanceAttempt,
  type AnalyticsResponse,
  type AttendanceDecision,
  type AuthSession,
  type StudentFlow,
  type StudentQr,
  type Department,
  type UserProfile
} from "./lib/api";
import { getTabs, type Role, type Screen } from "./lib/navigation";

const colors = {
  green: "#2D753E",
  deepGreen: "#245D33",
  ink: "#303633",
  paper: "#F5F4EF",
  white: "#FFFDF9",
  line: "#DCE3D9",
  muted: "#728071",
  paleGreen: "#E7F1E5",
  paleAmber: "#F5EDE1"
};
const activeSessionId = "sess_cs101_active";
const iconName = (name: React.ComponentProps<typeof MaterialCommunityIcons>["name"]) => name;

function getErrorMessage(error: unknown) {
  return error instanceof AttendanceApiError ? error.message : "The attendance service could not complete that request.";
}

function Action({
  children,
  onPress,
  kind = "primary",
  disabled = false
}: {
  children: React.ReactNode;
  onPress: () => void;
  kind?: "primary" | "secondary" | "plain";
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, styles[`action_${kind}`], (pressed || disabled) && styles.actionPressed]}
    >
      {children}
    </Pressable>
  );
}

function Back({ onPress }: { onPress: () => void }) {
  return (
    <Action kind="plain" onPress={onPress}>
      <MaterialCommunityIcons name={iconName("arrow-left")} size={19} color={colors.green} />
      <Text style={styles.backText}>Back to home</Text>
    </Action>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
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
          onOpenProfile={() => setScreen("profile")}
          onSignOut={() => {
            setAuth(null);
            setScreen("home");
          }}
        />
        {screen === "home" && <Home role={role} auth={auth} onNavigate={setScreen} />}
        {screen === "attendance" && <StudentScanner auth={auth} onBack={() => setScreen("home")} />}
        {screen === "qr" && <PersonalQr auth={auth} onBack={() => setScreen("home")} />}
        {screen === "history" && <Analytics auth={auth} onBack={() => setScreen("home")} />}
        {screen === "profile" && <ProfileScreen auth={auth} onBack={() => setScreen("home")} />}
        {screen === "classroom" && <FacultyQr auth={auth} onBack={() => setScreen("home")} />}
        {screen === "scanner" && <RosterScanner auth={auth} onBack={() => setScreen("home")} />}
        <Dock role={role} screen={screen} onNavigate={setScreen} />
      </View>
    </SafeAreaView>
  );
}

function LoginScreen({ onAuthenticated }: { onAuthenticated: (auth: AuthSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Enter your university email and password.");
      return;
    }
    setPending(true);
    setError("");
    try {
      onAuthenticated(await login(email.trim(), password));
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.login}>
      <StatusBar style="dark" />
      <Image source={require("./assets/kahelogo.jpeg")} style={styles.loginLogo} resizeMode="contain" />
      <Text style={styles.kicker}>KAHE ATTENDANCE</Text>
      <Text style={styles.loginTitle}>
        Be present.{"\n"}
        <Text style={styles.emphasis}>Stay in step.</Text>
      </Text>
      <Text style={styles.lead}>Sign in to use KAHE’s scanner-first attendance workspace.</Text>
      <View style={styles.card}>
        <Label text="UNIVERSITY EMAIL" />
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="name@university.edu"
          placeholderTextColor="#9DA59C"
          style={styles.input}
        />
        <Label text="PASSWORD" />
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Your password"
          placeholderTextColor="#9DA59C"
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Action onPress={submit} disabled={pending}>
          <Text style={styles.actionText}>{pending ? "Signing in…" : "Sign in securely"}</Text>
          <MaterialCommunityIcons name={iconName("arrow-right")} size={18} color="#FFFFFF" />
        </Action>
      </View>
      <Text style={styles.finePrint}>The access token is kept in memory only for the current app session.</Text>
    </SafeAreaView>
  );
}

function Header({
  name,
  onSignOut,
  onOpenProfile
}: {
  name: string;
  onSignOut: () => void;
  onOpenProfile: () => void;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={styles.header}>
      <Image source={require("./assets/kahelogo.jpeg")} style={styles.headerLogo} resizeMode="contain" />
      <View style={styles.headerRight}>
        <Pressable onPress={onOpenProfile} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "KA"}</Text>
        </Pressable>
        <Action kind="plain" onPress={onSignOut}>
          <MaterialCommunityIcons name={iconName("logout")} size={19} color={colors.deepGreen} />
        </Action>
      </View>
    </View>
  );
}

function Home({
  role,
  auth,
  onNavigate
}: {
  role: Role;
  auth: AuthSession;
  onNavigate: (screen: Screen) => void;
}) {
  const firstName = auth.user.fullName.split(" ")[0] || "there";
  const student = role === "student";
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroRingOne} />
        <View style={styles.heroRingTwo} />
        <Text style={styles.kickerLight}>{student ? "STUDENT ATTENDANCE" : "FACULTY ATTENDANCE"}</Text>
        <Text style={styles.heroTitle}>
          Hello, {firstName}.{"\n"}
          <Text style={styles.heroEmphasis}>{student ? "Ready to scan?" : "Ready to present?"}</Text>
        </Text>
        <Text style={styles.heroLead}>
          {student
            ? "One scan submits your attendance attempt with its background context."
            : "Choose a class or batch, set an expiry, and prepare a live QR presentation."}
        </Text>
        <Action onPress={() => onNavigate(student ? "attendance" : "classroom")}>
          <MaterialCommunityIcons
            name={iconName(student ? "qrcode-scan" : "presentation-play")}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.actionText}>{student ? "Open scanner" : "Set up live QR"}</Text>
        </Action>
      </View>
      <Text style={styles.sectionKicker}>{student ? "ONE SIMPLE ACTION" : "LIVE QR CONTROL"}</Text>
      <Text style={styles.sectionTitle}>{student ? "Scanner-first attendance" : "Classroom presentation"}</Text>
      <Action kind="secondary" onPress={() => onNavigate(student ? "attendance" : "classroom")}>
        <View style={styles.roundIcon}>
          <MaterialCommunityIcons
            name={iconName(student ? "qrcode-scan" : "presentation-play")}
            size={22}
            color={colors.green}
          />
        </View>
        <View style={styles.actionCopy}>
          <Text style={styles.actionTitle}>{student ? "Scan and check in" : "Choose a class/batch QR"}</Text>
          <Text style={styles.actionNote}>
            {student
              ? "Camera and location data are handled behind the scan action."
              : "Configure an expiry and export a returned QR image as PNG."}
          </Text>
        </View>
        <MaterialCommunityIcons name={iconName("arrow-right")} size={20} color={colors.green} />
      </Action>
      <View style={styles.shortcutRow}>
        {student ? (
          <>
            <Shortcut icon="qrcode" title="Personal QR" copy="Show a secure pass" onPress={() => onNavigate("qr")} />
            <Shortcut icon="chart-donut" title="Analytics" copy="Course summary" onPress={() => onNavigate("history")} />
            <Shortcut icon="account-cog" title="My Profile" copy="Dept & Year" onPress={() => onNavigate("profile")} />
          </>
        ) : (
          <>
            <Shortcut icon="barcode-scan" title="Roster scan" copy="Read student passes" onPress={() => onNavigate("scanner")} />
            <Shortcut icon="information-outline" title="Live QR" copy="Class & Batches" onPress={() => onNavigate("classroom")} />
            <Shortcut icon="account-cog" title="My Profile" copy="Department" onPress={() => onNavigate("profile")} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

function Shortcut({
  icon,
  title,
  copy,
  onPress
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  title: string;
  copy: string;
  onPress: () => void;
}) {
  return (
    <Action kind="secondary" onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.green} />
      <Text style={styles.shortcutTitle}>{title}</Text>
      <Text style={styles.shortcutCopy}>{copy}</Text>
    </Action>
  );
}

function StudentScanner({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flow, setFlow] = useState<StudentFlow | null>(null);
  const [status, setStatus] = useState<"ready" | "sending" | "done">("ready");
  const [decision, setDecision] = useState<AttendanceDecision | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentFlow(auth.token, activeSessionId)
      .then(setFlow)
      .catch((issue) => setError(getErrorMessage(issue)));
  }, [auth.token]);

  const submit = async ({ data }: { data: string }) => {
    if (status === "sending" || decision) return;
    setStatus("sending");
    setError("");
    try {
      const permissionResult = await Location.requestForegroundPermissionsAsync();
      if (permissionResult.status !== "granted")
        throw new Error("Location access is required to submit this attendance scan.");
      const currentPosition = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = currentPosition.coords;
      const response = await submitAttendanceAttempt(auth.token, {
        sessionId: activeSessionId,
        clientTimestamp: new Date().toISOString(),
        qrPayload: data,
        coordinates: {
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy ?? 0
        },
        telemetry: { isFromMockProvider: Boolean((currentPosition as { mocked?: boolean }).mocked) }
      });
      setDecision(response);
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setStatus("done");
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <Text style={styles.kicker}>SCANNER-ONLY CHECK-IN</Text>
      <Text style={styles.screenTitle}>
        Scan once.{"\n"}
        <Text style={styles.emphasis}>We handle the rest.</Text>
      </Text>
      <Text style={styles.lead}>{flow?.title ?? "Point your camera at the classroom QR code to begin."}</Text>
      {!permission?.granted ? (
        <PermissionCard
          onPress={requestPermission}
          text="Allow camera access to scan a classroom QR. Your device location is requested only after a successful scan."
        />
      ) : (
        <View style={styles.cameraCard}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={status === "sending" || decision ? undefined : submit}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide}>
              <View style={styles.cornerTop} />
              <View style={styles.cornerBottom} />
            </View>
            <Text style={styles.cameraCaption}>
              {status === "sending"
                ? "Submitting attendance attempt…"
                : decision
                ? "Attendance decision received"
                : "Align the classroom QR inside the guide"}
            </Text>
          </View>
        </View>
      )}
      {decision ? <DecisionCard decision={decision} onBack={onBack} /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Info text="There are no pledge, location, or selfie screens. One scanner action captures the QR and background data, then submits a single attendance attempt." />
    </ScrollView>
  );
}

function PermissionCard({ onPress, text }: { onPress: () => void; text: string }) {
  return (
    <View style={styles.permissionCard}>
      <MaterialCommunityIcons name={iconName("camera-outline")} size={32} color={colors.green} />
      <Text style={styles.permissionTitle}>Camera access needed</Text>
      <Text style={styles.permissionCopy}>{text}</Text>
      <Action onPress={onPress}>
        <Text style={styles.actionText}>Allow camera access</Text>
      </Action>
    </View>
  );
}

function DecisionCard({ decision, onBack }: { decision: AttendanceDecision; onBack: () => void }) {
  const accepted = decision.decision === "ACCEPT";
  const challenged = decision.decision === "CHALLENGE";
  const tone = accepted ? styles.decisionAccepted : challenged ? styles.decisionChallenge : styles.decisionRejected;
  const label = accepted ? "Attendance accepted" : challenged ? "Attendance needs review" : "Attendance rejected";
  return (
    <View style={[styles.decision, tone]}>
      <MaterialCommunityIcons
        name={iconName(accepted ? "check-circle" : challenged ? "alert-circle" : "close-circle")}
        size={28}
        color={accepted ? colors.green : challenged ? "#9A733D" : "#A65A53"}
      />
      <Text style={styles.decisionTitle}>{label}</Text>
      <Text style={styles.decisionCopy}>
        {decision.decisionReason ?? "The attendance service returned a decision for this scan."}
      </Text>
      <Action onPress={onBack}>
        <Text style={styles.actionText}>Return to home</Text>
      </Action>
    </View>
  );
}

function PersonalQr({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [qr, setQr] = useState<StudentQr | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setPending(true);
    setError("");
    try {
      setQr(await getStudentQr(auth.token, activeSessionId));
    } catch (issue) {
      setError(getErrorMessage(issue));
    } finally {
      setPending(false);
    }
  };
  useEffect(() => {
    load();
  }, [auth.token]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <Text style={styles.kicker}>REVERSE SCAN MODE</Text>
      <Text style={styles.screenTitle}>
        Show your{"\n"}
        <Text style={styles.emphasis}>personal code.</Text>
      </Text>
      <Text style={styles.lead}>The live attendance service supplies this secure QR directly for your current session.</Text>
      <View style={styles.qrCard}>
        {pending ? <Text style={styles.loading}>Loading your secure QR…</Text> : null}
        {qr ? (
          <>
            <Image source={{ uri: qr.dataUrl }} style={styles.qrImage} resizeMode="contain" />
            <Text style={styles.qrExpiry}>This QR expires in {qr.expiresInSeconds} seconds.</Text>
          </>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Action kind="secondary" onPress={load}>
          <MaterialCommunityIcons name={iconName("refresh")} size={18} color={colors.green} />
          <Text style={styles.secondaryText}>Refresh secure QR</Text>
        </Action>
      </View>
    </ScrollView>
  );
}

function Analytics({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [summary, setSummary] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getMySummary(auth.token)
      .then(setSummary)
      .catch((issue) => setError(getErrorMessage(issue)));
  }, [auth.token]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <Text style={styles.kicker}>MY ANALYTICS</Text>
      <Text style={styles.screenTitle}>
        Attendance{"\n"}
        <Text style={styles.emphasis}>in context.</Text>
      </Text>
      <Text style={styles.lead}>Course summaries are loaded directly from the attendance service.</Text>
      {!summary && !error ? <Text style={styles.loading}>Loading course summaries…</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {summary?.summaries.map((course) => (
        <View key={course.courseCode} style={styles.summaryRow}>
          <View style={styles.courseBadge}>
            <Text style={styles.courseBadgeText}>{course.courseCode.slice(-2)}</Text>
          </View>
          <Text style={styles.courseCode}>{course.courseCode}</Text>
          <Text style={styles.courseValue}>
            {typeof course.attendancePercentage === "number" ? `${course.attendancePercentage}%` : "—"}
          </Text>
        </View>
      ))}
      {summary?.summaries.length === 0 ? (
        <Text style={styles.loading}>No attendance summaries are currently available.</Text>
      ) : null}
    </ScrollView>
  );
}

function ProfileScreen({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState(auth.user.fullName);
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const isStudent =
    !auth.user.role.toLowerCase().includes("prof") && !auth.user.role.toLowerCase().includes("faculty");

  useEffect(() => {
    getMyProfile(auth.token)
      .then((res) => {
        const u = res.user;
        setProfile(u);
        setName(u.fullName || (u as any).full_name || auth.user.fullName || "");
        setSelectedDeptId(u.departmentId || (u as any).department_id || null);
        setSelectedYear(u.yearOfStudy || (u as any).year_of_study || null);
      })
      .catch((err) => setError(getErrorMessage(err)));

    getDepartments(auth.token)
      .then((res) => {
        setDepartments(res.departments || []);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [auth.token]);

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const cleanName = (name || auth.user.fullName || "").trim();
      const res = await updateProfile(auth.token, {
        fullName: cleanName || undefined,
        departmentId: selectedDeptId || undefined,
        yearOfStudy: isStudent && selectedYear ? selectedYear : undefined
      });
      const u = res.user;
      setProfile(u);
      setName(u.fullName || (u as any).full_name || cleanName);
      setSuccess("Profile updated successfully!");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <Text style={styles.kicker}>ACADEMIC PROFILE</Text>
      <Text style={styles.screenTitle}>
        My Profile.{"\n"}
        <Text style={styles.emphasis}>Department & Year.</Text>
      </Text>
      <Text style={styles.lead}>
        Configure your registered department and academic year for class and batch attendance.
      </Text>

      <View style={styles.card}>
        <Label text="FULL NAME" />
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#9DA59C"
          style={styles.input}
        />

        <Label text="CHOOSE YOUR DEPARTMENT" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {departments.map((d) => {
            const active = selectedDeptId === d.id;
            return (
              <Pressable
                key={d.id}
                onPress={() => setSelectedDeptId(d.id)}
                style={[
                  { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1 },
                  active
                    ? { backgroundColor: colors.green, borderColor: colors.green }
                    : { backgroundColor: colors.white, borderColor: colors.line }
                ]}
              >
                <Text
                  style={[
                    { fontSize: 11, fontWeight: "800" },
                    active ? { color: "#FFF" } : { color: colors.ink }
                  ]}
                >
                  {d.code} - {d.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {isStudent && (
          <>
            <Label text="ACADEMIC YEAR OF STUDY" />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4].map((yr) => {
                const active = selectedYear === yr;
                return (
                  <Pressable
                    key={yr}
                    onPress={() => setSelectedYear(yr)}
                    style={[
                      { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 6, borderWidth: 1 },
                      active
                        ? { backgroundColor: colors.green, borderColor: colors.green }
                        : { backgroundColor: colors.white, borderColor: colors.line }
                    ]}
                  >
                    <Text
                      style={[
                        { fontSize: 12, fontWeight: "800" },
                        active ? { color: "#FFF" } : { color: colors.ink }
                      ]}
                    >
                      Year {yr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {success ? (
          <Text style={{ color: colors.green, fontSize: 11, fontWeight: "700", marginBottom: 12 }}>{success}</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Action onPress={save} disabled={saving}>
          <Text style={styles.actionText}>{saving ? "Saving changes…" : "Save profile changes"}</Text>
          <MaterialCommunityIcons name={iconName("check")} size={18} color="#FFFFFF" />
        </Action>
      </View>

      <Info text="Classes are restricted to your department. Batches configured by Admins can be cross-departmental or multi-year." />
    </ScrollView>
  );
}

function FacultyQr({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [sessionId, setSessionId] = useState(activeSessionId);
  const [expiresInSeconds, setExpiresInSeconds] = useState(900);
  const [notice, setNotice] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const prepare = async () => {
    setLoading(true);
    setNotice("");
    try {
      const res = await getFacultyQrExport(auth.token, sessionId, expiresInSeconds);
      setDataUrl(res.dataUrl);
      setNotice(`Live QR generated! Valid for ${Math.round(res.expiresInSeconds / 60)} minutes.`);
    } catch (err) {
      setNotice(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const exportPng = async () => {
    if (!dataUrl) {
      setNotice("Generate a live QR code first to export.");
      return;
    }
    const base64 = dataUrl.split(",")[1];
    if (!base64) {
      setNotice("The QR image could not be prepared for export.");
      return;
    }
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <Text style={styles.kicker}>FACULTY LIVE QR</Text>
      <Text style={styles.screenTitle}>
        Live Class / Batch.{"\n"}
        <Text style={styles.emphasis}>Control the expiry.</Text>
      </Text>
      <Text style={styles.lead}>Generate an authenticated session QR and export its high-resolution PNG image.</Text>
      <View style={styles.card}>
        <Label text="SESSION IDENTIFIER" />
        <TextInput
          value={sessionId}
          onChangeText={setSessionId}
          autoCapitalize="none"
          placeholder="Session identifier"
          placeholderTextColor="#9DA59C"
          style={styles.input}
        />
        <Label text="VALIDITY DURATION" />
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
          {[300, 900, 3600].map((sec) => {
            const active = expiresInSeconds === sec;
            return (
              <Pressable
                key={sec}
                onPress={() => setExpiresInSeconds(sec)}
                style={[
                  { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 6, borderWidth: 1 },
                  active
                    ? { backgroundColor: colors.green, borderColor: colors.green }
                    : { backgroundColor: colors.white, borderColor: colors.line }
                ]}
              >
                <Text
                  style={[
                    { fontSize: 11, fontWeight: "800" },
                    active ? { color: "#FFF" } : { color: colors.ink }
                  ]}
                >
                  {sec / 60} min
                </Text>
              </Pressable>
            );
          })}
        </View>

        {dataUrl ? (
          <View style={{ alignItems: "center", marginVertical: 14 }}>
            <Image source={{ uri: dataUrl }} style={{ width: 220, height: 220 }} resizeMode="contain" />
          </View>
        ) : null}

        <Action onPress={prepare} disabled={loading}>
          <MaterialCommunityIcons name={iconName("presentation-play")} size={18} color="#FFFFFF" />
          <Text style={styles.actionText}>{loading ? "Generating Live QR…" : "Generate Live QR"}</Text>
        </Action>
        <Action kind="secondary" onPress={exportPng}>
          <MaterialCommunityIcons name={iconName("download-outline")} size={18} color={colors.green} />
          <Text style={styles.secondaryText}>Export QR as PNG</Text>
        </Action>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>
      <Info text="Broadcast this QR on your projector or export as a PNG image. Students can scan it using their mobile scanner." />
    </ScrollView>
  );
}

function RosterScanner({ auth, onBack }: { auth: AuthSession; onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [payload, setPayload] = useState("");
  const [decision, setDecision] = useState<{ studentName: string; enrollmentId: string; decision: string } | null>(
    null
  );
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanning || decision) return;
    setScanning(true);
    setPayload(data);
    setError("");
    try {
      const res = await submitProfessorScan(auth.token, activeSessionId, data);
      setDecision({
        studentName: res.studentName,
        enrollmentId: res.enrollmentId,
        decision: res.decision
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Back onPress={onBack} />
      <Text style={styles.kicker}>FACULTY ROSTER SCANNER</Text>
      <Text style={styles.screenTitle}>
        Verify a{"\n"}
        <Text style={styles.emphasis}>student pass.</Text>
      </Text>
      <Text style={styles.lead}>
        Use your camera to scan a student’s personal session QR. The backend instantly validates and records their
        attendance.
      </Text>
      {!permission?.granted ? (
        <PermissionCard onPress={requestPermission} text="Allow camera access to read a student’s personal QR pass." />
      ) : (
        <View style={styles.cameraCard}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={scanning || decision ? undefined : handleBarcodeScanned}
          />
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide}>
              <View style={styles.cornerTop} />
              <View style={styles.cornerBottom} />
            </View>
            <Text style={styles.cameraCaption}>
              {scanning
                ? "Submitting scan to server…"
                : decision
                ? "Student attendance confirmed"
                : "Align student pass inside the guide"}
            </Text>
          </View>
        </View>
      )}
      {decision ? (
        <View style={styles.capture}>
          <MaterialCommunityIcons name={iconName("check-circle")} size={28} color={colors.green} />
          <Text style={styles.captureTitle}>Attendance Confirmed!</Text>
          <Text style={{ fontSize: 13, fontWeight: "800", color: colors.ink, marginTop: 4 }}>
            {decision.studentName} ({decision.enrollmentId})
          </Text>
          <Action
            kind="secondary"
            onPress={() => {
              setDecision(null);
              setPayload("");
            }}
          >
            <Text style={styles.secondaryText}>Scan next student pass</Text>
          </Action>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Info text="Direct 1-to-1 professor scan creates an official attendance record with marked_by='PROFESSOR' authority." />
    </ScrollView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}
function Info({ text }: { text: string }) {
  return (
    <View style={styles.info}>
      <MaterialCommunityIcons name={iconName("information-outline")} size={19} color={colors.green} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}
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
    <View style={styles.dock}>
      {getTabs(role).map((tab) => (
        <Pressable
          key={tab.screen}
          onPress={() => onNavigate(tab.screen)}
          style={({ pressed }) => [
            styles.dockItem,
            screen === tab.screen && styles.dockActive,
            pressed && styles.actionPressed
          ]}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={21}
            color={screen === tab.screen ? colors.green : "#7A837A"}
          />
          <Text style={[styles.dockLabel, screen === tab.screen && styles.dockLabelActive]}>{tab.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  frame: { flex: 1, backgroundColor: colors.paper },
  login: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 28, paddingTop: 42 },
  loginLogo: { width: 126, height: 80, alignSelf: "center" },
  kicker: { color: "#638265", fontSize: 9, fontWeight: "800", letterSpacing: 1.25, marginTop: 23 },
  kickerLight: { color: "#C6DCC1", fontSize: 9, fontWeight: "800", letterSpacing: 1.25 },
  loginTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 39, lineHeight: 42, marginTop: 9 },
  emphasis: { color: colors.green, fontStyle: "italic" },
  lead: { color: "#737C72", fontSize: 12, lineHeight: 19, marginTop: 10 },
  card: {
    backgroundColor: colors.white,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    borderTopRightRadius: 18,
    padding: 20,
    marginTop: 26,
    shadowColor: "#2C4B32",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2
  },
  label: { color: "#778677", fontSize: 8, fontWeight: "800", letterSpacing: 1.1, marginTop: 4, marginBottom: 7 },
  input: {
    minHeight: 43,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FCFDF9",
    color: "#3F4B40",
    fontSize: 12,
    paddingHorizontal: 11,
    borderRadius: 4,
    marginBottom: 16
  },
  error: { color: "#A45D56", fontSize: 10, lineHeight: 15, marginTop: 13 },
  finePrint: { color: "#849083", fontSize: 9, lineHeight: 14, textAlign: "center", marginTop: 16 },
  action: {
    minHeight: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8
  },
  action_primary: { backgroundColor: colors.green, borderRadius: 5 },
  action_secondary: { backgroundColor: colors.white, borderRadius: 5, borderWidth: 1, borderColor: "#C8DAC6" },
  action_plain: { backgroundColor: "transparent", minHeight: 34, alignSelf: "flex-start", marginTop: 0 },
  actionPressed: { transform: [{ scale: 0.97 }], opacity: 0.78 },
  actionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  secondaryText: { color: colors.green, fontSize: 10, fontWeight: "800" },
  header: {
    height: 64,
    backgroundColor: colors.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  headerLogo: { width: 74, height: 45 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3EDE1",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { color: colors.deepGreen, fontSize: 10, fontWeight: "800" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 17, paddingTop: 18, paddingBottom: 105 },
  hero: {
    minHeight: 244,
    overflow: "hidden",
    backgroundColor: colors.deepGreen,
    padding: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#B6D5AF"
  },
  heroRingOne: {
    position: "absolute",
    width: 155,
    height: 155,
    borderWidth: 1,
    borderColor: "rgba(219,239,211,.18)",
    borderRadius: 80,
    right: -55,
    top: -60
  },
  heroRingTwo: {
    position: "absolute",
    width: 112,
    height: 112,
    borderWidth: 1,
    borderColor: "rgba(219,239,211,.14)",
    borderRadius: 60,
    right: -9,
    bottom: -40
  },
  heroTitle: { color: "#FFFFFF", fontFamily: "Georgia", fontSize: 34, lineHeight: 38, marginTop: 12 },
  heroEmphasis: { color: "#DFE8D6", fontStyle: "italic" },
  heroLead: { color: "#D4E2CF", fontSize: 12, lineHeight: 19, marginTop: 11, maxWidth: 265 },
  sectionKicker: { color: "#728271", fontSize: 9, fontWeight: "800", letterSpacing: 1.1, marginTop: 27 },
  sectionTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 22, marginTop: 4, marginBottom: 10 },
  roundIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.paleGreen,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  actionCopy: { flex: 1 },
  actionTitle: { color: "#414C42", fontSize: 12, fontWeight: "800" },
  actionNote: { color: "#768075", fontSize: 9, lineHeight: 14, marginTop: 4 },
  shortcutRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  shortcutTitle: { color: "#4B554B", fontSize: 10, fontWeight: "800", marginTop: 9 },
  shortcutCopy: { color: "#7D867B", fontSize: 9, lineHeight: 13, marginTop: 4 },
  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: { paddingHorizontal: 20, paddingTop: 21, paddingBottom: 105 },
  backText: { color: colors.green, fontSize: 11, fontWeight: "800" },
  screenTitle: { color: colors.ink, fontFamily: "Georgia", fontSize: 38, lineHeight: 40, marginTop: 8 },
  permissionCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 27,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    borderTopRightRadius: 18,
    marginTop: 25
  },
  permissionTitle: { color: "#485247", fontFamily: "Georgia", fontSize: 24, marginTop: 13 },
  permissionCopy: {
    color: "#737C72",
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 255
  },
  cameraCard: {
    height: 350,
    overflow: "hidden",
    backgroundColor: "#173B24",
    marginTop: 25,
    borderLeftWidth: 3,
    borderLeftColor: colors.green
  },
  camera: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  cameraOverlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(18,56,31,.38)" },
  cameraGuide: { width: "72%", aspectRatio: 1, borderWidth: 1, borderColor: "rgba(255,255,255,.6)" },
  cornerTop: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#D9F0D3"
  },
  cornerBottom: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#D9F0D3"
  },
  cameraCaption: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 18,
    maxWidth: 250
  },
  info: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.paleGreen,
    padding: 15,
    borderLeftWidth: 3,
    borderLeftColor: "#B1D0AF",
    marginTop: 16
  },
  infoText: { flex: 1, color: "#647263", fontSize: 9, lineHeight: 14, fontWeight: "700" },
  decision: { alignItems: "center", padding: 23, borderLeftWidth: 3, borderTopRightRadius: 16, marginTop: 16 },
  decisionAccepted: { backgroundColor: "#E8F2E5", borderLeftColor: colors.green },
  decisionChallenge: { backgroundColor: colors.paleAmber, borderLeftColor: "#C18A4A" },
  decisionRejected: { backgroundColor: "#F5ECEA", borderLeftColor: "#B7645C" },
  decisionTitle: { color: "#445044", fontFamily: "Georgia", fontSize: 25, marginTop: 10 },
  decisionCopy: { color: "#6F796E", fontSize: 10, lineHeight: 16, marginTop: 7, textAlign: "center" },
  qrCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 22,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    borderTopRightRadius: 18,
    marginTop: 25
  },
  qrImage: { width: "100%", aspectRatio: 1, backgroundColor: "#FFFFFF" },
  qrExpiry: { color: "#637262", fontSize: 10, fontWeight: "700", marginTop: 14 },
  loading: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: 25 },
  summaryRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    padding: 11,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    borderTopRightRadius: 14,
    marginTop: 8
  },
  courseBadge: {
    width: 31,
    height: 31,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paleGreen,
    marginRight: 9
  },
  courseBadgeText: { color: colors.green, fontFamily: "Georgia", fontSize: 12 },
  courseCode: { flex: 1, color: "#475147", fontSize: 11, fontWeight: "800" },
  courseValue: { color: colors.green, fontSize: 13, fontWeight: "800" },
  notice: { color: "#7A694F", fontSize: 9, lineHeight: 14, marginTop: 14 },
  capture: {
    alignItems: "center",
    backgroundColor: "#E8F2E5",
    padding: 19,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
    marginTop: 15
  },
  captureTitle: { color: "#477349", fontSize: 11, fontWeight: "800", marginTop: 6 },
  dock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: "rgba(255,253,249,.98)",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line
  },
  dockItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderTopWidth: 2,
    borderTopColor: "transparent"
  },
  dockActive: { borderTopColor: colors.green },
  dockLabel: { color: "#7A837A", fontSize: 8, fontWeight: "800" },
  dockLabelActive: { color: colors.green }
});
