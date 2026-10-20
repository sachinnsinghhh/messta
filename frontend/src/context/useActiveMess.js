import { API_BASE_URL } from "../config/api";
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "messta_activeMessId";

export function useActiveMess() {
  const [allMesses, setAllMesses] = useState([]);
  const [activeMessId, setActiveMessIdState] = useState(() => {
    return (
      sessionStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(STORAGE_KEY) ||
      ""
    );
  });
  const [loadingMesses, setLoadingMesses] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshMesses = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadMesses() {
      try {
        setLoadingMesses(true);
        const res = await fetch(`${API_BASE_URL}/api/mess?showAll=true`);
        if (!res.ok) throw new Error("Failed to load outlets");
        const result = await res.json();
        const list = result.data || [];

        if (!ignore) {
          setAllMesses(list);

          const storedId =
            sessionStorage.getItem(STORAGE_KEY) ||
            localStorage.getItem(STORAGE_KEY) ||
            "";

          const exists = list.some((m) => (m._id || m.id) === storedId);

          if (exists) {
            setActiveMessIdState(storedId);
          } else if (list.length > 0) {
            const fallbackId = list[0]._id || list[0].id;
            setActiveMessIdState(fallbackId);
            sessionStorage.setItem(STORAGE_KEY, fallbackId);
            localStorage.setItem(STORAGE_KEY, fallbackId);
          }
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoadingMesses(false);
      }
    }

    loadMesses();

    const handleMessChanged = (e) => {
      if (e.detail?.id && e.detail.id !== activeMessId) {
        setActiveMessIdState(e.detail.id);
      }
    };

    window.addEventListener("messta_mess_changed", handleMessChanged);
    return () => {
      ignore = true;
      window.removeEventListener("messta_mess_changed", handleMessChanged);
    };
  }, [refreshKey, activeMessId]);

  const switchMess = useCallback((id) => {
    if (!id) return;
    setActiveMessIdState(id);
    sessionStorage.setItem(STORAGE_KEY, id);
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent("messta_mess_changed", { detail: { id } }));
  }, []);

  const deleteMess = useCallback(
    async (idToDelete) => {
      const targetId = idToDelete || activeMessId;
      if (!targetId) throw new Error("No mess selected to delete");

      const res = await fetch(`${API_BASE_URL}/api/mess/${targetId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete mess outlet");
      }

      // Filter out the deleted mess locally
      const updatedList = allMesses.filter((m) => (m._id || m.id) !== targetId);
      setAllMesses(updatedList);

      // If we deleted the currently active mess, switch to another or clear
      if (activeMessId === targetId) {
        const nextMess = updatedList[0];
        const nextId = nextMess ? nextMess._id || nextMess.id : "";
        setActiveMessIdState(nextId);
        if (nextId) {
          sessionStorage.setItem(STORAGE_KEY, nextId);
          localStorage.setItem(STORAGE_KEY, nextId);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_KEY);
        }
        window.dispatchEvent(
          new CustomEvent("messta_mess_changed", { detail: { id: nextId } })
        );
      }

      return data;
    },
    [activeMessId, allMesses]
  );

  const activeMess = allMesses.find((m) => (m._id || m.id) === activeMessId) || null;

  return {
    allMesses,
    activeMessId,
    activeMess,
    loadingMesses,
    switchMess,
    deleteMess,
    refreshMesses,
    error,
  };
}
