'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DebugClientPage() {
    const { data: session, status } = useSession();
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [error, setError] = useState<any>(null);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setApiResponse({
                status: res.status,
                data: data
            });
        } catch (e: any) {
            setError(e.toString());
        }
    };

    return (
        <div className="p-8 text-white bg-slate-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Debug Client Session</h1>

            <div className="mb-8 p-4 bg-slate-800 rounded">
                <h2 className="text-xl mb-2">Session Status: {status}</h2>
                <pre className="bg-black p-4 rounded overflow-auto">
                    {JSON.stringify(session, null, 2)}
                </pre>
            </div>

            <div className="mb-8">
                <Button onClick={fetchProjects}>Fetch /api/projects</Button>
            </div>

            {error && (
                <div className="p-4 bg-red-900/50 border border-red-500 rounded mb-4">
                    <h3 className="font-bold">Error:</h3>
                    <pre>{error}</pre>
                </div>
            )}

            {apiResponse && (
                <div className="p-4 bg-slate-800 rounded">
                    <h2 className="text-xl mb-2">API Response (Status: {apiResponse.status})</h2>
                    <pre className="bg-black p-4 rounded overflow-auto">
                        {JSON.stringify(apiResponse.data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
