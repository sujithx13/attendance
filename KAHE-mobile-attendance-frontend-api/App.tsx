import { readAuth, saveAuth } from './lib/auth-storage';
import { logout } from './lib/api';
import { useState, useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from "expo-status-bar";
import type { AuthSession, MobileTimetableSlot } from "./lib/api";
import { initializeConnection } from './lib/api';
import type { Screen, Role } from "./lib/navigation";
import { styles } from "./styles";
import { Header, Dock, ConfirmModal } from "./components/ui";
import { FacultyClassQrModal } from "./components/ClassQrModals";
import { StudentSession } from './screens/StudentSession';
import { LoginScreen } from "./screens/LoginScreen";
import { Home } from "./screens/Home";
import { TimetableScreen } from "./screens/TimetableScreen";
import { UniversalScanner } from "./screens/UniversalScanner";
import { ProfileScreen } from "./screens/ProfileScreen";
import { CaptureBoundary } from './components/CaptureBoundary';

export default function App() {
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><CaptureBoundary><AttendanceApp /></CaptureBoundary></SafeAreaProvider>;
}

function AttendanceApp() {
  const [connectionReady, setConnectionReady] = useState(false);
  useEffect(() => { void initializeConnection().then(readAuth).then(setAuth).finally(() => setConnectionReady(true)); }, []);
  const [auth, setAuth] = useState<AuthSession | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Active Class-Specific QR Modals State
  const [studentQrSlot, setStudentQrSlot] = useState<MobileTimetableSlot | null>(null);
  const [facultyQrSlot, setFacultyQrSlot] = useState<MobileTimetableSlot | null>(null);

  if (!connectionReady) return <View style={styles.permissionScreen}><Text style={styles.loadingText}>Opening attendance...</Text></View>;
  if (!auth) return <LoginScreen onAuthenticated={session => { void saveAuth(session).then(() => setAuth(session)).catch(() => alert('Could not save sign-in. Please try again.')); }} />;

  const role: Role =
    auth.user.role.toLowerCase().includes("prof") || auth.user.role.toLowerCase().includes("faculty")
      ? "faculty"
      : "student";

  if (studentQrSlot) return <SafeAreaView style={styles.safe}><StatusBar style="dark" /><View style={styles.frame}><StudentSession auth={auth} slot={studentQrSlot} onBack={() => setStudentQrSlot(null)} /></View></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.frame}>
        {screen !== 'scanner' && <Header
          name={auth.user.fullName}
          role={role}
          onOpenProfile={() => setScreen("profile")}
        />}

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

        {screen === "profile" && <ProfileScreen auth={auth} onBack={() => setScreen("home")} onTestingLogout={() => setShowSignOutConfirm(true)} />}

        {screen !== 'scanner' && <Dock role={role} screen={screen} onNavigate={setScreen} />}

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
          onConfirm={() => { void logout(auth.token).then(() => saveAuth(null)).then(() => { setShowSignOutConfirm(false); setAuth(null); setScreen("home"); }).catch(() => alert("Logout could not reach the server. Your account remains signed in; please retry.")); }}
          onCancel={() => setShowSignOutConfirm(false)}
        />
      </View>
    </SafeAreaView>
  );
}
