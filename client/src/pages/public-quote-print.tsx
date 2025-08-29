import { useEffect } from 'react';

interface PublicQuotePrintProps {
  id: string;
}

export default function PublicQuotePrint({ id }: PublicQuotePrintProps) {
  useEffect(() => {
    // Redirect to the server endpoint for print view
    window.location.href = `/api/public-quotes/${id}/print`;
  }, [id]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-lg">Przekierowywanie do podglądu wydruku...</p>
      </div>
    </div>
  );
}