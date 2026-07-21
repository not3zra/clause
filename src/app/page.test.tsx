import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(cleanup);

describe("landing and sample mission", () => {
  it("introduces Clause and exposes the sample mission", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /Turn grammar practice into an adventure/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try sample room" })).toBeTruthy();
    expect(screen.getByText("AI-generated rooms")).toBeTruthy();
  });

  it("lets a guest complete every stage and open the final lock", async () => {
    const user = userEvent.setup();

    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Try sample room" }));
    await user.click(screen.getByRole("button", { name: "Begin mission" }));

    const sentenceInput = screen.getByRole("textbox", {
      name: "Correct the sentence",
    });
    await user.clear(sentenceInput);
    await user.type(
      sentenceInput,
      "The team is reviewing the witness notes before lunch.",
    );
    await user.click(screen.getByRole("button", { name: "File report" }));
    expect(await screen.findByText("Evidence verified")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Continue to next stage" }),
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
    expect(await screen.findByText("Evidence verified")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Continue to next stage" }),
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
    expect(await screen.findByText("Evidence verified")).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: "Continue to next stage" }),
    );

    await user.click(screen.getByRole("button", { name: "CASE" }));
    await user.click(screen.getByRole("button", { name: "FILE" }));
    await user.click(screen.getByRole("button", { name: "OPEN" }));
    await user.click(screen.getByRole("button", { name: "Unlock cabinet" }));

    expect(screen.getByRole("heading", { name: "Case closed." })).toBeTruthy();
  });
});
