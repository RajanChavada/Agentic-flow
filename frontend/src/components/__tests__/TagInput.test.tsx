import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TagInput from "../ui/TagInput";

describe("TagInput", () => {
  test("renders input with placeholder", () => {
    render(
      <TagInput value={[]} onChange={vi.fn()} placeholder="Type action..." />
    );
    expect(screen.getByPlaceholderText("Type action...")).toBeInTheDocument();
  });

  test("displays existing tags as chips", () => {
    render(<TagInput value={["approve", "reject"]} onChange={vi.fn()} />);
    expect(screen.getByText("approve")).toBeInTheDocument();
    expect(screen.getByText("reject")).toBeInTheDocument();
  });

  test("adds tag on Enter", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} placeholder="Type action..." />);

    const input = screen.getByPlaceholderText("Type action...");
    fireEvent.change(input, { target: { value: "approve" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).toHaveBeenCalledWith(["approve"]);
  });

  test("rejects empty input on Enter", () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} placeholder="Type action..." />);

    const input = screen.getByPlaceholderText("Type action...");
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });

  test("rejects duplicate case-insensitively", () => {
    const onChange = vi.fn();
    render(
      <TagInput value={["approve"]} onChange={onChange} placeholder="Type action..." />
    );

    const input = screen.getByPlaceholderText("Type action...");
    fireEvent.change(input, { target: { value: "Approve" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });

  test("removes tag on X click", () => {
    const onChange = vi.fn();
    render(<TagInput value={["approve", "reject"]} onChange={onChange} />);

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // Click first X button

    expect(onChange).toHaveBeenCalledWith(["reject"]);
  });

  test("backspace on empty removes last tag", () => {
    const onChange = vi.fn();
    render(
      <TagInput value={["approve", "reject"]} onChange={onChange} placeholder="Type action..." />
    );

    const input = screen.getByPlaceholderText("Type action...");
    // Ensure input is empty (no change event)
    fireEvent.keyDown(input, { key: "Backspace" });

    expect(onChange).toHaveBeenCalledWith(["approve"]);
  });

  test("shows helper text when empty", () => {
    render(<TagInput value={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/Define allowed actions/)).toBeInTheDocument();
  });

  test("respects maxTags", () => {
    const onChange = vi.fn();
    render(
      <TagInput
        value={["a", "b"]}
        onChange={onChange}
        maxTags={2}
        placeholder="Type action..."
      />
    );

    const input = screen.getByPlaceholderText("Type action...");
    fireEvent.change(input, { target: { value: "c" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
  });
});
