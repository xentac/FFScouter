import { useState, useEffect } from 'react';
import { getBoard, acceptConsent as apiAcceptConsent } from '@/api/client';

interface BountyBoardResponse {
  targets: Array<{
    id: string;
    name: string;
    faction?: string;
    tiers: Array<{ price: number; quantity: number }>;
  }>;
  policyVersion: string;
}

interface BountyBoardError {
  code: number;
  message: string;
}

export const useBountyBoard = () => {
  const [data, setData] = useState<BountyBoardResponse | null>(null);
  const [error, setError] = useState<BountyBoardError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const response = await getBoard();
        setData(response);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBoard();
  }, []);

  const isConsentRequired = error?.code === 403 && error.message.includes('consent');

  return { data, error, isLoading, isConsentRequired };
};

export const acceptConsent = async (): Promise<void> => {
  await apiAcceptConsent();
};