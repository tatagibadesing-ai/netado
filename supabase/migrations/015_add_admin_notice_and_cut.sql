-- 1. Adiciona coluna admin_notice para enviar mensagens do administrador ao usuário
ALTER TABLE public.netano_profiles 
ADD COLUMN IF NOT EXISTS admin_notice text DEFAULT null;

-- 2. Define o saldo de todos em 1000.00 e cria o aviso
UPDATE public.netano_profiles 
SET balance = 1000.00,
    admin_notice = 'Seu saldo foi editado pelo administrador, pois foi corrigido bugs.'
WHERE balance <> 1000.00;
