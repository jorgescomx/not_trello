export type Label = { id: string; name: string; color: string };
export type CardLabel = { label: Label };
export type Card = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  listId: string;
  swimlaneId: string | null;
  labels: CardLabel[];
};
export type List = {
  id: string;
  title: string;
  position: number;
  boardId: string;
  cards: Card[];
};
export type Swimlane = {
  id: string;
  title: string;
  position: number;
  color: string;
  boardId: string;
};
export type Board = {
  id: string;
  title: string;
  color: string;
  lists: List[];
  swimlanes: Swimlane[];
};
