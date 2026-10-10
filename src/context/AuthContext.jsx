
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { AuthContext } from "./auth-context.js";
import { supabase } from "../lib/supabase";

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  // Load the user's identity from Supabase Auth,
  // then request their application profile.
  const loadProfile = useCallback(async (expectedUserId) => {
    if (!supabase) {
      throw new Error("Supabase is not configured.");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user || user.id !== expectedUserId) {
      throw new Error("Your session could not be verified.");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        "No application profile was found for this account."
      );
    }

    return data;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setProfileError("Supabase is not configured.");
      return;
    }

    let active = true;
    let revision = 0;

    // INITIAL_SESSION, SIGNED_IN and SIGNED_OUT
    // are handled here.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === "TOKEN_REFRESHED") {
          setSession(nextSession);
          return;
        }

        const currentRevision = ++revision;

        setSession(nextSession);
        setProfile(null);
        setProfileError("");

        if (!nextSession?.user) {
          setLoading(false);
          return;
        }

        setLoading(true);

        // Run asynchronous Supabase requests after
        // the synchronous auth callback finishes.
        setTimeout(async () => {
          try {
            const data = await loadProfile(
              nextSession.user.id
            );

            if (active && currentRevision === revision) {
              setProfile(data);
            }
          } catch (error) {
            if (active && currentRevision === revision) {
              setProfileError(error.message);
            }
          } finally {
            if (active && currentRevision === revision) {
              setLoading(false);
            }
          }
        }, 0);
      }
    );

    return () => {
      active = false;
      revision++;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Useful after an administrator approves an account.
  const refreshProfile = async () => {
    if (!session?.user) return;

    setLoading(true);
    setProfileError("");

    try {
      const data = await loadProfile(session.user.id);
      setProfile(data);
      return data;
    } catch (error) {
      setProfile(null);
      setProfileError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        profileError,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
