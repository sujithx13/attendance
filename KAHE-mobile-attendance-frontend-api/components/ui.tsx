import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { getTabs, type Role, type Screen } from "../lib/navigation";
import { colors, iconName } from "../theme";
import { styles } from "../styles";

export function ModalViewport({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.overlay }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardDismissMode="none" keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

export function ConfirmModal({
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
    <ModalViewport onClose={onCancel}>
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
    </ModalViewport>
  );
}

export function ResultModal({
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
    <ModalViewport onClose={onClose}>
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
    </ModalViewport>
  );
}

export function Action({
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

export function Back({ onPress, disabled = false }: { onPress: () => void; disabled?: boolean }) {
  return (
    <Action kind="plain" onPress={onPress} disabled={disabled}>
      <MaterialCommunityIcons name={iconName("arrow-left")} size={20} color={colors.primary} />
      <Text style={styles.backText}>Back</Text>
    </Action>
  );
}

export function Header({
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={styles.headerGreeting}>{name}</Text>
          <View style={styles.headerRolePill}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.headerRoleText}>
              {role === "faculty" ? "Faculty" : "Student"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.headerRight}>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onOpenProfile} style={styles.headerIconBtn}>
          <MaterialCommunityIcons name={iconName("account-cog-outline")} size={20} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={onSignOut} style={[styles.headerIconBtn, { backgroundColor: colors.dangerSoft }]}>
          <MaterialCommunityIcons name={iconName("logout")} size={18} color={colors.danger} />
        </Pressable>
      </View>
    </View>
  );
}

export function Dock({
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

export function ShortcutCard({
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
