import type { QueryRange } from "./types.ts";

export function exact(value: IDBValidKey): QueryRange {
  return { type: "exact", value };
}

export function lowerBound(value: IDBValidKey, open?: boolean): QueryRange {
  return { type: "lower", value, open };
}

export function upperBound(value: IDBValidKey, open?: boolean): QueryRange {
  return { type: "upper", value, open };
}

export function bound(
  lower: IDBValidKey,
  upper: IDBValidKey,
  lowerOpen?: boolean,
  upperOpen?: boolean,
): QueryRange {
  return { type: "bound", lower, upper, lowerOpen, upperOpen };
}

export function toIDBKeyRange(range: QueryRange): IDBKeyRange | undefined {
  switch (range.type) {
    case "exact":
      return IDBKeyRange.only(range.value);
    case "lower":
      return IDBKeyRange.lowerBound(range.value, range.open);
    case "upper":
      return IDBKeyRange.upperBound(range.value, range.open);
    case "bound":
      return IDBKeyRange.bound(
        range.lower,
        range.upper,
        range.lowerOpen,
        range.upperOpen,
      );
    case "all":
      return undefined;
  }
}
