import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Cliente server-side. Usa a service role se estiver configurada (ideal, pois
// ignora RLS e não fica exposta ao navegador); senão cai na anon key.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Só estas colunas voltam para o cliente — full_name e signup_ip NUNCA saem do servidor.
const PUBLIC_COLS = "id, username, balance, wc_joined, wc_balance";

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return (req.headers.get("x-real-ip") || "").trim();
}

// Em localhost/dev o IP não é confiável (sempre ::1), então a regra de "1 conta
// por IP" é ignorada aí — vale só em produção (atrás do proxy, com x-forwarded-for).
function isLocalIp(ip: string): boolean {
  return !ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.");
}

export async function POST(req: Request) {
  let body: { username?: string; fullName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const username = (body.username || "").trim().toLowerCase();
  const fullName = (body.fullName || "").trim();
  if (!username) {
    return NextResponse.json({ error: "Informe um nome de usuário." }, { status: 400 });
  }

  const ip = getClientIp(req);

  // Conta já existe → login. Em produção trava por IP: cada IP fica vinculado a
  // UMA conta, então quem já acessou uma conta por aquele IP não consegue entrar
  // em outras contas pelo mesmo IP.
  const { data: existing, error: exErr } = await supabaseAdmin
    .from("netano_profiles")
    .select("id, username, balance, wc_joined, wc_balance, signup_ip, full_name")
    .eq("username", username)
    .maybeSingle();
  if (exErr) {
    return NextResponse.json({ error: "Erro ao entrar. Tente novamente." }, { status: 500 });
  }
  if (existing) {
    // Se a conta já existe mas o nome completo está nulo/em branco (usuários antigos),
    // exige que ele informe o nome completo para atualizar o cadastro.
    if (!existing.full_name) {
      if (fullName.length < 3 || !fullName.includes(" ")) {
        return NextResponse.json(
          { error: "Informe seu nome completo (nome e sobrenome) para atualizar seu cadastro." },
          { status: 400 }
        );
      }

      const { error: updNameErr } = await supabaseAdmin
        .from("netano_profiles")
        .update({ full_name: fullName })
        .eq("id", existing.id);
      if (updNameErr) {
        return NextResponse.json({ error: "Erro ao atualizar cadastro. Tente novamente." }, { status: 500 });
      }
    }

    if (!isLocalIp(ip)) {
      // Outro perfil já vinculado/acessou este IP? Bloqueia o acesso a esta conta.
      const { data: ipOwner } = await supabaseAdmin
        .from("netano_profile_ips")
        .select("profile_id")
        .eq("ip", ip)
        .neq("profile_id", existing.id)
        .limit(1)
        .maybeSingle();
      if (ipOwner) {
        return NextResponse.json(
          { error: "Esta rede/dispositivo já está vinculada a outra conta." },
          { status: 403 }
        );
      }
      
      // Associa/Atualiza o IP atual com esta conta
      await supabaseAdmin
        .from("netano_profile_ips")
        .upsert(
          { profile_id: existing.id, ip: ip, last_accessed_at: new Date().toISOString() },
          { onConflict: "profile_id,ip" }
        );

      // Conta antiga sem IP de cadastro vinculado → vincula a este agora (só se ainda nulo).
      if (!existing.signup_ip) {
        await supabaseAdmin
          .from("netano_profiles")
          .update({ signup_ip: ip })
          .eq("id", existing.id)
          .is("signup_ip", null);
      }
    }
    return NextResponse.json({
      profile: {
        id: existing.id,
        username: existing.username,
        balance: existing.balance,
        wc_joined: existing.wc_joined,
        wc_balance: existing.wc_balance,
      },
    });
  }

  // Conta nova → exige nome completo (nome + sobrenome).
  if (fullName.length < 3 || !fullName.includes(" ")) {
    return NextResponse.json(
      { error: "Para criar a conta, informe seu nome completo (nome e sobrenome)." },
      { status: 400 }
    );
  }

  // 1 conta por IP (somente em produção).
  if (!isLocalIp(ip)) {
    const { data: ipOwner } = await supabaseAdmin
      .from("netano_profile_ips")
      .select("profile_id")
      .eq("ip", ip)
      .limit(1)
      .maybeSingle();
    if (ipOwner) {
      return NextResponse.json(
        { error: "Já existe uma conta vinculada/criada nesta rede/dispositivo." },
        { status: 403 }
      );
    }
  }

  const { data: created, error: insErr } = await supabaseAdmin
    .from("netano_profiles")
    .insert({
      username,
      balance: 1000,
      full_name: fullName,
      signup_ip: isLocalIp(ip) ? null : ip,
    })
    .select(PUBLIC_COLS)
    .single();
  if (insErr) {
    // Provável corrida na unicidade do username.
    return NextResponse.json(
      { error: "Não foi possível criar a conta. Tente outro nome de usuário." },
      { status: 400 }
    );
  }

  // Associa o IP atual com a conta recém-criada
  if (!isLocalIp(ip)) {
    await supabaseAdmin
      .from("netano_profile_ips")
      .insert({
        profile_id: created.id,
        ip: ip
      });
  }

  return NextResponse.json({ profile: created });
}
