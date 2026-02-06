from app.models.assignment import Assignment


def test_assignment_model_has_expected_columns() -> None:
    columns = {column.name for column in Assignment.__table__.columns}
    assert {
        "id",
        "course_id",
        "module_id",
        "title",
        "description",
        "due_date",
        "max_points",
        "late_policy",
        "autograde_mode",
        "active_autograde_version_id",
        "final_autograde_enqueued_at",
        "final_autograde_version_id",
        "allows_zip",
        "expected_filename",
        "compile_command",
    }.issubset(columns)
