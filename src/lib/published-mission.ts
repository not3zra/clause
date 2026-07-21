import type { RoomStage } from "./room-stages";

export type PublishedRoomStage = {
  id: string;
  ordinal: number;
  title: string;
  prompt: string;
  rule: string;
  token: string;
  item_type: RoomStage["itemType"];
  accepted_answers: string[];
  rubric: string;
  hints: string[];
  items: Array<{ prompt: string; accepted_answers: string[] }>;
};

export type PlayableRoomStage = RoomStage & { id: string };

export function publishedMissionStages(stages: PublishedRoomStage[]): PlayableRoomStage[] {
  return [...stages]
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((stage) => ({
      id: stage.id,
      ordinal: stage.ordinal,
      title: stage.title,
      prompt: stage.prompt,
      rule: stage.rule,
      token: stage.token,
      itemType: stage.item_type,
      acceptedAnswers: stage.accepted_answers,
      rubric: stage.rubric,
      hints: stage.hints,
      items: stage.items.map((item) => ({ prompt: item.prompt, acceptedAnswers: item.accepted_answers })),
    }));
}
