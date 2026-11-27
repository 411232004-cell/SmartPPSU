"use client";

import {
  createContext, useContext, useEffect, useState, ReactNode,
} from "react";
import {
  User, onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export type Peran = "petugas_ppsu" | "kasi_ekbang";

export interface Profil {
  uid: string;
  email: string;
  nama: string;
  peran: Peran;
  zona_id?: string;
  regu?: string;
  aktif?: boolean;
}

interface AuthCtx {
  user: User | null;
  profil: Profil | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Peran>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await getDoc(doc(db, "users", u.uid));
        const d = snap.data() || {};
        setProfil({
          uid: u.uid,
          email: u.email || "",
          nama: d.nama || u.email?.split("@")[0] || "Pengguna",
          peran: (d.peran as Peran) || "petugas_ppsu",
          zona_id: d.zona_id,
          regu: d.regu,
          aktif: d.aktif !== false,
        });
      } else {
        setProfil(null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string): Promise<Peran> => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, "users", cred.user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      throw new Error("Akun belum terdaftar di data petugas. Hubungi Kasi Ekbang.");
    }
    const d = snap.data()!;
    if (d.aktif === false) {
      await signOut(auth);
      throw new Error("Akun dinonaktifkan. Hubungi Kasi Ekbang.");
    }
    return (d.peran as Peran) || "petugas_ppsu";
  };

  const logout = () => signOut(auth);

  return (
    <Ctx.Provider value={{ user, profil, loading, login, logout }}>
      {children}
    </Ctx.Provider>
  );
}
