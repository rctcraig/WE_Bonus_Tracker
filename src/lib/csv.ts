type CsvValue = string | number | boolean | null | undefined;

function escapeCsvValue(value: CsvValue) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]) {
  return (
    [headers, ...rows]
      .map((row) => row.map(escapeCsvValue).join(","))
      .join("\r\n") + "\r\n"
  );
}
