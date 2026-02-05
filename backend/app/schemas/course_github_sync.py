from pydantic import BaseModel


class GitHubClassroomOut(BaseModel):
    id: int
    name: str
    archived_at: str | None = None


class GitHubClassroomAssignmentOut(BaseModel):
    id: int
    title: str
    invite_link: str | None = None
    deadline: str | None = None


class GitHubMissingLinkStudentOut(BaseModel):
    membership_id: int
    user_id: int
    user_email: str | None = None
    student_number: str | None = None


class GitHubRosterSyncOut(BaseModel):
    course_id: int
    bound_classroom_id: int | None = None
    bound_classroom_name: str | None = None
    selected_classroom_id: int | None = None
    selected_assignment_id: int | None = None
    classrooms: list[GitHubClassroomOut]
    assignments: list[GitHubClassroomAssignmentOut]
    linked_students_total: int
    accepted_students_total: int
    matched_logins: list[str]
    missing_logins: list[str]
    extra_logins: list[str]
    missing_github_students: list[GitHubMissingLinkStudentOut]
