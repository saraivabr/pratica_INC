-- Migration 028: Enrich cvcrm_unidades with Órulo pricing/rooms/parking data
-- Source: lib/empreendimentos-data.ts (Órulo, Jan/2026)
-- Only updates units that exist in both systems (match by nome + empreendimento_nome)

BEGIN;

-- ============================================================================
-- 1. STATION PARK (APARTAMENTOS + STUDIOS)
-- empreendimento_nome IN ('STATION PARK APARTAMENTOS', 'STATION PARK STUDIOS')
-- Prefix: SP
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 699547.98, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorm"}'::jsonb
WHERE nome = 'SP1602' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 357587.93, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1707' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 555594.99, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1201' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 649687.55, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorm"}'::jsonb
WHERE nome = 'SP902' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 681519.80, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorm"}'::jsonb
WHERE nome = 'SP1102' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 495281.04, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1804' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 357587.93, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1705' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 357587.93, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1607' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 357587.93, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1605' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 373120.83, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Garden 2 dorm"}'::jsonb
WHERE nome = 'SP407' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 695872.67, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorm"}'::jsonb
WHERE nome = 'SP1502' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 565556.28, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1501' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 495281.04, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1404' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 559639.08, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1301' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 553861.88, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1101' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 495281.04, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento 2 dorm"}'::jsonb
WHERE nome = 'SP1004' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 668806.13, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorm"}'::jsonb
WHERE nome = 'SP1002' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 575533.78, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Garden 2 dorm"}'::jsonb
WHERE nome = 'SP408' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 217410.16, dormitorios = 1, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":1,"vagas":0,"tipologia_orulo":"Studio"}'::jsonb
WHERE nome = 'SP215' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 324872.88, dormitorios = 1, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":1,"vagas":0,"tipologia_orulo":"Studio"}'::jsonb
WHERE nome = 'SP210' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 324872.88, dormitorios = 1, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":1,"vagas":0,"tipologia_orulo":"Studio"}'::jsonb
WHERE nome = 'SP310' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 269751.65, dormitorios = 1, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":1,"vagas":0,"tipologia_orulo":"Studio"}'::jsonb
WHERE nome = 'SP114' AND empreendimento_nome ILIKE 'STATION PARK%';

UPDATE cvcrm_unidades SET valor_venda = 269751.65, dormitorios = 1, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":1,"vagas":0,"tipologia_orulo":"Studio"}'::jsonb
WHERE nome = 'SP201' AND empreendimento_nome ILIKE 'STATION PARK%';

-- ============================================================================
-- 2. STATION GARDEN (RECEBÍVEIS - STATION GARDEN)
-- empreendimento_nome ILIKE '%STATION GARDEN%'
-- Prefix: SGJ
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 350962.12, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ302' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 350962.12, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ503' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 350829.69, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ505' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 345934.57, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ201' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 503556.32, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Garden 2 dorms"}'::jsonb
WHERE nome = 'SGJ210' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 504946.25, dormitorios = 3, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":0,"tipologia_orulo":"Apartamento 3 dorms"}'::jsonb
WHERE nome = 'SGJ1405' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 345934.57, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Garden 2 dorms"}'::jsonb
WHERE nome = 'SGJ204' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 315955.90, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ1601' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 315955.90, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ1609' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 321718.03, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ1701' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 439841.36, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ1703' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 454126.56, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ1704' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 637433.82, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorms"}'::jsonb
WHERE nome = 'SGJ1705' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 534542.23, dormitorios = 3, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":0,"tipologia_orulo":"Apartamento 3 dorms"}'::jsonb
WHERE nome = 'SGJ1706' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 646677.24, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorms"}'::jsonb
WHERE nome = 'SGJ1707' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 649678.32, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorms"}'::jsonb
WHERE nome = 'SGJ1708' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 321718.03, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento 2 dorms"}'::jsonb
WHERE nome = 'SGJ1709' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 637433.82, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"Apartamento 3 dorms"}'::jsonb
WHERE nome = 'SGJ1605' AND empreendimento_nome ILIKE '%STATION GARDEN%';

UPDATE cvcrm_unidades SET valor_venda = 350441.64, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Garden 2 dorms"}'::jsonb
WHERE nome = 'SGJ1401' AND empreendimento_nome ILIKE '%STATION GARDEN%';

-- ============================================================================
-- 3. MIRANTE DA VILA
-- empreendimento_nome ILIKE '%MIRANTE%VILA%'
-- Prefix: RMV
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 646799.80, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Garden"}'::jsonb
WHERE nome = 'RMV14' AND empreendimento_nome ILIKE '%MIRANTE%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 312186.60, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'RMV23' AND empreendimento_nome ILIKE '%MIRANTE%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 335432.80, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'RMV124' AND empreendimento_nome ILIKE '%MIRANTE%VILA%';

-- ============================================================================
-- 4. MOMENT METRO CONCEIÇÃO (MOMENT CONCEIÇÃO RESIDENCIAL + STUDIOS)
-- empreendimento_nome ILIKE '%MOMENT%CONCEI%'
-- Prefix: RC
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 498584.83, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Garden"}'::jsonb
WHERE nome = 'RC112' AND empreendimento_nome ILIKE '%MOMENT%CONCEI%';

-- ============================================================================
-- 5. ESSÊNCIA DA VILA
-- empreendimento_nome ILIKE '%ESS_NCIA%VILA%'
-- Prefix: EV
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 712628.13, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"3 quartos"}'::jsonb
WHERE nome = 'EV1101' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 725144.81, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"3 quartos"}'::jsonb
WHERE nome = 'EV2001' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 727580.56, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"3 quartos"}'::jsonb
WHERE nome = 'EV2101' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 401349.75, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"2 quartos"}'::jsonb
WHERE nome = 'EV2303' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 791968.24, dormitorios = 3, vagas = 2,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":2,"tipologia_orulo":"3 quartos"}'::jsonb
WHERE nome = 'EV2401' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 793041.36, dormitorios = 3, vagas = 2,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":2,"tipologia_orulo":"3 quartos"}'::jsonb
WHERE nome = 'EV2501' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 685728.59, dormitorios = 3, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":1,"tipologia_orulo":"3 quartos"}'::jsonb
WHERE nome = 'EV301' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 501034.41, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"2 quartos"}'::jsonb
WHERE nome = 'EV307' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 501034.41, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"2 quartos"}'::jsonb
WHERE nome = 'EV308' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

UPDATE cvcrm_unidades SET valor_venda = 501034.41, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"2 quartos"}'::jsonb
WHERE nome = 'EV407' AND empreendimento_nome ILIKE '%ESS_NCIA%VILA%';

-- ============================================================================
-- 6. AURA GUILHERMINA
-- empreendimento_nome ILIKE '%AURA%GUILHERMINA%'
-- Prefix: AU
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 375525.34, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU408' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 444890.99, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU501' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 495601.83, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1101' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 505679.03, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1401' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 505679.03, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1402' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 517414.19, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1801' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 517414.19, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1802' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 517414.19, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1901' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 517414.19, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU1902' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 522748.35, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU2001' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 522748.35, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU2002' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 522748.35, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU2101' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 522748.35, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'AU2102' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 925538.58, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Cobertura Horizontal"}'::jsonb
WHERE nome = 'AU2202' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

UPDATE cvcrm_unidades SET valor_venda = 926011.37, dormitorios = 2, vagas = 1,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":1,"tipologia_orulo":"Cobertura Horizontal"}'::jsonb
WHERE nome = 'AU2203' AND empreendimento_nome ILIKE '%AURA%GUILHERMINA%';

-- ============================================================================
-- 7. GIARDINO VERTICALE
-- empreendimento_nome ILIKE '%GIARDINO%VERTICALE%'
-- Prefix: GV
-- ============================================================================

UPDATE cvcrm_unidades SET valor_venda = 637548.60, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1202' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 1434959.13, dormitorios = 3, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":3,"vagas":0,"tipologia_orulo":"Cobertura Horizontal"}'::jsonb
WHERE nome = 'GV1402' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 561672.17, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1002' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 744537.22, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1304' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 765947.79, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1303' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 711579.92, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1204' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 768760.77, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1203' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 707014.76, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1104' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 747629.62, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1103' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 594924.35, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1302' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 668540.18, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV604' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 569508.27, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1102' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 702479.53, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1004' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 731105.23, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1003' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 674671.74, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV1001' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 697974.05, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV904' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 726412.07, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV903' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 539329.43, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV902' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

UPDATE cvcrm_unidades SET valor_venda = 705471.40, dormitorios = 2, vagas = 0,
  cvcrm_data = COALESCE(cvcrm_data, '{}'::jsonb) || '{"quartos":2,"vagas":0,"tipologia_orulo":"Apartamento"}'::jsonb
WHERE nome = 'GV803' AND empreendimento_nome ILIKE '%GIARDINO%VERTICALE%';

-- ============================================================================
-- 8. Update empreendimento descriptions from Órulo
-- ============================================================================

UPDATE cvcrm_empreendimentos SET descricao =
  'Uma combinacao de natureza e mobilidade juntos num empreendimento com lazer completo em frente ao parque Vila Ema e a 150m do metro Oratorio. Sao studios, apartamentos 1, 2, e 3 dormitorios, com vaga de garagem.'
WHERE nome ILIKE '%STATION PARK%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'O Residencial Station Garden vai te surpreender. Sao apartamentos de 2 e 3 dormitorios localizados em regiao privilegiada da Zona Leste de Sao Paulo. COLADO NO METRO!'
WHERE nome ILIKE '%STATION GARDEN%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'Proximo a Estacao Patriarca e toda a estrutura do bairro. Unidades de 02 dormitorios. Opcoes com Garden. Area de Lazer coberta e descoberta.'
WHERE nome ILIKE '%MIRANTE%VILA%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'O Moment Metro Conceicao esta localizado a 600 metros do Metro Conceicao, em um bairro tradicional de Sao Paulo com toda infraestrutura, proximo ao aeroporto de Congonhas, terminal rodoviario do Jabaquara.'
WHERE nome ILIKE '%MOMENT%CONCEI%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'Um empreendimento unico, onde cada detalhe foi concebido para ser distinto. Localizado no melhor da Zona Leste, a poucos passos da estacao de Metro Vila Matilde, em meio aos empreendimentos mais importantes ao longo da cidade.'
WHERE nome ILIKE '%ESS_NCIA%VILA%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'Um empreendimento unico concebido para ser distinto com uma vista privilegiada, o melhor da zona leste. Em um dos destinos mais desejados da zona leste a poucos passos da estacao de metro.'
WHERE nome ILIKE '%AURA%GUILHERMINA%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'Um empreendimento concebido para ser uma semente vertical no melhor local do bairro! Ao chegar no seu retiro voce se conecta com a natureza resgatando sua essencia. Inspirado nos pequenos resorts luxuosos.'
WHERE nome ILIKE '%GIARDINO%VERTICALE%' AND (descricao IS NULL OR descricao = '');

UPDATE cvcrm_empreendimentos SET descricao =
  'Um empreendimento completo com toda seguranca, conforto e lazer que voce merece! Apartamentos de 3 dormitorios com 139m2 no Tatuape.'
WHERE nome ILIKE '%ALTA FLORESTA%' AND (descricao IS NULL OR descricao = '');

COMMIT;
