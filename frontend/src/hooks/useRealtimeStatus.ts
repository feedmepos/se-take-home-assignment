import { useState, useEffect } from "react";
import { apiService, SystemStatus } from "../services/api";

export function useRealtimeStatus(pollInterval = 2000) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Current implementation: Polling
    // Future implementation: WebSocket
    /*
    const socket = new WebSocket("ws://localhost:8080/ws");
    socket.onmessage = (event) => {
      setStatus(JSON.parse(event.data));
    };
    return () => socket.close();
    */

    const fetchStatus = async () => {
      try {
        const response = await apiService.getSystemStatus();
        if (response.status === 200) {
          setStatus(response.data);
        }
      } catch (err) {
        setError("Failed to fetch system status");
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return { status, loading, error };
}
