import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("guest sample room", () => {
  it("shows a concise judge-demo checklist on the landing page", () => {
    render(<Home />);

    expect(screen.getByText("Judge demo checklist")).toBeTruthy();
    expect(screen.getByText("Try a wrong answer and reveal a hint.")).toBeTruthy();
    expect(screen.getByText("Challenge a result, then inspect the dashboard.")).toBeTruthy();
  });

  it("lets a guest retry, appeal, complete every stage, and open the final lock", async () => {
    const user = userEvent.setup();

    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Try sample room" }));

    await user.click(screen.getByRole("button", { name: "File report" }));
    expect(screen.getByText("Reopen the case")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Challenge this result" }));
    await user.type(
      screen.getByRole("textbox", { name: "Optional explanation" }),
      "I think my correction follows the rule.",
    );
    await user.click(screen.getByRole("button", { name: "Submit challenge" }));
    expect(screen.getByText("Awaiting review")).toBeTruthy();

    const sentenceInput = screen.getByRole("textbox", {
      name: "Correct the sentence",
    });
    await user.clear(sentenceInput);
    await user.type(
      sentenceInput,
      "The team is reviewing the witness notes before lunch.",
    );
    await user.click(screen.getByRole("button", { name: "File report" }));
    await user.click(
      screen.getByRole("button", { name: "Inspect next evidence" }),
    );

    const evidenceAnswers = [
      ["The clues are inside the blue folder.", "Agrees"],
      ["A stack of reports are on the desk.", "Needs revision"],
      ["Each witness has a numbered badge.", "Agrees"],
      ["The detective and the clerk is checking prints.", "Needs revision"],
    ] as const;

    for (const [sentence, answer] of evidenceAnswers) {
      const card = screen.getByText(sentence).parentElement;
      expect(card).toBeTruthy();
      await user.click(within(card!).getByRole("button", { name: answer }));
    }

    await user.click(screen.getByRole("button", { name: "Submit evidence" }));
    await user.click(
      screen.getByRole("button", { name: "Inspect next evidence" }),
    );

    const rewriteOne = screen.getByRole("textbox", {
      name: "Rewrite sentence 1",
    });
    const rewriteTwo = screen.getByRole("textbox", {
      name: "Rewrite sentence 2",
    });
    await user.clear(rewriteOne);
    await user.type(rewriteOne, "Neither the map nor the notebook was in the drawer.");
    await user.clear(rewriteTwo);
    await user.type(rewriteTwo, "The clues were nearby.");
    await user.click(screen.getByRole("button", { name: "Submit case file" }));

    await user.click(screen.getByRole("button", { name: "CASE" }));
    await user.click(screen.getByRole("button", { name: "FILE" }));
    await user.click(screen.getByRole("button", { name: "OPEN" }));
    await user.click(screen.getByRole("button", { name: "Unlock cabinet" }));

    expect(screen.getByRole("heading", { name: "Case closed." })).toBeTruthy();
  });
});
