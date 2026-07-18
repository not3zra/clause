export type ClassInput = {
  name: string;
  grade: number;
};

type ValidClassInput = {
  ok: true;
  value: ClassInput;
};

type InvalidClassInput = {
  ok: false;
  errors: Partial<Record<keyof ClassInput, string>>;
};

export function validateClassInput(input: ClassInput): ValidClassInput | InvalidClassInput {
  const name = input.name.trim();
  const errors: InvalidClassInput["errors"] = {};

  if (!name) {
    errors.name = "Enter a class name.";
  }

  if (!Number.isInteger(input.grade) || input.grade < 6 || input.grade > 9) {
    errors.grade = "Choose a grade from 6 to 9.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value: { name, grade: input.grade } };
}
