import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AssignmentCalendar } from "./AssignmentCalendar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("AssignmentCalendar", () => {
  it("renders loading state", () => {
    const { container } = render(<AssignmentCalendar events={[]} isLoading />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("renders error state and retry action", () => {
    const onRetry = vi.fn();
    render(<AssignmentCalendar events={[]} error="Failed to load" onRetry={onRetry} />);

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
    screen.getByRole("button", { name: "Retry" }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders empty state message", () => {
    render(<AssignmentCalendar events={[]} emptyMessage="No deadlines yet." />);
    expect(screen.getByText("No deadlines yet.")).toBeInTheDocument();
  });
});
