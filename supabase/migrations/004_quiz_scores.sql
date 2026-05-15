-- Ranking global do Quiz Medieval — todos os usuários
create table if not exists quiz_scores (
  id          bigserial primary key,
  user_id     uuid references netano_profiles(id) on delete cascade,
  username    text not null,
  score       integer not null,           -- totalWon - totalLost (em reais, arredondado)
  correct     integer not null,           -- numero de acertos (0-8)
  total       integer not null default 8, -- total de perguntas naquela partida
  avatar      jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists quiz_scores_score_desc on quiz_scores(score desc, created_at desc);
create index if not exists quiz_scores_user on quiz_scores(user_id);

alter table quiz_scores enable row level security;

-- Qualquer pessoa autenticada pode ler todos os scores (ranking global)
create policy "anyone can read quiz scores"
  on quiz_scores for select
  using (true);

-- Só o próprio usuário pode inserir seu score
create policy "users insert own quiz scores"
  on quiz_scores for insert
  with check (auth.uid() = user_id);
