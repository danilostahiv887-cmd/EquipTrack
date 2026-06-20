export const money = new Intl.NumberFormat("uk-UA", { style: "currency", currency: "UAH", maximumFractionDigits: 0 });
export const date = new Intl.DateTimeFormat("uk-UA", { dateStyle: "medium" });
export const recordId = (value: unknown) => String(value);
