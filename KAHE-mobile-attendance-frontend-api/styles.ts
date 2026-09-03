import { StyleSheet } from "react-native";
import { colors } from "./theme";
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  frame: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  screen: { flex: 1 },
  screenContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
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
  headerGreeting: { fontSize: 15, fontWeight: "700", color: colors.text },
  headerRolePill: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  liveIndicatorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryLight },
  headerRoleText: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
  heroTitle: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginTop: 14, lineHeight: 34 },
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
    marginBottom: 10,
    gap: 8
  },
  sectionTitleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "flex-start"
  },
  sectionKicker: { fontSize: 11, fontWeight: "700", color: colors.primary, letterSpacing: 0.8, marginBottom: 4 },
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
    flexWrap: 'wrap',
    gap: 8,
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
  compactSlotTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
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
  compactSlotMetaRow: { flexDirection: "row", flexWrap: 'wrap', gap: 10, marginTop: 8, alignItems: "center" },
  compactSlotMetaItem: { flexDirection: "row", alignItems: "center", gap: 3, maxWidth: '100%' },
  compactSlotMetaText: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },

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
  compactBatchTitle: { fontSize: 15, fontWeight: "700", color: colors.text, flexShrink: 1 },
  compactBatchMembers: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  compactBatchDesc: { fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 19 },

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
    flexGrow: 1,
    flexBasis: 140,
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
  daySelectorBar: { flexDirection: "row", gap: 6, paddingVertical: 14 },
  dayButton: {
    minWidth: 56,
    paddingHorizontal: 10,
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
  timetableCardTop: { flexDirection: "row", flexWrap: 'wrap', gap: 8, justifyContent: "space-between", alignItems: "center" },
  timetableCardTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8 },
  timetableMetaRow: { flexDirection: "row", flexWrap: 'wrap', gap: 10, marginTop: 8, marginBottom: 14 },
  timetableMetaItem: { flexDirection: "row", alignItems: "center", gap: 4, maxWidth: '100%' },
  timetableMetaText: { fontSize: 12, color: colors.textMuted, flexShrink: 1 },
  slotActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10
  },
  slotActionButtonText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", textAlign: 'center', flexShrink: 1 },

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
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.text, letterSpacing: 0.2, marginBottom: 8 },
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
  textInput: { flex: 1, height: 50, fontSize: 16, color: colors.text, minWidth: 0 },
  textInputSimple: {
    height: 50,
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
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
  actionPrimaryText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", textAlign: 'center', flexShrink: 1 },
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
  actionSecondaryText: { fontSize: 14, fontWeight: "700", color: colors.primary, textAlign: 'center', flexShrink: 1 },
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
  passDetailsRow: { flexDirection: "row", flexWrap: 'wrap', alignItems: "center", gap: 8, marginTop: 8, marginBottom: 12 },
  passTimeText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  passInstructions: { fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: 10, lineHeight: 16 },

  // Pass & QR Containers
  qrContainer: { width: '100%', alignItems: "center", padding: 12, backgroundColor: "#FFFFFF", borderRadius: 14 },
  qrImage: { width: '100%', maxWidth: 220, aspectRatio: 1, borderRadius: 8 },
  qrImageLarge: { width: '100%', maxWidth: 240, aspectRatio: 1, borderRadius: 8 },
  qrPlaceholder: { height: 180, justifyContent: "center", alignItems: "center" },
  qrExpText: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 8 },
  qrPresentationBox: { width: '100%', alignItems: "center", paddingVertical: 12 },
  qrPresentationNotice: { fontSize: 12, fontWeight: "600", color: colors.primary, marginTop: 8, textAlign: 'center' },

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
  confirmButtonSecondaryText: { fontSize: 13, fontWeight: "700", color: colors.text, textAlign: 'center', flexShrink: 1 },
  confirmButtonPrimary: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 10 },
  confirmButtonPrimaryText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", textAlign: 'center', flexShrink: 1 },

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
  resultTitle: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "center", marginTop: 12 },
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
  loginContainer: { width: '100%', maxWidth: 480, alignSelf: 'center', flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 36, paddingBottom: 40 },
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
  universityKicker: { fontSize: 10, fontWeight: "700", color: colors.primary, letterSpacing: 1, textAlign: 'center' },
  loginMainTitle: { fontSize: 28, fontWeight: "700", color: colors.text, marginTop: 12, textAlign: "center", lineHeight: 34 },
  loginSubtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 8, lineHeight: 21 },
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
  serverConfigText: { fontSize: 13, fontWeight: "600", color: colors.primary },
  connectionHint: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 8 },
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
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    elevation: 2,
    width: "100%"
  },
  dockItem: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 18,
    gap: 2
  },
  dockItemActive: { backgroundColor: colors.primarySoft },
  dockLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  dockLabelActive: { color: colors.primary, fontWeight: "800" },
  scannerContent: { padding: 20, paddingBottom: 28, gap: 14, alignItems: 'stretch' },
  fixedCameraBox: { width: '100%', maxWidth: 320, aspectRatio: 1, alignSelf: 'center', backgroundColor: '#101713', borderRadius: 18, overflow: 'hidden', marginVertical: 8 },
  fixedCameraGuide: { position: 'absolute', top: 22, bottom: 22, left: 22, right: 22 },
  presenceCheckbox: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  presenceText: { flex: 1, minWidth: 0, fontSize: 14, color: colors.text, lineHeight: 21 },
  scanStatusCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, backgroundColor: colors.primarySoft, minHeight: 76 },
  scanStatusText: { flex: 1, minWidth: 0, color: colors.text, fontSize: 14, lineHeight: 21 },
  scanOutcomeContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 20 },
  scanOutcomeCard: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', borderWidth: 1, borderColor: colors.border }
});
