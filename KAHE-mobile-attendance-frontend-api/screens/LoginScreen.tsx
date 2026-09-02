import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from "react";
import { login, getApiBaseUrl, setCustomApiBaseUrl, type AuthSession } from "../lib/api";
import { type Role } from "../lib/navigation";
import { colors, iconName, getErrorMessage } from "../theme";
import { styles } from "../styles";
import { Action } from "../components/ui";


export function LoginScreen({ onAuthenticated }: { onAuthenticated: (auth: AuthSession) => void }) {
  const [email, setEmail] = useState(__DEV__ ? "student.john@university.edu" : "");
  const [password, setPassword] = useState(__DEV__ ? "password123" : "");
  const [serverUrl, setServerUrl] = useState(getApiBaseUrl());
  const [showServerConfig, setShowServerConfig] = useState(!getApiBaseUrl());
  const [roleType, setRoleType] = useState<"student" | "faculty">("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRoleSelect = (role: "student" | "faculty") => {
    setRoleType(role);
    setError("");
    if (!__DEV__) return;
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
          <Text style={styles.loginMainTitle}>Campus attendance</Text>
          <Text style={styles.loginSubtitle}>
            Classroom QR attendance and professor verification for students and faculty.
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
              Student
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
              Faculty
            </Text>
          </Pressable>
        </View>

        {/* Login Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>University email</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={iconName("email-outline")} size={18} color={colors.textSubtle} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              accessibilityLabel="University email"
              keyboardType="email-address"
              placeholder="e.g. yourname@university.edu"
              placeholderTextColor={colors.textSubtle}
              style={styles.textInput}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Password</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name={iconName("lock-outline")} size={18} color={colors.textSubtle} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
              autoComplete="current-password"
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
              {showServerConfig ? "Hide connection settings" : "Server connection"}
            </Text>
          </Pressable>

          {showServerConfig && (
            <View style={styles.serverConfigBox}>
              <Text style={styles.fieldLabel}>Server address</Text>
              <TextInput
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                accessibilityLabel="Attendance server address"
                placeholder="https://attendance.example.edu"
                placeholderTextColor={colors.textSubtle}
                style={styles.textInputSimple}
              />
              <Text style={styles.connectionHint}>For use over mobile internet, enter your server's public HTTPS address. Your computer must stay online while hosting it.</Text>
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
                {loading ? "Authenticating Session…" : "Sign in"}
              </Text>
              <MaterialCommunityIcons name={iconName("arrow-right")} size={18} color="#FFFFFF" />
            </Action>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
