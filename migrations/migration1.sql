ALTER TABLE app ADD COLUMN key varchar(50) DEFAULT md5(random()::text);
