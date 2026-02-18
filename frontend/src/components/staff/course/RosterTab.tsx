"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import {
  courseStaff,
  staffCourseGitHub,
  type Course,
  type CourseGitHubClaim,
  type CourseMembership,
  type CourseMembershipCreate,
  type CourseMembershipUpdate,
  type GitHubClassroom,
  type GitHubClassroomAssignment,
  type GitHubRosterSync,
  type ImportCsvIssue,
  type ImportCsvResult,
  type OrgMembership,
  ApiError,
} from "@/lib/api";
import { ConfirmModal } from "@/components/ui/Modal";
import { reportError } from "@/lib/reportError";
import { PROGRAMMES, type Programme } from "@/lib/programmes";

const IMPORT_ISSUE_REASON_LABELS: Record<string, string> = {
  invalid_email: "Invalid email format",
  missing_name: "Missing student name",
  missing_student_number: "Missing student number",
  missing_programme: "Missing programme",
  duplicate_student_number_in_csv: "Duplicate student number in CSV",
  student_number_taken_in_course: "Student number already exists in this course",
};

const REQUIRED_ROSTER_HEADERS = ["email", "name", "student_number", "programme"] as const;

type CsvPreviewIssue = {
  rowNumber: number | null;
  reasonCode: string;
  reasonLabel: string;
  email: string;
  fullName: string;
  studentNumber: string;
  programme: string;
};

type CsvPreviewRow = {
  rowNumber: number;
  email: string;
  fullName: string;
  studentNumber: string;
  programme: string;
  isValid: boolean;
};

type CsvPreviewData = {
  fileName: string;
  headerRow: string[];
  missingHeaders: string[];
  rows: CsvPreviewRow[];
  issues: CsvPreviewIssue[];
};
interface RosterTabProps {
  course: Course;
  memberships: CourseMembership[];
  onRefresh: () => Promise<void>;
  focusImportCsvOnMount?: boolean;
  onConsumedFocusImportCsv?: () => void;
}

export function RosterTab({
  course,
  memberships,
  onRefresh,
  focusImportCsvOnMount = false,
  onConsumedFocusImportCsv,
}: RosterTabProps) {
  const [orgMembers, setOrgMembers] = useState<OrgMembership[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);    
  const [newRole, setNewRole] = useState<"co_lecturer" | "ta">("ta");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [noticeArea, setNoticeArea] = useState<"student" | "staff" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");
  const [showStaffSection, setShowStaffSection] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<string[]>([]);
  const [lastImportResult, setLastImportResult] = useState<ImportCsvResult | null>(null);
  const [selectedCsvFile, setSelectedCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewData | null>(null);
  const [isBuildingCsvPreview, setIsBuildingCsvPreview] = useState(false);
  const [notifyNewSubmissions, setNotifyNewSubmissions] = useState(true);
  const [isSavingNotifyNewSubmissions, setIsSavingNotifyNewSubmissions] = useState(false);
  const [notifyPrefError, setNotifyPrefError] = useState("");
  const [confirmRemoveMembershipId, setConfirmRemoveMembershipId] = useState<number | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [pendingGitHubClaims, setPendingGitHubClaims] = useState<CourseGitHubClaim[]>([]);
  const [isLoadingGitHubClaims, setIsLoadingGitHubClaims] = useState(false);
  const [gitHubClaimsError, setGitHubClaimsError] = useState("");
  const [claimActionId, setClaimActionId] = useState<number | null>(null);
  const [classrooms, setClassrooms] = useState<GitHubClassroom[]>([]);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false);
  const [githubClassroomsError, setGithubClassroomsError] = useState("");
  const [selectedClassroomId, setSelectedClassroomId] = useState<number | null>(
    course.github_classroom_id ?? null
  );
  const [isSavingClassroomBinding, setIsSavingClassroomBinding] = useState(false);
  const [selectedGitHubAssignmentId, setSelectedGitHubAssignmentId] = useState<number | null>(null);
  const [isRunningRosterSync, setIsRunningRosterSync] = useState(false);
  const [rosterSync, setRosterSync] = useState<GitHubRosterSync | null>(null);
  const [githubAssignments, setGithubAssignments] = useState<GitHubClassroomAssignment[]>([]);

  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentProgramme, setStudentProgramme] = useState<Programme | "">("");

  const enrollStudentsRef = useRef<HTMLDivElement>(null);
  const importCsvButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function loadOrgMembers() {
      setIsLoadingOrg(true);
      try {
        const data = await courseStaff.listOrgMembers(course.id);
        setOrgMembers(data);
      } catch (err) {
        reportError("Failed to load org members", err);
      } finally {
        setIsLoadingOrg(false);
      }
    }
    loadOrgMembers();
  }, [course.id]);

  useEffect(() => {
    setSelectedClassroomId(course.github_classroom_id ?? null);
  }, [course.github_classroom_id]);

  const refreshGitHubClaims = useCallback(async () => {
    setIsLoadingGitHubClaims(true);
    setGitHubClaimsError("");
    try {
      const claims = await staffCourseGitHub.listClaims(course.id, "pending");
      setPendingGitHubClaims(claims);
    } catch (err) {
      if (err instanceof ApiError) setGitHubClaimsError(err.detail);
      else setGitHubClaimsError("Failed to load GitHub linking requests");
    } finally {
      setIsLoadingGitHubClaims(false);
    }
  }, [course.id]);

  useEffect(() => {
    void refreshGitHubClaims();
  }, [refreshGitHubClaims]);

  const refreshGitHubClassrooms = useCallback(async () => {
    setIsLoadingClassrooms(true);
    setGithubClassroomsError("");
    try {
      const data = await staffCourseGitHub.listClassrooms(course.id);
      setClassrooms(data);
    } catch (err) {
      if (err instanceof ApiError) setGithubClassroomsError(err.detail);
      else setGithubClassroomsError("Failed to load GitHub classrooms");
    } finally {
      setIsLoadingClassrooms(false);
    }
  }, [course.id]);

  useEffect(() => {
    void refreshGitHubClassrooms();
  }, [refreshGitHubClassrooms]);

  useEffect(() => {
    if (!focusImportCsvOnMount) return;
    // Browsers may block opening a file picker without a direct user gesture,
    // so we scroll + focus the Import CSV button instead.
    enrollStudentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    importCsvButtonRef.current?.focus();
    onConsumedFocusImportCsv?.();
  }, [focusImportCsvOnMount, onConsumedFocusImportCsv]);

  useEffect(() => {
    let cancelled = false;
    async function loadNotificationPrefs() {
      try {
        const prefs = await courseStaff.getNotificationPreferences(course.id);
        if (cancelled) return;
        setNotifyNewSubmissions(Boolean(prefs.notify_new_submissions));
      } catch {
        // Default to enabled if prefs aren't available.
      }
    }
    loadNotificationPrefs();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const students = memberships.filter((m) => m.role === "student");
  const staffMembers = memberships.filter((m) => m.role !== "student");

  const pendingClaimByMembershipId = useMemo(() => {
    return new Map(pendingGitHubClaims.map((c) => [c.course_membership_id, c]));
  }, [pendingGitHubClaims]);

  const availableOrgMembers = useMemo(() => {
    const assigned = new Set(memberships.map((m) => m.user_id));
    const q = memberSearch.trim().toLowerCase();
    const filtered = orgMembers.filter((m) => {
      if (assigned.has(m.user_id)) return false;
      if (!q) return true;
      return (m.user_email ?? "").toLowerCase().includes(q);
    });
    return filtered.sort((a, b) => (a.user_email ?? "").localeCompare(b.user_email ?? ""));
  }, [orgMembers, memberships, memberSearch]);

  const resolvedInviteLinks = useMemo(() => {
    if (typeof window === "undefined") return inviteLinks;
    const origin = window.location.origin;
    return inviteLinks.map((link) => {
      if (link.startsWith("http://") || link.startsWith("https://")) return link;
      if (link.startsWith("/")) return `${origin}${link}`;
      return `${origin}/${link}`;
    });
  }, [inviteLinks]);

  async function approveGitHubClaim(claim: CourseGitHubClaim) {
    setClaimActionId(claim.id);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    try {
      await staffCourseGitHub.approveClaim(course.id, claim.id);
      await onRefresh();
      await refreshGitHubClaims();
      setSuccess(`Linked GitHub account @${claim.github_login}.`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to approve GitHub linking");
    } finally {
      setClaimActionId(null);
    }
  }

  async function rejectGitHubClaim(claim: CourseGitHubClaim) {
    setClaimActionId(claim.id);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    try {
      await staffCourseGitHub.rejectClaim(course.id, claim.id);
      await refreshGitHubClaims();
      setSuccess(`Rejected GitHub linking request from @${claim.github_login}.`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to reject GitHub linking");
    } finally {
      setClaimActionId(null);
    }
  }

  async function saveGitHubClassroomBinding() {
    setIsSavingClassroomBinding(true);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    try {
      const selected = selectedClassroomId
        ? classrooms.find((item) => item.id === selectedClassroomId) ?? null
        : null;
      await courseStaff.updateCourse(course.id, {
        github_classroom_id: selected?.id ?? null,
        github_classroom_name: selected?.name ?? null,
      });
      await onRefresh();
      setSuccess(selected ? `Bound to GitHub Classroom: ${selected.name}.` : "GitHub Classroom binding cleared.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to save classroom binding");
    } finally {
      setIsSavingClassroomBinding(false);
    }
  }

  async function runGitHubRosterSync() {
    setIsRunningRosterSync(true);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    try {
      const result = await staffCourseGitHub.getRosterSync(course.id, {
        classroom_id: selectedClassroomId ?? undefined,
        assignment_id: selectedGitHubAssignmentId ?? undefined,
      });
      setRosterSync(result);
      setGithubAssignments(result.assignments);
      setSuccess("GitHub roster sync check updated.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to run GitHub roster sync");
    } finally {
      setIsRunningRosterSync(false);
    }
  }

  useEffect(() => {
    if (!selectedClassroomId) {
      setGithubAssignments([]);
      setSelectedGitHubAssignmentId(null);
      return;
    }
    let cancelled = false;
    async function loadAssignments() {
      try {
        const result = await staffCourseGitHub.getRosterSync(course.id, {
          classroom_id: selectedClassroomId ?? undefined,
        });
        if (cancelled) return;
        setGithubAssignments(result.assignments);
        setRosterSync(result);
      } catch {
        // Assignment options are optional pre-check data.
      }
    }
    void loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [course.id, selectedClassroomId]);

  async function toggleNotifyNewSubmissions() {
    const next = !notifyNewSubmissions;
    setIsSavingNotifyNewSubmissions(true);
    setNotifyPrefError("");
    try {
      const updated = await courseStaff.setNotificationPreferences(course.id, {
        notify_new_submissions: next,
      });
      setNotifyNewSubmissions(Boolean(updated.notify_new_submissions));
    } catch (err) {
      if (err instanceof ApiError) setNotifyPrefError(err.detail);
      else setNotifyPrefError("Failed to update notification preferences");
    } finally {
      setIsSavingNotifyNewSubmissions(false);
    }
  }

  async function addStaffMember() {
    if (selectedUserId === null) return;
    setIsAddingStaff(true);
    setNoticeArea("staff");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    try {
      const payload: CourseMembershipCreate = { user_id: selectedUserId, role: newRole };
      await courseStaff.enrollUser(course.id, payload);
      await onRefresh();
      setSelectedUserId(null);
      setMemberSearch("");
      setSuccess("Staff member added.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to add staff member");
    } finally {
      setIsAddingStaff(false);
    }
  }

  async function updateRole(membershipId: number, role: CourseMembership["role"]) {
    setNoticeArea("staff");
    setError("");
    try {
      const payload: CourseMembershipUpdate = { role };
      await courseStaff.updateMembership(course.id, membershipId, payload);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to update role");
    }
  }

  function requestRemoveMember(membershipId: number) {
    setConfirmRemoveMembershipId(membershipId);
  }

  async function removeMemberConfirmed() {
    if (confirmRemoveMembershipId === null) return;
    setIsRemovingMember(true);
    setNoticeArea("staff");
    setError("");
    try {
      await courseStaff.removeMembership(course.id, confirmRemoveMembershipId);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to remove member");
    } finally {
      setIsRemovingMember(false);
      setConfirmRemoveMembershipId(null);
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addStudentByEmail() {
    const email = studentEmail.trim();
    const full_name = studentName.trim();
    const student_number = studentNumber.trim();
    const programme = studentProgramme.trim();
    if (!email || !full_name || !student_number || !programme) return;

    setIsAddingStudent(true);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    try {
      const res = await courseStaff.inviteStudentByEmail(course.id, {
        email,
        full_name,
        student_number,
        programme,
      });

      await onRefresh();

      if (res.auto_enrolled > 0) {
        setSuccess("Student enrolled (existing account).");
      } else if (res.created_invites > 0) {
        setSuccess(
          "Invite created (no email yet). Copy the invite link below and share it manually."
        );
        setInviteLinks(res.invite_links ?? []);
      } else {
        setSuccess("No invite created.");
      }

      setStudentEmail("");
      setStudentName("");
      setStudentNumber("");
      setStudentProgramme("");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to invite student");
    } finally {
      setIsAddingStudent(false);
    }
  }

  function parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        const next = line[i + 1];
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
          continue;
        }
        inQuotes = !inQuotes;
        continue;
      }
      if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    values.push(current);
    return values;
  }

  async function buildCsvPreview(file: File): Promise<CsvPreviewData> {
    const text = await file.text();
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

    const headerCells = parseCsvLine(lines[0] ?? "").map((value) => value.trim());
    const headerIndex = new Map<string, number>();
    headerCells.forEach((header, index) => {
      if (!header) return;
      const key = header.toLowerCase();
      if (!headerIndex.has(key)) {
        headerIndex.set(key, index);
      }
    });

    const missingHeaders = REQUIRED_ROSTER_HEADERS.filter((header) => !headerIndex.has(header));
    const issues: CsvPreviewIssue[] = missingHeaders.map((header) => ({
      rowNumber: null,
      reasonCode: "missing_required_headers",
      reasonLabel: `Missing required header: ${header}`,
      email: "",
      fullName: "",
      studentNumber: "",
      programme: "",
    }));

    const rows: CsvPreviewRow[] = [];
    const seenStudentNumbers = new Set<string>();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const getCellValue = (cells: string[], key: string): string => {
      const index = headerIndex.get(key);
      if (index === undefined) return "";
      return (cells[index] ?? "").trim();
    };

    for (let index = 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line || !line.trim()) continue;

      const rowNumber = index + 1;
      const cells = parseCsvLine(line);
      const email = getCellValue(cells, "email");
      const fullName = getCellValue(cells, "name");
      const studentNumber = getCellValue(cells, "student_number");
      const programme = getCellValue(cells, "programme");

      if (!email && !fullName && !studentNumber && !programme) continue;

      const rowIssues: CsvPreviewIssue[] = [];
      const pushRowIssue = (reasonCode: string, reasonLabel: string) => {
        rowIssues.push({
          rowNumber,
          reasonCode,
          reasonLabel,
          email,
          fullName,
          studentNumber,
          programme,
        });
      };

      if (!email || !emailRegex.test(email)) {
        pushRowIssue("invalid_email", IMPORT_ISSUE_REASON_LABELS.invalid_email);
      }
      if (!fullName) {
        pushRowIssue("missing_name", IMPORT_ISSUE_REASON_LABELS.missing_name);
      }
      if (!studentNumber) {
        pushRowIssue("missing_student_number", IMPORT_ISSUE_REASON_LABELS.missing_student_number);
      }
      if (!programme) {
        pushRowIssue("missing_programme", IMPORT_ISSUE_REASON_LABELS.missing_programme);
      }
      if (studentNumber) {
        if (seenStudentNumbers.has(studentNumber)) {
          pushRowIssue(
            "duplicate_student_number_in_csv",
            IMPORT_ISSUE_REASON_LABELS.duplicate_student_number_in_csv
          );
        } else {
          seenStudentNumbers.add(studentNumber);
        }
      }

      issues.push(...rowIssues);
      rows.push({
        rowNumber,
        email,
        fullName,
        studentNumber,
        programme,
        isValid: rowIssues.length === 0 && missingHeaders.length === 0,
      });
    }

    return {
      fileName: file.name,
      headerRow: headerCells,
      missingHeaders,
      rows,
      issues,
    };
  }

  async function handleCsvFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setNoticeArea("student");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    setLastImportResult(null);
    setSelectedCsvFile(file);
    setIsBuildingCsvPreview(true);

    try {
      const preview = await buildCsvPreview(file);
      setCsvPreview(preview);

      const rowIssueCount = preview.issues.filter((issue) => issue.rowNumber !== null).length;
      if (preview.missingHeaders.length > 0) {
        setError(
          `Preview failed: missing headers (${preview.missingHeaders.join(", ")}). Download the template and retry.`
        );
      } else {
        const validRows = preview.rows.filter((row) => row.isValid).length;
        setSuccess(
          `Preview ready: ${preview.rows.length} row(s), ${validRows} valid, ${rowIssueCount} row issue(s).`
        );
      }
    } catch {
      setCsvPreview(null);
      setSelectedCsvFile(null);
      setError("Failed to parse CSV preview. Check file encoding/format and try again.");
    } finally {
      setIsBuildingCsvPreview(false);
    }
  }

  async function importSelectedCsv() {
    if (!selectedCsvFile || !csvPreview) {
      setNoticeArea("student");
      setError("Select and preview a CSV file first.");
      return;
    }
    if (csvPreview.missingHeaders.length > 0) {
      setNoticeArea("student");
      setError("Cannot import: CSV is missing required headers.");
      return;
    }

    setIsAddingStudent(true);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    setLastImportResult(null);
    try {
      const res = await courseStaff.importRosterCsv(course.id, selectedCsvFile);
      setLastImportResult(res);
      const msg = `Imported: ${res.created_invites} invites created, ${res.auto_enrolled} auto-enrolled.`;
      if (res.issues.length > 0) {
        setError(`${msg} Some rows had issues.`);
      } else {
        setSuccess(msg);
      }
      if ((res.invite_links ?? []).length > 0) setInviteLinks(res.invite_links);
      await onRefresh();
      setSelectedCsvFile(null);
      setCsvPreview(null);
    } catch (err) {
      setLastImportResult(null);
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to import CSV");
    } finally {
      setIsAddingStudent(false);
    }
  }

  async function copyInviteLinksAll() {
    setNoticeArea("student");
    try {
      await navigator.clipboard.writeText(resolvedInviteLinks.join("\n"));
      setSuccess("Invite links copied to clipboard.");
    } catch {
      setError("Failed to copy invite links.");
    }
  }

  async function copyInviteLink(link: string) {
    setNoticeArea("student");
    try {
      await navigator.clipboard.writeText(link);
      setSuccess("Invite link copied.");
    } catch {
      setError("Failed to copy invite link.");
    }
  }

  function escapeCsvCell(value: string): string {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  function downloadCsv(filename: string, header: string[], rows: string[][]) {
    const lines = [header, ...rows]
      .map((cols) => cols.map((col) => escapeCsvCell(col)).join(","))
      .join("\n");
    const blob = new Blob([lines], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    co_lecturer: "Co-Lecturer",
    ta: "TA",
    student: "Student",
  };

  const importIssues = useMemo(() => {
    const rawIssues = (lastImportResult?.issues ?? []) as ImportCsvIssue[];
    return rawIssues.map((issue, idx) => {
      const reasonCode = issue.reason || "unknown";
      const fullName = (issue.full_name ?? "").trim();
      const studentNumber = (issue.student_number ?? "").trim();
      const programme = (issue.programme ?? "").trim();
      const rowNumber = typeof issue.row_number === "number" ? issue.row_number : null;
      return {
        key: `${String(issue.email ?? "unknown")}-${reasonCode}-${idx}`,
        email: issue.email?.trim() ? issue.email : "(unknown)",
        rowNumber,
        fullName,
        studentNumber,
        programme,
        reasonCode,
        reasonLabel: IMPORT_ISSUE_REASON_LABELS[reasonCode] ?? reasonCode,
      };
    });
  }, [lastImportResult?.issues]);

  const previewIssues = useMemo(() => {
    if (!csvPreview) return [];
    return csvPreview.issues.map((issue, idx) => ({
      key: `preview-${issue.rowNumber ?? "header"}-${issue.reasonCode}-${idx}`,
      email: issue.email?.trim() ? issue.email : "(unknown)",
      rowNumber: issue.rowNumber,
      fullName: issue.fullName,
      studentNumber: issue.studentNumber,
      programme: issue.programme,
      reasonCode: issue.reasonCode,
      reasonLabel: issue.reasonLabel,
    }));
  }, [csvPreview]);

  const rosterIssues = importIssues.length > 0 ? importIssues : previewIssues;
  const issueSourceLabel = importIssues.length > 0 ? "Import issues" : "Preview issues";

  function downloadIssueReportCsv() {
    if (rosterIssues.length === 0) return;
    const rows = rosterIssues.map((issue) => [
      issue.rowNumber === null ? "" : String(issue.rowNumber),
      issue.email,
      issue.fullName,
      issue.studentNumber,
      issue.programme,
      issue.reasonCode,
      issue.reasonLabel,
    ]);
    downloadCsv(
      `roster-import-issues-${course.code.toLowerCase()}.csv`,
      ["row_number", "email", "name", "student_number", "programme", "reason_code", "reason"],
      rows
    );
    setNoticeArea("student");
    setSuccess("Issue report CSV downloaded.");
  }

  function downloadCorrectionCsv() {
    if (rosterIssues.length === 0) return;
    const rows = rosterIssues.map((issue) => [
      issue.email === "(unknown)" ? "" : issue.email,
      issue.fullName,
      issue.studentNumber,
      issue.programme,
    ]);
    downloadCsv(
      `roster-corrections-${course.code.toLowerCase()}.csv`,
      ["email", "name", "student_number", "programme"],
      rows
    );
    setNoticeArea("student");
    setSuccess("Correction CSV downloaded. Fix rows and re-import.");
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Notifications */}
      <div className="order-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-1">Notifications</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              New submissions are grouped into a digest (10-minute window).
            </p>
          </div>
          <button
            type="button"
            onClick={toggleNotifyNewSubmissions}
            disabled={isSavingNotifyNewSubmissions}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyNewSubmissions ? "bg-[var(--primary)]" : "bg-[var(--border)]"} disabled:opacity-60`}
            aria-label="Toggle new submission notifications"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyNewSubmissions ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
        {notifyPrefError && (
          <div className="mt-3 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {notifyPrefError}
          </div>
        )}
      </div>

      <div className="order-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowStaffSection((v) => !v)}
          className="w-full p-4 bg-[var(--background)] flex items-center justify-between"
        >
          <h3 className="font-medium text-[var(--foreground)]">
            Staff ({staffMembers.length})
          </h3>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {showStaffSection ? "Hide" : "Show"}
            {showStaffSection ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>
      </div>

      {showStaffSection && (
        <>
          {/* Add Staff */}
          <div className="order-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="font-medium text-[var(--foreground)] mb-1">Add staff</h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Staff are selected from organization members. Students are enrolled via invites (above).
        </p>
        {noticeArea === "staff" && error && (
          <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {error}
          </div>
        )}
        {noticeArea === "staff" && success && (
          <div className="mb-4 p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl text-sm text-[var(--success)]">
            {success}
          </div>
        )}
        <div className="grid md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Select staff member
            </label>
            <select
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
              required
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              disabled={isLoadingOrg}
            >
              <option value="">
                {isLoadingOrg
                  ? "Loading users..."
                  : availableOrgMembers.length === 0
                    ? "No eligible users found"
                    : "Select a user..."}
              </option>
              {availableOrgMembers.map((m) => (
                <option key={m.id} value={m.user_id}>
                  {(m.user_email ?? `User #${m.user_id}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Staff role
            </label>
            <select
              value={newRole}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "ta" || value === "co_lecturer") setNewRole(value);
              }}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="ta">TA</option>
              <option value="co_lecturer">Co-Lecturer</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              onClick={addStaffMember}
              disabled={isAddingStaff || selectedUserId === null}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add staff
            </button>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="order-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[var(--background)] border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="font-medium text-[var(--foreground)]">
            Staff ({staffMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {staffMembers.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">No staff members</div>
          ) : (
            staffMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--background)] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {member.user_email || `User #${member.user_id}`}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {roleLabels[member.role]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select
                    value={member.role}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "owner" || value === "co_lecturer" || value === "ta") {
                        updateRole(member.id, value);
                      }
                    }}
                    className="text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] px-2 py-1"
                  >
                    <option value="owner">Owner</option>
                    <option value="co_lecturer">Co-Lecturer</option>
                    <option value="ta">TA</option>
                  </select>
                  <button
                    onClick={() => requestRemoveMember(member.id)}
                    className="p-2 text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

        </>
      )}

      {/* Enroll Students */}
      <div
        ref={enrollStudentsRef}
        className="order-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
      >
        <div className="mb-4">
          <h3 className="font-medium text-[var(--foreground)] mb-1">Enroll students</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Use bulk CSV intake for class reps, then use manual invite for one-off corrections.
          </p>
        </div>

        {noticeArea === "student" && error && (
          <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {error}
          </div>
        )}
        {noticeArea === "student" && success && (
          <div className="mb-4 p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl text-sm text-[var(--success)]">
            {success}
          </div>
        )}

        <div className="grid xl:grid-cols-5 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              <Upload className="w-3.5 h-3.5" />
              Bulk import
            </div>
            <p className="mt-3 text-sm text-[var(--foreground)]">
              Upload roster CSV with profile data for each student.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["email", "name", "student_number", "programme"].map((column) => (
                <span
                  key={column}
                  className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-2.5 py-1 text-[11px] font-mono text-[var(--foreground)]"
                >
                  {column}
                </span>
              ))}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".csv"
              onChange={handleCsvFileSelected}
            />
            <div className="mt-4 grid gap-2">
              <button
                ref={importCsvButtonRef}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAddingStudent || isBuildingCsvPreview}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-white disabled:opacity-60 transition-colors text-sm"
              >
                {isBuildingCsvPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Select CSV
              </button>
              <button
                type="button"
                onClick={importSelectedCsv}
                disabled={
                  isAddingStudent ||
                  !selectedCsvFile ||
                  !csvPreview ||
                  csvPreview.missingHeaders.length > 0
                }
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isAddingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Import previewed CSV
              </button>
              <a
                href="/templates/roster-template.csv"
                download
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-white transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download template
              </a>
            </div>
            <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">
              Required headers: <code>email,name,student_number,programme</code>
            </p>
            {csvPreview && (
              <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="text-xs font-semibold text-[var(--foreground)] break-all">
                  Preview file: {csvPreview.fileName}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Header check:{" "}
                  {csvPreview.missingHeaders.length === 0 ? (
                    <span className="text-[var(--success)] font-semibold">Pass</span>
                  ) : (
                    <span className="text-[var(--secondary)] font-semibold">
                      Missing {csvPreview.missingHeaders.join(", ")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Rows parsed: {csvPreview.rows.length} | Row issues:{" "}
                  {csvPreview.issues.filter((issue) => issue.rowNumber !== null).length}
                </p>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-sm font-semibold text-[var(--foreground)]">Manual invite</p>
              <p className="required-hint">* Required fields</p>
            </div>
            <div className="grid md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Email
                </label>
                <input
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                  className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Full name
                </label>
                <input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Student #
                </label>
                <input
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  placeholder="2100714449"
                  required
                  className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Programme
                </label>
                <select
                  value={studentProgramme}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStudentProgramme(value ? (value as Programme) : "");
                  }}
                  required
                  className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                >
                  <option value="">Select programme...</option>
                  {PROGRAMMES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-12">
                <button
                  type="button"
                  onClick={addStudentByEmail}
                  disabled={
                    isAddingStudent ||
                    !studentEmail.trim() ||
                    !studentName.trim() ||
                    !studentNumber.trim() ||
                    !studentProgramme
                  }
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isAddingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Enroll / invite student
                </button>
                <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                  Existing accounts auto-enroll immediately. New students get invite links valid for 7 days.
                </p>
              </div>
            </div>
          </div>
        </div>

        {csvPreview && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                CSV Preview
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                Standards:{" "}
                {csvPreview.missingHeaders.length === 0 ? (
                  <span className="font-semibold text-[var(--success)]">Header check passed</span>
                ) : (
                  <span className="font-semibold text-[var(--secondary)]">Header check failed</span>
                )}
              </p>
            </div>

            {csvPreview.rows.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No data rows found in this file.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <table className="w-full min-w-[680px] text-xs">
                  <thead className="bg-[var(--background)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-[var(--muted-foreground)]">Row</th>
                      <th className="text-left px-3 py-2 font-semibold text-[var(--muted-foreground)]">Email</th>
                      <th className="text-left px-3 py-2 font-semibold text-[var(--muted-foreground)]">Name</th>
                      <th className="text-left px-3 py-2 font-semibold text-[var(--muted-foreground)]">Student #</th>
                      <th className="text-left px-3 py-2 font-semibold text-[var(--muted-foreground)]">Programme</th>
                      <th className="text-left px-3 py-2 font-semibold text-[var(--muted-foreground)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {csvPreview.rows.slice(0, 12).map((row) => (
                      <tr key={`${row.rowNumber}-${row.email}-${row.studentNumber}`}>
                        <td className="px-3 py-2 text-[var(--muted-foreground)]">{row.rowNumber}</td>
                        <td className="px-3 py-2 text-[var(--foreground)] break-all">{row.email || "-"}</td>
                        <td className="px-3 py-2 text-[var(--foreground)]">{row.fullName || "-"}</td>
                        <td className="px-3 py-2 text-[var(--foreground)]">{row.studentNumber || "-"}</td>
                        <td className="px-3 py-2 text-[var(--foreground)]">{row.programme || "-"}</td>
                        <td className="px-3 py-2">
                          {row.isValid ? (
                            <span className="inline-flex rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
                              Valid
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-[var(--secondary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary)]">
                              Needs fix
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {csvPreview.rows.length > 12 && (
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                Showing first 12 rows of {csvPreview.rows.length}.
              </p>
            )}
          </div>
        )}

        {lastImportResult && (
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-3">
              Import result
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">Invites</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">{lastImportResult.created_invites}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">Auto-enrolled</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">{lastImportResult.auto_enrolled}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">Rows with issues</p>
                <p className="text-lg font-semibold text-[var(--secondary)]">{importIssues.length}</p>
              </div>
            </div>
          </div>
        )}

        {rosterIssues.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--secondary)]/30 bg-[var(--secondary)]/5 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Rows needing correction ({issueSourceLabel})
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadIssueReportCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11px] text-[var(--foreground)] hover:bg-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download issues
                </button>
                <button
                  type="button"
                  onClick={downloadCorrectionCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[11px] text-[var(--foreground)] hover:bg-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download correction CSV
                </button>
              </div>
            </div>
            <div className="space-y-2">
              {rosterIssues.slice(0, 8).map((issue) => (
                <div
                  key={issue.key}
                  className="rounded-lg border border-[var(--secondary)]/20 bg-[var(--card)] px-3 py-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {issue.rowNumber !== null && (
                        <span className="inline-flex rounded-full bg-[var(--secondary)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary)]">
                          Row {issue.rowNumber}
                        </span>
                      )}
                      <code className="text-xs text-[var(--foreground)] break-all">{issue.email}</code>
                    </div>
                    <p className="text-xs text-[var(--secondary)]">{issue.reasonLabel}</p>
                  </div>
                  {(issue.fullName || issue.studentNumber || issue.programme) && (
                    <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                      {issue.fullName ? `Name: ${issue.fullName}` : "Name: -"} |{" "}
                      {issue.studentNumber ? `Student #: ${issue.studentNumber}` : "Student #: -"} |{" "}
                      {issue.programme ? `Programme: ${issue.programme}` : "Programme: -"}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {importIssues.length === 0 && (
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                These are preview checks before import. Fix rows and then import.
              </p>
            )}
            {importIssues.length > 0 && (
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                Download correction CSV, fix rows, then import the corrected file.
              </p>
            )}
          </div>
        )}

        {resolvedInviteLinks.length > 0 && (
          <div className="mt-4 p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Invite links</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  No email provider configured yet. Share these links manually with students.
                </p>
              </div>
              <button
                type="button"
                onClick={copyInviteLinksAll}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card)]/70 transition-colors text-xs"
              >
                Copy all
              </button>
            </div>
            <div className="space-y-2">
              {resolvedInviteLinks.map((link) => (
                <div
                  key={link}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)]"
                >
                  <code className="text-xs text-[var(--foreground)] break-all">{link}</code>
                  <button
                    type="button"
                    onClick={() => copyInviteLink(link)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors text-xs"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* GitHub Classroom Sync */} 
      <div className="order-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-1">GitHub Classroom sync</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Bind this course to a GitHub Classroom and compare linked student logins with accepted assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshGitHubClassrooms()}
            disabled={isLoadingClassrooms}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-60 transition-colors text-xs"
          >
            {isLoadingClassrooms ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh classrooms
          </button>
        </div>

        {githubClassroomsError && (
          <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {githubClassroomsError}
          </div>
        )}

        <div className="grid md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-8">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Classroom
            </label>
            <select
              value={selectedClassroomId ?? ""}
              onChange={(e) => setSelectedClassroomId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
            >
              <option value="">Not bound</option>
              {classrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <button
              type="button"
              onClick={() => void saveGitHubClassroomBinding()}
              disabled={isSavingClassroomBinding}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 transition-colors"
            >
              {isSavingClassroomBinding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save binding
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-12 gap-3 items-end mt-4">
          <div className="md:col-span-8">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Assignment (for accepted-student check)
            </label>
            <select
              value={selectedGitHubAssignmentId ?? ""}
              onChange={(e) => setSelectedGitHubAssignmentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]"
              disabled={!selectedClassroomId}
            >
              <option value="">No assignment selected</option>
              {githubAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.title}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-4">
            <button
              type="button"
              onClick={() => void runGitHubRosterSync()}
              disabled={isRunningRosterSync || !selectedClassroomId}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-60 transition-colors"
            >
              {isRunningRosterSync ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Run sync check
            </button>
          </div>
        </div>

        {rosterSync && (
          <div className="mt-4 p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Linked</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">{rosterSync.linked_students_total}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Accepted</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">{rosterSync.accepted_students_total}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Missing</p>
                <p className="text-lg font-semibold text-[var(--secondary)]">{rosterSync.missing_logins.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">Unlinked</p>
                <p className="text-lg font-semibold text-[var(--foreground)]">{rosterSync.missing_github_students.length}</p>
              </div>
            </div>

            {rosterSync.assignments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--muted-foreground)]">Assignment invite links</p>
                <div className="space-y-2">
                  {rosterSync.assignments.slice(0, 6).map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                      <div className="min-w-0">
                        <p className="text-sm text-[var(--foreground)] truncate">{assignment.title}</p>
                        {assignment.deadline && (
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            deadline: {new Date(assignment.deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {assignment.invite_link ? (
                        <a
                          href={assignment.invite_link}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-[var(--border)] rounded-lg hover:bg-[var(--background)]"
                        >
                          Open invite
                        </a>
                      ) : (
                        <span className="text-[10px] text-[var(--muted-foreground)]">No invite link</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Student List */}
      <div className="order-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[var(--background)] border-b border-[var(--border)]">
          <h3 className="font-medium text-[var(--foreground)]">
            Students ({students.length})
          </h3>
        </div>
        <div className="px-4 py-3 bg-[var(--card)] border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--muted-foreground)]">
            GitHub linking requests:{" "}
            <span className="font-medium text-[var(--foreground)]">{pendingGitHubClaims.length}</span>{" "}
            pending
          </div>
          <button
            type="button"
            onClick={() => void refreshGitHubClaims()}
            disabled={isLoadingGitHubClaims}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-60 transition-colors text-xs"
          >
            {isLoadingGitHubClaims ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
        </div>
        {gitHubClaimsError && (
          <div className="mx-4 mt-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {gitHubClaimsError}
          </div>
        )}
        <div className="divide-y divide-[var(--border)]">
          {students.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
              <p className="text-[var(--muted-foreground)]">No students enrolled yet</p>
            </div>
          ) : (
            students.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--background)] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {member.user_email || `User #${member.user_id}`}
                    </p>
                    {member.student_number && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {member.student_number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {member.github_login ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] rounded-full">
                      <LinkIcon className="w-3.5 h-3.5" />
                      @{member.github_login}
                    </span>
                  ) : pendingClaimByMembershipId.has(member.id) ? (
                    (() => {
                      const claim = pendingClaimByMembershipId.get(member.id)!;
                      const isBusy = claimActionId === claim.id;
                      return (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[var(--warning)]/10 text-[var(--warning)] rounded-full">
                            <LinkIcon className="w-3.5 h-3.5" />
                            Request: @{claim.github_login}
                          </span>
                          <button
                            onClick={() => void approveGitHubClaim(claim)}
                            disabled={isBusy}
                            className="px-2.5 py-1 text-xs font-medium bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {isBusy ? "Working..." : "Approve"}
                          </button>
                          <button
                            onClick={() => void rejectGitHubClaim(claim)}
                            disabled={isBusy}
                            className="px-2.5 py-1 text-xs font-medium border border-[var(--border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--background)] transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-[var(--background)] text-[var(--muted-foreground)] border border-[var(--border)] rounded-full">
                      <LinkIcon className="w-3.5 h-3.5" />
                      Not linked
                    </span>
                  )}

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => requestRemoveMember(member.id)}
                      className="p-2 text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                      title="Remove student"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmRemoveMembershipId !== null}
        onClose={() => setConfirmRemoveMembershipId(null)}
        onConfirm={() => void removeMemberConfirmed()}
        title="Remove member?"
        description="This will remove the member from the course. Continue?"
        confirmLabel="Remove"
        confirmVariant="danger"
        isLoading={isRemovingMember}
      />
    </div >
  );
}

// Assignments Tab
