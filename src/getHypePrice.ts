export async function getHypePrice() {
  const res = await fetch('https://api.hyperliquid.xyz/info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'allMids',
      dex: '',
    }),
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`);
  }

  const allMids: Record<string, string> = await res.json();
  const hypeMid = allMids['HYPE'];
  if (!hypeMid) {
    console.error('HYPE not found in response:', allMids);
    return;
  }

  return parseFloat(hypeMid);
}
