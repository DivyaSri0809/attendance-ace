const CATEGORY_ORDER: Record<string, number> = {
  RSI: 1,
  ARSI: 2,
  HC: 3,
  PC: 4,
};

export function sortEmployees<T extends { category: string; employee_id: string }>(
  employees: T[]
): T[] {
  return [...employees].sort((a, b) => {
    const orderA = CATEGORY_ORDER[a.category] || 99;
    const orderB = CATEGORY_ORDER[b.category] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.employee_id.localeCompare(b.employee_id, undefined, { numeric: true });
  });
}

export const CATEGORIES = ["RSI", "ARSI", "HC", "PC"] as const;

export const SUB_CATEGORIES: Record<string, string[]> = {
  PC: ["PSO", "MT", "Staff", "STF", "General Duty"],
};
