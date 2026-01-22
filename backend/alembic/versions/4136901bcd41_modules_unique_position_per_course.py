"""modules unique position per course

Revision ID: 4136901bcd41
Revises: 1a0dedc776fd
Create Date: 2026-01-22 16:50:56.225612

"""

from alembic import op
import sqlalchemy as sa


revision = '4136901bcd41'
down_revision = '1a0dedc776fd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, course_id FROM modules ORDER BY course_id, position, id")
    ).fetchall()

    current_course_id: int | None = None
    next_pos = 0
    for row in rows:
        if row.course_id != current_course_id:
            current_course_id = row.course_id
            next_pos = 0
        next_pos += 1
        conn.execute(
            sa.text("UPDATE modules SET position = :pos WHERE id = :id"),
            {"pos": next_pos, "id": row.id},
        )

    op.create_unique_constraint(
        "uq_modules_course_id_position",
        "modules",
        ["course_id", "position"],
        deferrable=True,
        initially="DEFERRED",
    )


def downgrade() -> None:
    op.drop_constraint("uq_modules_course_id_position", "modules", type_="unique")
