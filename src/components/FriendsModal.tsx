"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, UserPlus, Check, Trophy, Users, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useBet } from "@/context/BetContext";

const ACCENT = "#FF3C00";

interface Profile {
  id: string;
  username: string;
  balance: number;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "rejected";
  requester?: Profile;
  addressee?: Profile;
}

type Tab = "buscar" | "amigos" | "ranking";

export function FriendsModal({ onClose }: { onClose: () => void }) {
  const { userId, username, balance } = useBet();
  const [tab, setTab] = useState<Tab>("buscar");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [ranking, setRanking] = useState<Profile[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadFriends();
    loadPending();
    loadRanking();
  }, [userId]);

  // Realtime: receber novos convites
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("friendships-" + userId)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "netano_friendships",
        filter: `addressee_id=eq.${userId}`,
      }, () => { loadPending(); })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "netano_friendships",
      }, () => { loadFriends(); loadPending(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function loadFriends() {
    if (!userId) return;
    const { data } = await supabase
      .from("netano_friendships")
      .select("id, requester_id, addressee_id, status")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (!data) return;

    const ids = data.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id);
    setFriendIds(new Set(ids));

    if (ids.length === 0) { setFriends([]); return; }
    const { data: profiles } = await supabase
      .from("netano_profiles")
      .select("id, username, balance")
      .in("id", ids);
    setFriends(profiles || []);
  }

  async function loadPending() {
    if (!userId) return;
    // Convites recebidos (aguardando minha resposta)
    const { data: received } = await supabase
      .from("netano_friendships")
      .select("id, requester_id, addressee_id, status")
      .eq("addressee_id", userId)
      .eq("status", "pending");

    // Convites enviados por mim
    const { data: sent } = await supabase
      .from("netano_friendships")
      .select("requester_id, addressee_id, status")
      .eq("requester_id", userId)
      .eq("status", "pending");

    setSentIds(new Set((sent || []).map(s => s.addressee_id)));

    if (!received || received.length === 0) { setPending([]); return; }
    const ids = received.map(r => r.requester_id);
    const { data: profiles } = await supabase
      .from("netano_profiles")
      .select("id, username, balance")
      .in("id", ids);

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setPending(received.map(r => ({ ...r, requester: profileMap.get(r.requester_id) })));
  }

  async function loadRanking() {
    const { data } = await supabase
      .from("netano_profiles")
      .select("id, username, balance")
      .order("balance", { ascending: false })
      .limit(20);
    setRanking(data || []);
  }

  function handleSearch(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!val.trim()) { setResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("netano_profiles")
        .select("id, username, balance")
        .ilike("username", `%${val}%`)
        .neq("id", userId)
        .limit(10);
      setResults(data || []);
      setLoading(false);
    }, 350);
  }

  async function sendRequest(addresseeId: string) {
    if (!userId) return;
    await supabase.from("netano_friendships").insert({
      requester_id: userId,
      addressee_id: addresseeId,
      status: "pending",
    });
    setSentIds(prev => new Set([...prev, addresseeId]));
  }

  async function respond(friendshipId: string, accept: boolean) {
    await supabase
      .from("netano_friendships")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", friendshipId);
    await loadPending();
    if (accept) await loadFriends();
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "buscar", label: "Buscar", icon: <Search size={14} /> },
    { id: "amigos", label: "Amigos", icon: <Users size={14} /> },
    { id: "ranking", label: "Ranking", icon: <Trophy size={14} /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#111] rounded-t-2xl md:rounded-2xl w-full md:max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <span className="text-white font-semibold text-base">Amigos</span>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wide transition-colors relative"
              style={{ color: tab === t.id ? "white" : "rgba(255,255,255,0.35)" }}
            >
              {t.icon}{t.label}
              {t.id === "amigos" && pending.length > 0 && (
                <span className="absolute top-2 right-4 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                  style={{ background: ACCENT }}>{pending.length}</span>
              )}
              {tab === t.id && (
                <motion.div layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: ACCENT }} />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">

          {/* ── Buscar ── */}
          {tab === "buscar" && (
            <>
              <div className="flex items-center gap-2 bg-[#0d0d0d] rounded-lg px-3 py-2.5">
                <Search size={14} className="text-white/30 shrink-0" />
                <input
                  value={search}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Buscar por username..."
                  className="bg-transparent text-white text-sm placeholder-white/30 outline-none flex-1"
                  autoFocus
                />
              </div>

              {loading && (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 rounded-full border-2 border-[#FF3C00] border-t-transparent animate-spin" />
                </div>
              )}

              {results.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-[#0d0d0d] rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
                      style={{ background: ACCENT }}>
                      {p.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{p.username}</p>
                      <p className="text-white/30 text-xs">R$ {p.balance.toFixed(2)}</p>
                    </div>
                  </div>
                  {friendIds.has(p.id) ? (
                    <span className="text-xs text-white/30 font-medium">Amigo</span>
                  ) : sentIds.has(p.id) ? (
                    <span className="flex items-center gap-1 text-xs text-white/30 font-medium">
                      <Clock size={12} /> Enviado
                    </span>
                  ) : (
                    <button onClick={() => sendRequest(p.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all hover:brightness-110 active:scale-95"
                      style={{ background: ACCENT }}>
                      <UserPlus size={13} /> Adicionar
                    </button>
                  )}
                </div>
              ))}

              {search && !loading && results.length === 0 && (
                <p className="text-center text-white/30 text-sm py-6">Nenhum usuário encontrado</p>
              )}

              {!search && (
                <p className="text-center text-white/20 text-xs py-6">Digite um username para buscar</p>
              )}
            </>
          )}

          {/* ── Amigos ── */}
          {tab === "amigos" && (
            <>
              {/* Convites pendentes */}
              {pending.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wide">Convites recebidos</p>
                  {pending.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-[#0d0d0d] rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
                          style={{ background: "#333" }}>
                          {f.requester?.username?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <p className="text-white text-sm font-semibold">{f.requester?.username}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => respond(f.id, false)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all">
                          <X size={14} />
                        </button>
                        <button onClick={() => respond(f.id, true)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all hover:brightness-110"
                          style={{ background: ACCENT }}>
                          <Check size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista de amigos */}
              {friends.length > 0 && (
                <div className="flex flex-col gap-2">
                  {pending.length > 0 && <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mt-2">Seus amigos</p>}
                  {friends.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-[#0d0d0d] rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white"
                          style={{ background: "#2a2a2a" }}>
                          {f.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">{f.username}</p>
                          <p className="text-white/30 text-xs">R$ {f.balance.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-white/30">saldo</p>
                        <p className="text-sm font-bold" style={{ color: f.balance >= 1000 ? "#07E385" : ACCENT }}>
                          {f.balance >= 1000 ? "+" : ""}{((f.balance - 1000)).toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {friends.length === 0 && pending.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Users size={32} className="text-white/10" />
                  <p className="text-white/30 text-sm">Nenhum amigo ainda</p>
                  <p className="text-white/20 text-xs">Busque por username para adicionar</p>
                </div>
              )}
            </>
          )}

          {/* ── Ranking ── */}
          {tab === "ranking" && (
            <div className="flex flex-col gap-2">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-wide mb-1">Top jogadores — saldo atual</p>
              {ranking.map((p, i) => {
                const isMe = p.id === userId;
                const medals = ["🥇", "🥈", "🥉"];
                return (
                  <div key={p.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                    style={{ background: isMe ? "rgba(255,60,0,0.1)" : "#0d0d0d", border: isMe ? "1px solid rgba(255,60,0,0.3)" : "1px solid transparent" }}>
                    <span className="w-6 text-center text-sm font-bold" style={{ color: i < 3 ? "white" : "rgba(255,255,255,0.3)" }}>
                      {i < 3 ? medals[i] : `${i + 1}`}
                    </span>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ background: isMe ? ACCENT : "#2a2a2a" }}>
                      {p.username[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{p.username}{isMe && " (você)"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white font-bold text-sm">R$ {p.balance.toFixed(2)}</p>
                      <p className="text-xs" style={{ color: p.balance >= 1000 ? "#07E385" : ACCENT }}>
                        {p.balance >= 1000 ? "+" : ""}{(p.balance - 1000).toFixed(0)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
