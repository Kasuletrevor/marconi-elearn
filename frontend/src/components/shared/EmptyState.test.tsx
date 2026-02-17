import { FileText } from "lucide-react";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders icon, title, description, and action", () => {
    render(
      <EmptyState
        icon={FileText}
        title="No submissions"
        description="Try adjusting filters."
        action={<button type="button">Reset</button>}
      />
    );

    expect(screen.getByRole("heading", { name: "No submissions" })).toBeInTheDocument();
    expect(screen.getByText("Try adjusting filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });
});
