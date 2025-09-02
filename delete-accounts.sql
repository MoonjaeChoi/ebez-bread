-- 비표준 계정코드 삭제 SQL
-- 먼저 삭제할 계정코드들 확인
SELECT code, name, type FROM account_codes WHERE code IN ('1000', '1100', '6000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900');

-- 거래 내역 참조 확인 (외래키 제약 때문에 삭제가 안될 수 있음)
SELECT t.id, t.description, t.amount, 
       da.code as debit_code, da.name as debit_name,
       ca.code as credit_code, ca.name as credit_name
FROM transactions t
LEFT JOIN account_codes da ON t.debit_account_id = da.id 
LEFT JOIN account_codes ca ON t.credit_account_id = ca.id
WHERE da.code IN ('1000', '1100', '6000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900')
   OR ca.code IN ('1000', '1100', '6000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900');

-- 참조하는 거래가 없다면 안전하게 삭제
DELETE FROM account_codes WHERE code IN ('1000', '1100', '6000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900');

-- 삭제 후 확인
SELECT COUNT(*) as remaining_total FROM account_codes;
SELECT code, name FROM account_codes WHERE code IN ('1000', '1100', '6000', '6100', '6200', '6300', '6400', '6500', '6600', '6700', '6800', '6900');