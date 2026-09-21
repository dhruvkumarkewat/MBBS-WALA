import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * UpiPaymentPage (Deprecated)
 * Replaced by AU Bank automated payment gateway checkout on /dashboard/subscription
 */
export function UpiPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan) {
      navigate(`/dashboard/subscription?plan=${encodeURIComponent(plan)}`, { replace: true });
    } else {
      navigate('/dashboard/subscription', { replace: true });
    }
  }, [navigate, searchParams]);

  return null;
}

export default UpiPaymentPage;
