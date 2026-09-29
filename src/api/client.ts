export const getBoard = async (): Promise<any> => {
  const response = await fetch('/api/bounty-board');
  if (!response.ok) {
    const errorData = await response.json();
    throw { code: response.status, ...errorData };
  }
  return response.json();
};

export const acceptConsent = async (): Promise<void> => {
  const response = await fetch('/api/bounty-consent', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Failed to accept consent');
  }
};