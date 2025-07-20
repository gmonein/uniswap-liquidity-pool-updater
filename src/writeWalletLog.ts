import { promises as fs } from 'fs';
import { EOL } from 'os';

export async function writeWalletLog(
  path: string,
  date: string | Date,
  totalInHype: number,
  totalInUsdc: number
): Promise<void> {
  const dateStr = date instanceof Date ? date.toISOString() : date;

  const header = 'date,totalInHype,totalInUsdc';
  const line = `${dateStr},${totalInHype},${totalInUsdc}`;

  let needsHeader = false;
  try {
    await fs.access(path);
  } catch {
    needsHeader = true;
  }

  const data = (needsHeader ? header + EOL : '') + line + EOL;

  await fs.appendFile(path, data, 'utf8');
}
