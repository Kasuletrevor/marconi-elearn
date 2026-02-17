import { render, screen } from "@testing-library/react";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders title, description, and action", () => {
    render(
      <PageHeader
        title="Staff Dashboard"
        description="Manage grading and submissions."
        action={<button type="button">Refresh</button>}
      />
    );

    expect(screen.getByRole("heading", { name: "Staff Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Manage grading and submissions.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  it("renders without optional props", () => {
    render(<PageHeader title="Calendar" />);
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
  });
});
